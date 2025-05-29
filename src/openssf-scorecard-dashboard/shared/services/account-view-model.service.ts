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

import { Injectable } from '@angular/core';
import { AccountService } from './providers/account.service';
import { RepositoryService } from './providers/repository.service';
import { ScorecardService } from './providers/scorecard.service';
import {
  BehaviorSubject,
  filter,
  forkJoin,
  map,
  Observable, of,
  Subject,
  switchMap, take,
  takeUntil,
  tap
} from 'rxjs';
import { AccountModel } from '../models/account.model';
import { ScorecardRequest } from '../models/scorecard-request.model';
import { RepositoryModel } from '../models/repository.model';
import { ScorecardNotFoundError } from '../errors/scorecard';
import { LoadingState } from '../loading-state';
import { RepositoryCollection } from './api/base-api-service';

@Injectable({
  providedIn: 'root'
})
export class AccountViewModelService {
  /**
   * Subject that stores the selected account.
   * @private
   */
  private selectedAccount$: BehaviorSubject<AccountModel | undefined>
    = new BehaviorSubject<any>(undefined);

  /**
   * Subject that stores the selected account repositories.
   * @private
   */
  private selectedAccountRepositories$: BehaviorSubject<RepositoryCollection>
    = new BehaviorSubject<any>(new RepositoryCollection());

  /**
   * Subject that scores all selected account scorecards requests.
   * @private
   */
  private scorecardsRequests$: BehaviorSubject<Map<string, ScorecardRequest>>
    = new BehaviorSubject<any>(new Map());

  /**
   * Subject to track the scorecard loads. This is separate from the main map to reduce latency within the UI.
   * @private
   */
  private scorecardsRequestsLoadCounter$: BehaviorSubject<number | undefined>
    = new BehaviorSubject<any>(undefined);

  /**
   * Subject to track average score changes.
   * @private
   */
  private averageScore$: BehaviorSubject<number>
    = new BehaviorSubject<number>(0);

  /**
   * Used to cancel any requests, especially long ones.
   * @private
   */
  private cancelled$ = new Subject<void>();

  /**
   * If true, repositories without scorecards will not be included in the average count.
   * @private
   */
  private averageScoreHideMissingScorecards: boolean = false;

  /**
   * Constructor.
   */
  constructor(
    private accountService: AccountService,
    private repositoryService: RepositoryService,
    private scorecardService: ScorecardService
  ) { }

  /**
   * Observe the selected account.
   */
  observeAccount(): Observable<AccountModel> {
    return this.selectedAccount$.asObservable()
      .pipe(filter(account => account !== undefined));
  }

  /**
   * Observe all the repositories.
   */
  observeRepositories(): Observable<RepositoryCollection> {
    return this.selectedAccountRepositories$.asObservable();
  }

  /**
   * Observe the global scorecard loading state. If any scorecard is loading, this will return LOADING. If all the
   * scorecards are completed, the result will be LOAD_SUCCESS.
   */
  observeScorecardsLoading(): Observable<LoadingState> {
    return this.scorecardsRequestsLoadCounter$
      .pipe(
        map(counter => counter == undefined || counter > 0
          ? LoadingState.LOADING
          : LoadingState.LOAD_SUCCESS
        )
      )
  }

  /**
   * Observe a scorecard request that is mapped to the provided repository.
   */
  observeScorecardRequestByRepository(
    repository: RepositoryModel
  ): Observable<ScorecardRequest> {
    return this.scorecardsRequests$
      .pipe(
        map(() => {
          const found = this.scorecardsRequests$.getValue().get(repository.url);

          if (found)
            return found;

          throw new ScorecardNotFoundError();
        })
      );
  }

  /**
   * Observe the average score.
   */
  observeAverageScore(): Observable<number> {
    return this.averageScore$;
  }

  /**
   * Set to ignore repositories that don't have scorecards from the average score.
   * @param ignoreMissing
   */
  setIgnoreReposWithMissingScorecards(
    ignoreMissing: boolean = false
  ) {
    this.averageScoreHideMissingScorecards = ignoreMissing;
    this.averageScore$.next(this.getAverageAccountScore());
  }

  /**
   * Set the currently selected account.
   */
  setSelectedAccount(
    service: string,
    accountTag: string
  ): Observable<AccountModel> {
    let accountResult: AccountModel;

    // Close any previous observables
    this.cancelled$.next();

    // Reset the state
    this.reset();

    return this.accountService.getAccount(service, accountTag)
      .pipe(
        // Store the account for local reuse
        tap(account => 
          accountResult = account),
        
        // Notify observe of the account change
        tap(account =>
          this.selectedAccount$.next(account)),

        // Update the repositories for the given account
        switchMap(() =>
          this.reloadRepositories(false)),

        // Return the found account
        map(() =>
          accountResult),

        // Listen to cancelled$ requests
        takeUntil(this.cancelled$)
      )
  }

