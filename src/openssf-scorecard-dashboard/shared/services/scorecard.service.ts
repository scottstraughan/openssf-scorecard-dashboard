import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AccountModel } from '../models/account.model';
import { ScorecardModel } from '../models/scorecard.model';
import { RepositoryModel } from '../models/repository.model';
import { ScorecardCheck } from '../models/scorecard-check.model';
import { MarkdownService } from 'ngx-markdown';
import { ScorecardCheckDetails } from '../models/scorecard-check-details.model';
import { ResultPriority } from '../enums/scorecard';
import { CheckNotFoundError, ScorecardNotFoundError, UnableToParseCheckDetailsSegment } from '../errors/scorecard';
import { TransientStorage } from './transient-storage.service';
import { Service } from '../enums/service';

@Injectable({
  providedIn: 'root'
})
export class ScorecardService {
  /**
   * This URL is linked to the OpenSSF GitHub that contains information on scorecard checks.
   */
  static readonly CHECK_DETAILS_URL = 'https://raw.githubusercontent.com/ossf/scorecard/49c0eed3a423f00c872b5c3c9f1bbca9e8aae799/docs/checks.md'

  /**
   * Timeout for the storage cache.
   */
  static readonly STORAGE_TIMEOUT_IN_DAYS = 7;

  /**
   * Constructor
   * @param httpClient
   * @param markdownService
   * @param transientStorage
   */
  constructor(
    private httpClient: HttpClient,
    private markdownService: MarkdownService,
    private transientStorage: TransientStorage,
  ) { }

  /**
   * Get a single scorecard for a provided repository.
   * @param account
   * @param repository
   * @param forceReload
   */
  getScorecard(
    account: AccountModel,
    repository: RepositoryModel,
    forceReload: boolean = false
  ): Observable<ScorecardModel | undefined> {
    return this.fetchScorecard(account, repository, forceReload)
      .pipe(
        tap(scorecard => repository.scorecard = scorecard)
      );
  }

  /**
   * Fetch information about the scorecard check from the OpenSSF GitHub markdown file.
   * @param scorecardCheck
   */
  getCheckDetails(
    scorecardCheck: ScorecardCheck
  ): Observable<ScorecardCheckDetails> {
    return this.httpClient.get(ScorecardService.CHECK_DETAILS_URL, { responseType: 'text' })
      .pipe(
        // Parse the markdown file from GitHub
        map(result => this.markdownService.parse(result).toString()),
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
        // Convert the result into a wrapped foarmt
        map(result => <ScorecardCheckDetails> {
          details: result,
          check: scorecardCheck
        })
      )
  }

  /**
   * Get a scorecard check by its name.
   * @param checkName
   * @param scorecard
   * @throws CheckNotFoundError
   */
  getCheckByName(
    checkName: string,
    scorecard: ScorecardModel
  ): ScorecardCheck {
    checkName = checkName.toLowerCase();

    for (const check of scorecard.checks) {
      if (check.name.toLowerCase() == checkName) {
        return check;
      }
    }

    throw new CheckNotFoundError();
  }

  /**
   * Get the priority color of a result.
   * @param resultPriority
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
   * Fetch a scorecard from the OpenSSF API.
   * @param account
   * @param repository
   * @param forceReload
   * @protected
   */
  private fetchScorecard(
    account: AccountModel,
    repository: RepositoryModel,
    forceReload: boolean = false
  ): Observable<ScorecardModel | undefined> {
    let serviceProviderUrl = 'github.com';

    if (account.service == Service.GITLAB) {
      serviceProviderUrl = 'gitlab.com'
    }

    const url = `https://api.securityscorecards.dev/projects/${serviceProviderUrl}/${account.tag}/${repository.name}`;
    const storageKey = `${account.service}-${account.tag}-${repository.name}`.toLowerCase();

    if (forceReload) {
      this.transientStorage.remove(storageKey);
    }

    // Verify any existing storage/cache of the scorecard and return if it valid
    if (this.transientStorage.has(storageKey)) {
      const cached = this.transientStorage.get<ScorecardModel | undefined>(storageKey);
      return cached ? of(cached) : throwError(() => new ScorecardNotFoundError());
    }

    return this.httpClient.get(url, { responseType: 'json' })
      .pipe(
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
          scorecard.checks.sort((a: ScorecardCheck, b: ScorecardCheck) => {
            return ScorecardService.getPriorityWeight(b.priority) - ScorecardService.getPriorityWeight(a.priority)
          });

          return scorecard
        }),
        // Store the scorecard to the storage service cache
        tap(scorecard => {
          this.transientStorage.set<ScorecardModel>(
            storageKey, scorecard, ScorecardService.STORAGE_TIMEOUT_IN_DAYS);
        }),
        // Store even an invalid scorecard to avoid hitting the service too much
        catchError(() => {
          this.transientStorage.set<undefined>(
            storageKey, undefined, ScorecardService.STORAGE_TIMEOUT_IN_DAYS);

          return of(undefined);
        })
      );
  }

  /**
   * Get the weight of a priority.
   * @param priority
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
   * @param name
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
