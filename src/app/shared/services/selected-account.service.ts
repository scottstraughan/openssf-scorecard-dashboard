/*---------------------------------------------------------------------------------------------
 *
 *  Copyright (C) Scott Straughan
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

import { RepositoryModel } from '../models/repository.model';
import { BehaviorSubject, forkJoin, Observable, take, tap } from 'rxjs';
import { ScorecardService } from './scorecard.service';
import { ScorecardModel } from '../models/scorecard.model';
import { LoadingState } from '../LoadingState';
import { AccountModel } from '../models/account.model';
import { Injectable } from '@angular/core';
import { AccountService } from './account.service';
import { ScorecardRequest } from '../models/scorecard-request.model';
import { Service } from '../enums/service';

@Injectable({
  providedIn: 'root'
})
export class SelectedAccountService {
  readonly account$: BehaviorSubject<AccountModel | undefined> = new BehaviorSubject<AccountModel | undefined>(undefined);
  readonly repositories$: BehaviorSubject<RepositoryModel[]> = new BehaviorSubject<RepositoryModel[]>([]);
  readonly scorecardsRequests$: BehaviorSubject<ScorecardRequest[]> = new BehaviorSubject<ScorecardRequest[]>([]);
  readonly accountLoadState$: BehaviorSubject<LoadingState> = new BehaviorSubject<LoadingState>(LoadingState.LOADING);
  readonly repositoriesLoadState$: BehaviorSubject<LoadingState> = new BehaviorSubject<LoadingState>(LoadingState.LOADING);
  readonly scorecardsLoading$: BehaviorSubject<LoadingState> = new BehaviorSubject<LoadingState>(LoadingState.LOADING);

  /**
   * Map to track the scorecard requests.
   * @private
   */
  private scorecardRequests: Map<string, ScorecardRequest> = new Map<string, ScorecardRequest>();

  /**
   * Constructor
   * @param accountService
   * @param scorecardService
   */
  constructor(
    private accountService: AccountService,
    private scorecardService: ScorecardService,
  ) { }

  /**
   * Select a specific account, updating and loading all the associated information.
   * @param service
   * @param accountName
   */
  setAccount(
    service: Service,
    accountName: string
  ): Observable<AccountModel> {
    this.reset();

    this.accountLoadState$.next(LoadingState.LOADING);

    return this.accountService.getAccount(service, accountName)
      .pipe(
        tap(account => {
          this.account$.next(account);
          this.getRepositories(account);
          this.accountLoadState$.next(LoadingState.LOAD_SUCCESS);
        })
      );
  }

  /**
   * Reload scorecards. Can load a single scorecard of multiple. Observers to the scorecard observable will be
   * notified of changes.
   * @param account
   * @param repository
   */
  reloadScorecards(
    account: AccountModel,
    repository?: RepositoryModel
  ) {
    if (repository) {
      return this.getScorecard(account, repository)
        .subscribe();
    }

    return this.getScorecards(account, this.repositories$.getValue())
      .subscribe();
  }

  /**
   * Calculate the average score for the scorecards to two decimal places.
   */
  calculateAverageScore() {
    let totalScore = 0;
    let scoreCount = 0;

    for (const scorecardRequest of this.scorecardRequests.values()) {
      if (scorecardRequest.scorecard?.score) {
        totalScore += scorecardRequest.scorecard.score;
        scoreCount += 1;
      }
    }

    return Number(Math.round(totalScore / scoreCount).toFixed(2));
  }

  /**
   * Count the number of repositories that have valid scorecards.
   */
  countValidScorecards(): number {
    return Array.from(this.scorecardRequests.values())
      .filter(scorecard => scorecard.scorecard !== undefined).length
  }

  /**
   * Get all the repositories for a provided account.
   * @param account
   * @private
   */
  private getRepositories(
    account: AccountModel
  ) {
    this.repositoriesLoadState$.next(LoadingState.LOADING);

    return this.accountService.getRepositories(account)
      .pipe(
        tap(repositories => {
          this.repositories$.next(repositories);
          this.repositoriesLoadState$.next(LoadingState.LOAD_SUCCESS);

          this.getScorecards(account, repositories)
            .pipe(take(1))
            .subscribe();
        }),
        take(1)
      )
      .subscribe()
  }

  /**
   * Fetch all the scorecards for the provided repositories, notifying observers of changes.
   * @param account
   * @param repositories
   * @private
   */
  private getScorecards(
    account: AccountModel,
    repositories: RepositoryModel[]
  ): Observable<(ScorecardModel | undefined)[]> {
    this.scorecardsLoading$.next(LoadingState.LOADING);

    for (const repository of repositories) {
      this.updateScorecard(repository, undefined, LoadingState.LOADING);
    }

    let requests = [];
    for (const repository of repositories) {
      requests.push(
        this.getScorecard(account, repository, false)
      );
    }

    return forkJoin(requests)
      .pipe(tap(() => this.scorecardsLoading$.next(LoadingState.LOAD_SUCCESS)));
  }

  /**
   * Get a scorecard, updating observers.
   * @param account
   * @param repository
   * @param updateGlobalLoadState
   * @private
   */
  private getScorecard(
    account: AccountModel,
    repository: RepositoryModel,
    updateGlobalLoadState: boolean = true
  ): Observable<ScorecardModel | undefined> {
    if (updateGlobalLoadState) {
      this.scorecardsLoading$.next(LoadingState.LOADING);
    }

    this.updateScorecard(repository, undefined, LoadingState.LOADING);

    return this.scorecardService.getScorecard(account, repository)
      .pipe(
        tap(scorecard => {
          this.updateScorecard(repository, scorecard, LoadingState.LOAD_SUCCESS);

          if (updateGlobalLoadState) {
            this.scorecardsLoading$.next(LoadingState.LOAD_SUCCESS);
          }
        })
      )
  }

  /**
   * Update a specific scorecard request and notifying observers of changes.
   * @param repository
   * @param scorecard
   * @param loadState
   * @private
   */
  private updateScorecard(
    repository: RepositoryModel,
    scorecard: ScorecardModel | undefined,
    loadState: LoadingState
  ) {
    this.scorecardRequests.set(repository.name, <ScorecardRequest> {
      repository: repository,
      loadState: loadState,
      scorecard: scorecard
    });

    this.scorecardsRequests$.next(
      Array.from(this.scorecardRequests.values()));
  }

  /**
   * Reset between switching accounts.
   * @private
   */
  private reset() {
    this.scorecardRequests.clear();
  }
}
