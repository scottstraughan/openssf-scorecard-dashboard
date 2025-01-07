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
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, take, tap } from 'rxjs';
import { ScorecardService } from './scorecard.service';
import { ScorecardModel } from '../models/scorecard.model';
import { LoadingState } from '../LoadingState';
import { AccountModel } from '../models/account.model';
import { Injectable } from '@angular/core';
import { AccountService } from './account.service';
import { ScorecardRequest } from '../models/scorecard-request.model';
import { Service } from '../enums/service';
import { RepositoryNotFoundError } from '../errors/account';
import { ScorecardNotFoundError } from '../errors/scorecard';

@Injectable({
  providedIn: 'root'
})
export class SelectedAccountStateService {
  /**
   * The selected account.
   */
  private account$: BehaviorSubject<AccountModel | undefined> = new BehaviorSubject<AccountModel | undefined>(undefined);

  /**
   * The repositories of the selected account.
   */
  private repositories$: BehaviorSubject<RepositoryModel[]> = new BehaviorSubject<RepositoryModel[]>([]);

  /**
   * Load state for repositories.
   */
  private repositoriesLoadState$: BehaviorSubject<LoadingState> = new BehaviorSubject<LoadingState>(LoadingState.LOADING);

  /**
   * Load state for scorecards.
   */
  private scorecardsLoadState$: BehaviorSubject<LoadingState> = new BehaviorSubject<LoadingState>(LoadingState.LOADING);

  /**
   * A list of scorecard requests. If this list is non-zero, it means at least one scorecard is loading.
   */
  private scorecardsRequests$: BehaviorSubject<ScorecardRequest[]> = new BehaviorSubject<ScorecardRequest[]>([]);

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
   * Observe changes to the account model.
   */
  observeAccount(): Observable<AccountModel | undefined> {
    return this.account$.asObservable();
  }

  /**
   * Observe changes to the current account repositories.
   */
  observeRepositories(): Observable<RepositoryModel[]> {
    return this.repositories$.asObservable();
  }

  /**
   * Observe changes to the repositories load state.
   */
  observeRepositoriesLoadState(): Observable<LoadingState> {
    return this.repositoriesLoadState$.asObservable();
  }

  /**
   * Observe changes to the scorecard load states.
   */
  observeScorecardsLoadState(): Observable<LoadingState> {
    return this.scorecardsLoadState$.asObservable();
  }

  /**
   * Get a specific scorecard
   * @param repository
   */
  getScorecardRequestByRepository(
    repository: RepositoryModel
  ): Observable<ScorecardRequest> {
    return this.scorecardsRequests$
      .pipe(
        map(scorecardRequests => {
          for (const scorecardRequest of scorecardRequests) {
            if (scorecardRequest.repository.url == repository.url) {
              return scorecardRequest;
            }
          }

          throw new ScorecardNotFoundError();
        })
      );
  }

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

    return this.accountService.getAccount(service, accountName)
      .pipe(
        tap(account => {
          this.account$.next(account);
          this.getRepositories(account);
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
      return this.getScorecard(account, repository, true, true)
        .subscribe();
    }

    return this.getScorecards(account, this.repositories$.getValue(), true)
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
   * @param reload
   * @private
   */
  getRepositories(
    account: AccountModel,
    reload: boolean = false
  ) {
    this.repositoriesLoadState$.next(LoadingState.LOADING);

    return this.accountService.getRepositories(account, reload)
      .pipe(
        tap(repositories => {
          this.repositories$.next(repositories);
          this.repositoriesLoadState$.next(LoadingState.LOAD_SUCCESS);

          this.getScorecards(account, repositories, reload)
            .pipe(take(1))
            .subscribe();
        }),
        take(1)
      )
      .subscribe()
  }

  /**
   * Get a repository.
   * @param repositoryName
   * @throws RepositoryNotFoundError
   */
  getRepository(
    repositoryName: string
  ): Observable<RepositoryModel> {
    return this.repositories$
      .pipe(
        map(repositories => {
          for (const repository of repositories) {
            if (repository.name === repositoryName) {
              return repository;
            }
          }

          throw new RepositoryNotFoundError();
        })
      )
  }

  /**
   * Fetch all the scorecards for the provided repositories, notifying observers of changes.
   * @param account
   * @param repositories
   * @param forceReload
   * @private
   */
  private getScorecards(
    account: AccountModel,
    repositories: RepositoryModel[],
    forceReload: boolean = false
  ): Observable<(ScorecardModel | undefined)[]> {
    this.scorecardsLoadState$.next(LoadingState.LOADING);

    for (const repository of repositories) {
      this.updateScorecard(repository, undefined, LoadingState.LOADING);
    }

    const requests = [];

    for (const repository of repositories) {
      requests.push(
        this.getScorecard(account, repository, false, forceReload));
    }

    return forkJoin(requests)
      .pipe(
        tap(() => this.scorecardsLoadState$.next(LoadingState.LOAD_SUCCESS))
      );
  }

  /**
   * Get a scorecard, updating observers.
   * @param account
   * @param repository
   * @param updateGlobalLoadState
   * @param forceReload
   * @private
   */
  private getScorecard(
    account: AccountModel,
    repository: RepositoryModel,
    updateGlobalLoadState: boolean = true,
    forceReload: boolean = false
  ): Observable<ScorecardModel | undefined> {
    if (updateGlobalLoadState) {
      this.scorecardsLoadState$.next(LoadingState.LOADING);
    }

    this.updateScorecard(repository, undefined, LoadingState.LOADING);

    return this.scorecardService.getScorecard(account, repository, forceReload)
      .pipe(
        tap(scorecard => {
          this.updateScorecard(repository, scorecard, LoadingState.LOAD_SUCCESS);

          if (updateGlobalLoadState) {
            this.scorecardsLoadState$.next(LoadingState.LOAD_SUCCESS);
          }
        }),
        catchError(error => {
          this.updateScorecard(repository, undefined, LoadingState.LOAD_SUCCESS);

          if (updateGlobalLoadState) {
            this.scorecardsLoadState$.next(LoadingState.LOAD_SUCCESS);
          }

          return of(error)
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
