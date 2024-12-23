import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AccountModel } from '../models/account.model';
import { ScorecardModel } from '../models/scorecard.model';
import { RepositoryModel } from '../models/repository.model';

@Injectable({
  providedIn: 'root'
})
export class ScorecardService {
  /**
   * Constructor
   * @param httpClient
   */
  constructor(
    private httpClient: HttpClient
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
              return check;
            }),
            url: `https://scorecard.dev/viewer/?uri=${scorecardResult['repo']['name']}`,
            dateGenerated: new Date(scorecardResult['date'])
          }
        }),
        catchError(() => {
          return of(undefined);
        })
      );
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

/**
 * Enum representing priority.
 */
export enum ResultPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}
