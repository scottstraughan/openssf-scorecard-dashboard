import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AccountModel } from '../../models/account.model';
import { ScorecardModel } from '../../models/scorecard.model';
import { RepositoryModel } from '../../models/repository.model';
import { ScorecardCheck } from '../../models/scorecard-check.model';
import { MarkdownService } from 'ngx-markdown';
import { ScorecardCheckDetails } from '../../models/scorecard-check-details.model';
import { ResultPriority } from '../../enums/scorecard';
import { CheckNotFoundError, UnableToParseCheckDetailsSegment } from '../../errors/scorecard';
import { Service } from '../../enums/service';
import { CacheService } from '../storage/cache.service';
import { LoggingService } from '../logging.service';

@Injectable({
  providedIn: 'root'
})
export class ScorecardService {
  /**
   * Cache table name.
   */
  private static readonly CACHE_TABLE_NAME = 'scorecards';

  /**
   * Cache timeout in days.
   */
  private static readonly CACHE_TIMEOUT = 1;

  /**
   * This URL is linked to the OpenSSF GitHub that contains information on scorecard checks.
   */
  private static readonly CHECK_DETAILS_URL = 'https://raw.githubusercontent.com/ossf/scorecard/main/docs/checks.md'

  /**
   * Constructor
   */
  constructor(
    private httpClient: HttpClient,
    private markdownService: MarkdownService,
    private cacheService: CacheService,
    private loggingService: LoggingService
  ) { }

  /**
   * Get a single scorecard for a provided repository.
   */
  getScorecard(
    account: AccountModel,
    repository: RepositoryModel,
    forceReload: boolean = false
  ): Observable<ScorecardModel | undefined> {
    // Unless force reload is set, we will skip fetching scorecards for repositories that are known to not having one
    if (repository.hasScorecard == false && !forceReload) {
      this.loggingService.warn(`Skipped fetch of scorecard for repository ${repository.name}.`)
      return of(undefined);
    }

    return this.cacheService.getByKey<ScorecardModel | undefined>(ScorecardService.CACHE_TABLE_NAME, repository.url)
      .pipe(
        // Check if we have a cached item before requesting
        switchMap(cached =>
          cached && !forceReload
            ? of(cached.value)
            : this.fetchScorecard(account, repository)
        ),

        // Set the scorecard
        tap(scorecard =>
          repository.scorecard = scorecard),

        // Save the scorecard to the cache
        switchMap(scorecard =>
          this.cacheService.add<ScorecardModel | undefined>(
            ScorecardService.CACHE_TABLE_NAME, scorecard, repository.url, ScorecardService.CACHE_TIMEOUT)
        ),

        // Return the scorecard
        switchMap(scorecard =>
          of(scorecard))
      );
  }

  /**
   * Delete from cache.
   */
  deleteCached(
    repository: RepositoryModel
  ): Observable<void> {
    return this.cacheService.deleteItem(ScorecardService.CACHE_TABLE_NAME, repository.url);
  }

  /**
   * Fetch information about the scorecard check from the OpenSSF GitHub markdown file.
   */
  getCheckDetails(
    scorecardCheck: ScorecardCheck
  ): Observable<ScorecardCheckDetails> {
    return this.httpClient.get(ScorecardService.CHECK_DETAILS_URL, { responseType: 'text' })
      .pipe(
        // Parse the markdown file from GitHub
        map(result =>
          this.markdownService.parse(result).toString()),

        // Extract the relevant segment by searching for the specific H2 with id
        map(result => {
          const regex = /(<h2.*?>.*?<\/h2>)/gim;
          const target = `<h2 id="${scorecardCheck.documentation.anchor}">`;
          const segments = result.split(regex);

          for (const [index, value] of segments.entries()) {
            if (value.includes(target)) {
              return `<h2>${scorecardCheck.name}</h2>` + segments[index + 1];
            }
          }

          throw new UnableToParseCheckDetailsSegment('Unable to locate specific H2 in markdown.');
        }),

        // Convert the result into a wrapped format
        map(result =>
          <ScorecardCheckDetails> {
            details: result,
            check: scorecardCheck
        })
      )
  }

  /**
   * Get a scorecard check by its name.
   */
  getCheckByName(
    checkName: string,
    scorecard: ScorecardModel
  ): ScorecardCheck {
    checkName = checkName.toLowerCase();

    for (const check of scorecard.checks) {
      if (check.name.toLowerCase() == checkName)
        return check;
    }

    throw new CheckNotFoundError();
  }