  /**
   * Reload all the repositories.
   * @param forceReload enable to reload from API and force update cache
   * @param emitEmpty Nasty Hack: if a user wishes to force reload the repos but show any API error in a popup,
   * we probably don't want to clear the repo list unless we can actually update it with something...
   */
  reloadRepositories(
    forceReload: boolean = false,
    emitEmpty: boolean = true
  ): Observable<any> {
    const completedSubject: Subject<void> = new Subject();

    return this.observeAccount()
      .pipe(
        // Emit a empty value
        tap(() =>
          emitEmpty && this.selectedAccountRepositories$.next(new RepositoryCollection())),

        // Fetch all the repositories
        switchMap(account =>
          this.repositoryService.getRepositories(account, forceReload, this.cancelled$)
            .pipe(
              tap(repositoryCollection =>
                this.selectedAccountRepositories$.next(repositoryCollection))
            )),

        // Reload the scorecards
        switchMap(repositoryCollection =>
          repositoryCollection.completed
            ? this.reloadScorecards(forceReload)
              .pipe(
                // We should now be fully complete
                tap(() =>
                  completedSubject.next())
              )
            : of([])),

        // Listen to cancellation or completion requests
        takeUntil(this.cancelled$),
        takeUntil(completedSubject)
      )
  }

  /**
   * Get the average scorecard result for the selected account.
   */
  getAverageAccountScore(): number {
    const scorecards = Array.from(this.scorecardsRequests$.getValue().values())
      .map(scorecardRequest =>
        scorecardRequest.scorecard);

    return this.scorecardService.calculateAverageScore(
      scorecards, this.averageScoreHideMissingScorecards);
  }

  /**
   * Get the number of repositories that have scorecards.
   */
  getRepositoriesWithScorecardCount(): number {
    const requests = Array.from(this.scorecardsRequests$.getValue().values());

    const withScorecardsCount = requests
      .filter(scorecardRequest =>
        scorecardRequest.scorecard == undefined).length;

    return requests.length - withScorecardsCount;
  }

  /**
   * Reload all the scorecards.
   * @param forceReload if true, skip cache and instead get score from the scorecard API
   */
  reloadScorecards(
    forceReload: boolean = true
  ): Observable<ScorecardRequest[]> {
    return this.observeRepositories()
      .pipe(
        // Convert into an array of requests
        map(() =>
          this.selectedAccountRepositories$.getValue().getRepositoriesAsArray().map(repository =>
            this.reloadScorecard(repository, forceReload, false))),

        // Wait until all the requests have completed
        switchMap(observables =>
          forkJoin(observables)),

        // Update the completed repositories
        tap(() =>
          this.selectedAccountRepositories$.next(this.selectedAccountRepositories$.getValue())),

        tap(scorecardRequests =>
          this.updateScorecardRequest(scorecardRequests, true)),

        // Recalculate the average score
        tap(() =>
          this.averageScore$.next(this.getAverageAccountScore())),

        // Stop when cancelled
        takeUntil(this.cancelled$),
        take(1)
      );
  }

  /**
   * Reload a specific scorecard.
   * @param repository the repository to reload
   * @param forceReload if true, the cache for the scorecard will not be used and instead update
   * @param updateSubjects if true, any observers to the scorecards or load counter will be notified of changes
   */
  reloadScorecard(
    repository: RepositoryModel,
    forceReload: boolean = true,
    updateSubjects: boolean = true
  ): Observable<ScorecardRequest> {
    const scorecardRequest = <ScorecardRequest> {
      repository: repository,
      scorecard: undefined,
      loadState: LoadingState.LOADING
    };

    // Update the request loading state and notify observers
    this.updateScorecardRequest(scorecardRequest);

    return this.observeAccount()
      .pipe(
        // Force reload the scorecard
        switchMap(account =>
          this.scorecardService.getScorecard(account, repository, forceReload)),

        // Update the request
        map(scorecard => {
          scorecardRequest.scorecard = scorecard;
          scorecardRequest.loadState = LoadingState.LOAD_SUCCESS;
          return scorecardRequest;
        }),

        // Update the scorecard requests
        tap(scorecardRequest =>
          updateSubjects && this.updateScorecardRequest(scorecardRequest)),

        // Listen to cancelled$ requests
        takeUntil(this.cancelled$),
        take(1)
      )
  }

  /**
   * Reset the account view model state so it's ready to accept a new account without any lingering data from a
   * previous account.
   * @private
   */
  private reset() {
    this.scorecardsRequestsLoadCounter$.next(1);
    this.averageScore$.next(0);
    this.selectedAccountRepositories$.next(new RepositoryCollection());
  }

  /**
   * Update a scorecard request, also updating the loading counter.
   * @param scorecardRequests array of ScorecardRequest to update
   * @param clear clear the original requests or not
   * @private
   */
  private updateScorecardRequest(
    scorecardRequests: ScorecardRequest | ScorecardRequest[],
    clear: boolean = false
  ) {
    if (clear)
      this.scorecardsRequests$.getValue().clear();

    if (!Array.isArray(scorecardRequests))
      scorecardRequests = [scorecardRequests];

    for (const scorecardRequest of scorecardRequests)
      this.scorecardsRequests$.getValue().set(scorecardRequest.repository.url, scorecardRequest);

    const loadingCount = Array.from(this.scorecardsRequests$.getValue().values())
      .filter(scorecardRequest =>
        scorecardRequest.loadState == LoadingState.LOADING).length;

    // Update subjects
    this.scorecardsRequestsLoadCounter$.next(loadingCount);
    this.scorecardsRequests$.next(this.scorecardsRequests$.getValue());
  }
}
