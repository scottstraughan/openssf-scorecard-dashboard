import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AccountModel } from '../models/account.model';
import { ScorecardModel } from '../models/scorecard.model';
import { RepositoryModel } from '../models/repository.model';
import { ScorecardCheck } from '../models/scorecard-check.model';
import { MarkdownService } from 'ngx-markdown';

@Injectable({
  providedIn: 'root'
})
export class ScorecardService {
  static readonly CHECK_DETAILS_URL = 'https://raw.githubusercontent.com/ossf/scorecard/49c0eed3a423f00c872b5c3c9f1bbca9e8aae799/docs/checks.md';

  /**
   * Constructor
   * @param httpClient
   * @param markdownService
   */
  constructor(
    private httpClient: HttpClient,
    private markdownService: MarkdownService
  ) { }

  /**
   * Get a single scorecard for a provided repository.
   * @param account
   * @param repository
   */
  getScorecard(
    account: AccountModel,
    repository: RepositoryModel,
  ): Observable<ScorecardModel | undefined> {
    return this.fetchScorecard(account, repository)
      .pipe(
        tap(scorecard => repository.scorecard = scorecard)
      );
  }

  getCheckDetails(
    scorecardCheck: ScorecardCheck
  ): Observable<ScorecardCheckDetails> {
    return this.httpClient.get(ScorecardService.CHECK_DETAILS_URL, { responseType: 'text' })
      .pipe(
        map(result => this.markdownService.parse(result).toString()),
        map((result: string) => {
          const regex = /(<h2.*?>.*?<\/h2>)/gim;
          const target = `<h2 id="${scorecardCheck.documentation.anchor}">`;
          const segments = result.split(regex);

          for (const [index, value] of segments.entries()) {
            if (value.includes(target)) {
              return `<h2>${scorecardCheck.name}</h2>` + segments[index + 1];
            }
          }

          throw new Error('UNABLE TO PARSE SEGMENT');
        }),
        map(result => <ScorecardCheckDetails> {
          details: result,
          check: scorecardCheck
        })
      )
  }

  /**
   * Fetch a scorecard from the OpenSSF API.
   * @param account
   * @param repository
   * @protected
   */
  private fetchScorecard(
    account: AccountModel,
    repository: RepositoryModel,
  ): Observable<ScorecardModel | undefined> {
    const url = `https://api.securityscorecards.dev/projects/github.com/${account.account}/${repository.name}`;

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
        catchError(() => {
          return of(undefined);
        })
      );
  }

  /**
   * Get the weight of a priority.
   * @param priority
   * @private
   */
  private static getPriorityWeight(priority: ResultPriority): number {
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
}

/**
 * Enum representing priority.
 */
export enum ResultPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface ScorecardCheckDetails {
  details: string
  check: ScorecardCheck
}