  /**
   * Get the priority color of a result.
   */
  getPriorityColor(
    resultPriority: ResultPriority
  ): string {
    switch (resultPriority) {
      case ResultPriority.CRITICAL:
        return '#960003';
      case ResultPriority.HIGH:
        return '#DF2A19';
      case ResultPriority.MEDIUM:
        return '#F7860F';
      case ResultPriority.LOW:
        return '#F4BD0C';
    }
  }

  /**
   * Calculate the average score for all the provided scorecards.
   */
  calculateAverageScore(
    scorecards: (ScorecardModel | undefined)[]
  ) {
    let totalScore = 0;
    let scoreCount = 0;

    if (scorecards.length == 0) {
      return 0;
    }

    for (const scorecard of scorecards) {
      let score = 0;

      if (scorecard && scorecard.score)
        score = scorecard.score;

      totalScore += score;
      scoreCount += 1;
    }

    if (scoreCount == 0)
      return 0;

    return Number((totalScore / scoreCount).toFixed(1));
  }

  /**
   * Fetch a scorecard from the OpenSSF API.
   * @private
   */
  private fetchScorecard(
    account: AccountModel,
    repository: RepositoryModel,
  ): Observable<ScorecardModel | undefined> {
    let serviceProviderUrl = 'github.com';

    if (account.service == Service.GITLAB)
      serviceProviderUrl = 'gitlab.com'

    const url = `https://api.securityscorecards.dev/projects/${serviceProviderUrl}/${account.tag}/${repository.name}`;

    return this.httpClient.get(url, { responseType: 'json' })
      .pipe(
        // Remap the HTTP request into the correct model
        map((scorecardResult: any) => {
          return <ScorecardModel> {
            score: scorecardResult.score,
            checks: scorecardResult.checks.map((check: any) => {
              check.priority = ScorecardService.getPriority(check.name);
              check.documentation.anchor = check.documentation.url.split('#')[1]
              return check;
            }),
            url: `https://scorecard.dev/viewer/?uri=${scorecardResult['repo']['name']}`,
            dateGenerated: new Date(scorecardResult['date'])
          }
        }),

        // Sort the checks
        map(scorecard => {
          scorecard.checks.sort((a: ScorecardCheck, b: ScorecardCheck) =>
            ScorecardService.getPriorityWeight(b.priority) - ScorecardService.getPriorityWeight(a.priority));

          return scorecard
        }),

        // Return undefined if the scorecard was not found
        catchError(() =>
          of(undefined))
      );
  }

  /**
   * Get the weight of a priority.
   * @private
   */
  private static getPriorityWeight(
    priority: ResultPriority
  ): number {
    switch (priority) {
      case ResultPriority.CRITICAL:
        return 4
      case ResultPriority.HIGH:
        return 3
      case ResultPriority.MEDIUM:
        return 2
      case ResultPriority.LOW:
        return 1
    }
  }

  /**
   * Determine the priority of the specific check. Unfortunately, the API does not return it, so we need to check it
   * manually.
   * @private
   */
  private static getPriority(
    name: string
  ): ResultPriority {
    name = name.toLowerCase();

    if (name == 'binary-artifacts') {
      return ResultPriority.HIGH;
    } else if (name == 'branch-protection') {
      return ResultPriority.HIGH;
    } else if (name == 'ci-tests') {
      return ResultPriority.LOW;
    } else if (name == 'cii-best-practices') {
      return ResultPriority.LOW;
    } else if (name == 'code-review') {
      return ResultPriority.HIGH;
    } else if (name == 'contributors') {
      return ResultPriority.LOW;
    } else if (name == 'dangerous-workflow') {
      return ResultPriority.CRITICAL;
    } else if (name == 'dependency-update-tool') {
      return ResultPriority.HIGH;
    } else if (name == 'fuzzing') {
      return ResultPriority.MEDIUM;
    } else if (name == 'license') {
      return ResultPriority.LOW;
    } else if (name == 'maintained') {
      return ResultPriority.HIGH;
    } else if (name == 'packaging') {
      return ResultPriority.MEDIUM;
    } else if (name == 'pinned-dependencies') {
      return ResultPriority.MEDIUM;
    } else if (name == 'sast') {
      return ResultPriority.MEDIUM;
    } else if (name == 'security-oolicy') {
      return ResultPriority.MEDIUM;
    } else if (name == 'signed-releases') {
      return ResultPriority.HIGH;
    } else if (name == 'token-permissions') {
      return ResultPriority.HIGH;
    } else if (name == 'vulnerabilities') {
      return ResultPriority.HIGH;
    }

    return ResultPriority.MEDIUM;
  }
}