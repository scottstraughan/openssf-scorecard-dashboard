/*---------------------------------------------------------------------------------------------
 *
 *  Copyright (C) Codeplay Software Ltd.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *--------------------------------------------------------------------------------------------*/

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AccountModel } from '../models/account.model';
import { RepositoryModel } from '../models/repository.model';
import { catchError, map, Observable, of } from 'rxjs';
import { ScorecardModel } from '../models/scorecard.model';

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
   * Get a score from the securityscorecards API.
   * @param account
   * @param repository
   */
  getScorecard(
    account: AccountModel,
    repository: RepositoryModel
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
            url: `https://scorecard.dev/viewer/?uri=${scorecardResult['repo']['name']}`
          }
        }),
        catchError(() => {
          return of({
            score: undefined,
            checks: [],
            url: '',
          });
        })
      );
  }

  /**
   * Determine the priority of the specific check. Unfortunately, the API does not return it, so we need to check it
   * manually.
   * @param name
   */
  static getPriority(
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
