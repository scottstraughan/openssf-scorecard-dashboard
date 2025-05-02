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
  Observable,
  Subject,
  switchMap,
  takeUntil,
  tap
} from 'rxjs';
import { AccountModel } from '../models/account.model';
import { ScorecardRequest } from '../models/scorecard-request.model';
import { RepositoryModel } from '../models/repository.model';
import { ScorecardNotFoundError } from '../errors/scorecard';
import { ScorecardModel } from '../models/scorecard.model';
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
  private selectedAccount: BehaviorSubject<AccountModel | undefined>
    = new BehaviorSubject<any>(undefined);

  /**
   * Subject that stores the selected account repositories.
   * @private
   */
  private selectedAccountRepositories: BehaviorSubject<RepositoryCollection>
    = new BehaviorSubject<any>(new RepositoryCollection());

  /**
   * Subject that scores all selected account scorecards requests.
   * @private
   */
  private scorecardsRequests$: BehaviorSubject<ScorecardRequest[]>
    = new BehaviorSubject<any>([]);

  /**
   * Used to cancel any requests, especially long ones.
   * @private
   */
  private cancelled$ = new Subject<void>();

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
    return this.selectedAccount.asObservable()
      .pipe(filter(account => account !== undefined));
  }

  /**
   * Observe all the repositories.
   */
  observeRepositories(): Observable<RepositoryCollection> {
    return this.selectedAccountRepositories.asObservable();
  }

  /**
   * Observe the global scorecard loading state. If any scorecard is loading, this will return LOADING. If all the
   * scorecards are completed, the result will be LOAD_SUCCESS.
   */
  observeScorecardsLoading(): Observable<LoadingState> {
    return this.scorecardsRequests$
      .pipe(
        map(scorecardRequests => {
          for (const request of scorecardRequests) {
            if (request.loadState == LoadingState.LOADING) {
              return LoadingState.LOADING;
            }
          }

          return LoadingState.LOAD_SUCCESS;
        })
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
   * Set the currently selected account.
   */
  setSelectedAccount(
    service: string,
    accountTag: string
  ): Observable<AccountModel> {
    let accountResult: AccountModel;

    // Close any previous observables
    this.cancelled$.next();
    
    return this.accountService.getAccount(service, accountTag)
      .pipe(
        // Store the account for local reuse
        tap(account => 
          accountResult = account),
        
        // Notify observe of the account change
        tap(account =>
          this.selectedAccount.next(account)),

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
  ) {
    return this.observeAccount()
      .pipe(
        // Emit a empty value
        tap(() =>
          emitEmpty && this.selectedAccountRepositories.next(new RepositoryCollection())),

        // Fetch all the repositories
        switchMap(account =>
          this.repositoryService.getRepositories(account, forceReload, this.cancelled$)
            .pipe(
              tap(repositoryCollection =>
                this.selectedAccountRepositories.next(repositoryCollection))
            )),

        // Reload the scorecards
        switchMap(() =>
          this.reloadScorecards(false)),

        // Listen to cancelled$ requests
        takeUntil(this.cancelled$)
      )
  }

  /**
   * Get the average scorecard result for the selected account.
   */
  getAverageAccountScore(): number {
    const scorecards = this.scorecardsRequests$.getValue()
      .map(scorecardRequest => scorecardRequest.scorecard);

    return this.scorecardService.calculateAverageScore(scorecards);
  }

  /**
   * Get the number of repositories that have scorecards.
   */
  getRepositoriesWithScorecardCount(): number {
    const withScorecardsCount = this.scorecardsRequests$.getValue()
      .filter(scorecardRequest => scorecardRequest.scorecard == undefined).length;

    return this.scorecardsRequests$.getValue().length - withScorecardsCount;
  }

  /**
   * Find a scorecard request based on the provided repository.
   */
  getScorecardRequest(
    repository: RepositoryModel
  ): ScorecardRequest {
    const filtered = this.scorecardsRequests$.getValue().filter(request =>
      request.repository.url == repository?.url);

    if (filtered.length == 0) {
      throw new ScorecardNotFoundError('Could not find the provided scorecard request.');
    }

    return filtered[0];
  }

  /**
   * Reload all the scorecards.
   */
  reloadScorecards(
    forceReload: boolean = true
  ): Observable<(ScorecardModel | undefined)[]> {
    return this.observeRepositories()
      .pipe(
        // Convert into an array of requests
        map(repositoryCollection => repositoryCollection.repositories.map(repository => <ScorecardRequest> {
          repository: repository,
          scorecard: undefined,
          loadState: LoadingState.LOADING })),

        // Update the requests subject
        tap(repositoryRequests =>
          this.scorecardsRequests$.next(repositoryRequests)),

        // Remap each request into a reload observable
        map(repositoryRequests => repositoryRequests.map(scorecardRequest =>
          this.reloadScorecard(scorecardRequest.repository, forceReload))),

        // Wait until all the requests have completed
        switchMap(observables => forkJoin(observables)),

        // Stop when cancelled
        takeUntil(this.cancelled$)
      );
  }

  /**
   * Reload a specific scorecard.
   */
  reloadScorecard(
    repository: RepositoryModel,
    forceReload: boolean = true
  ): Observable<any> {
    const scorecardRequest = this.getScorecardRequest(repository);

    // Update the request loading state and notify observers
    scorecardRequest.loadState = LoadingState.LOADING;
    this.scorecardsRequests$.next(this.scorecardsRequests$.getValue());

    return this.observeAccount()
      .pipe(
        // Force reload the scorecard
        switchMap(account =>
          this.scorecardService.getScorecard(account, repository, forceReload)),

        // Update the request
        tap(scorecard => {
          scorecardRequest.scorecard = scorecard;
          scorecardRequest.loadState = LoadingState.LOAD_SUCCESS;
          this.scorecardsRequests$.next(this.scorecardsRequests$.getValue());
        }),

        // Listen to cancelled$ requests
        takeUntil(this.cancelled$)
      )
  }
}
