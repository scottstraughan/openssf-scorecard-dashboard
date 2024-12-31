/*---------------------------------------------------------------------------------------------
 *
 *  Copyright (C) Codeplay Software Ltd, Scott Straughan.
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

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { ScoreRingComponent } from '../shared/components/score-ring/score-ring.component';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { AccountModel } from '../shared/models/account.model';
import { LoadingComponent } from '../shared/components/loading/loading.component';
import { LoadingState } from '../shared/LoadingState';
import { catchError, of, Subject, Subscription, take, takeUntil, tap } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { PopupService } from '../shared/components/popup/popup.service';
import { SelectedAccountStateService } from '../shared/services/selected-account-state.service';
import { AccountService } from '../shared/services/account.service';
import { ErrorPopupError, ErrorPopupService } from '../shared/services/error-popup.service';

@Component({
  selector: 'osd-account-view',
  standalone: true,
  imports: [
    ButtonComponent,
    ScoreRingComponent,
    LoadingComponent,
    RouterOutlet
  ],
  templateUrl: './account-view.component.html',
  styleUrl: './account-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountViewComponent implements OnInit, OnDestroy {
  /**
   * For the UI, a reference to LoadingState.
   */
  readonly LoadingState = LoadingState;

  readonly fatalError: WritableSignal<ErrorPopupError | undefined> = signal(undefined);
  readonly selectedAccount: WritableSignal<AccountModel | undefined> = signal(undefined);
  readonly accountLoadState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly scorecardLoadState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly totalRepositories: WritableSignal<number> = signal(0);
  readonly totalRepositoriesWithScorecards: WritableSignal<number> = signal(0);
  readonly averageScorecardScore: WritableSignal<number> = signal(0);

  private cleanup = new Subject<void>();
  private accountSubscription: Subscription | undefined;

  /**
   * Constructor.
   * @param router
   * @param title
   * @param activatedRoute
   * @param popupService
   * @param selectedAccountService
   * @param accountService
   * @param errorPopupService
   */
  constructor(
    protected router: Router,
    protected title: Title,
    protected activatedRoute: ActivatedRoute,
    protected popupService: PopupService,
    protected selectedAccountService: SelectedAccountStateService,
    protected accountService: AccountService,
    protected errorPopupService: ErrorPopupService
  ) { }

  /**
   * @inheritdoc
   */
  ngOnInit(): void {
    this.selectedAccountService.observeRepositories()
      .pipe(
        tap(repositories => this.totalRepositories.set(repositories.length)),
        takeUntil(this.cleanup)
      )
      .subscribe();

    this.selectedAccountService.observeScorecardsLoadState()
      .pipe(
        tap(loadState => {
          this.scorecardLoadState.set(loadState);

          if (loadState == LoadingState.LOAD_SUCCESS) {
            this.averageScorecardScore.set(this.selectedAccountService.calculateAverageScore());
            this.totalRepositoriesWithScorecards.set(this.selectedAccountService.countValidScorecards());
          }
        }),
        takeUntil(this.cleanup)
      )
      .subscribe();

    this.activatedRoute.params
      .pipe(
        tap((params) => {
          this.reset();

          this.accountSubscription = this.selectedAccountService.setAccount(params['service'], params['account'])
            .pipe(
              tap(account => {
                this.title.setTitle(`${account.name} - OpenSSF Dashboard`);

                this.selectedAccount.set(account);
                this.accountLoadState.set(LoadingState.LOAD_SUCCESS);
              }),
              catchError(error => {
                this.errorPopupService.handleError(error);
                this.fatalError.set(this.errorPopupService.convertError(error));
                return of(error);
              }),
              take(1)
            )
            .subscribe();
        }),
      )
      .subscribe();
  }

  /**
   * @inheritdoc
   */
  ngOnDestroy() {
    this.cleanup.next();
    this.cleanup.complete();
  }

  /**
   * Reload all the scorecard results.
   * @param account
   */
  reloadScorecardResults(
    account: AccountModel
  ) {
    this.selectedAccountService.reloadScorecards(account);
  }

  /**
   * Called when a user presses the delete service account button.
   * @param account
   */
  onDeleteServiceAccount(
    account: AccountModel
  ) {
    try {
      // Delete the account
      this.accountService.delete(account);

      // On success, navigate to the root where we will redirect to the correct place
      this.router.navigate(['/']).then();
    } catch (error) {
      this.errorPopupService.handleError(error);
    }
  }

  /**
   * Called when a user wishes to re-fetch the repositories.
   * @param account
   */
  onFetchRepositories(
    account: AccountModel
  ) {
    this.selectedAccountService.getRepositories(account, true);
  }

  /**
   * Reset the UI.
   */
  private reset() {
    this.accountSubscription?.unsubscribe();

    this.fatalError.set(undefined);
    this.selectedAccount.set(undefined);

    this.accountLoadState.set(LoadingState.LOADING);
    this.scorecardLoadState.set(LoadingState.LOADING);

    this.totalRepositoriesWithScorecards.set(0);
    this.averageScorecardScore.set(0);
  }
}
