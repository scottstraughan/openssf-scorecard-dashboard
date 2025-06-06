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

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnDestroy,
  OnInit,
  Signal,
  signal,
  WritableSignal
} from '@angular/core';
import { LinkButtonComponent } from '../shared/components/link-button/link-button.component';
import { ScoreRingComponent } from '../shared/components/score-ring/score-ring.component';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { AccountModel } from '../shared/models/account.model';
import { LoadingComponent } from '../shared/components/loading/loading.component';
import { LoadingState } from '../shared/loading-state';
import { catchError, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { AccountViewModelService } from '../shared/services/account-view-model.service';
import { AccountService } from '../shared/services/providers/account.service';
import { ErrorService } from '../shared/services/error.service';
import { IconComponent } from '../shared/components/icon/icon.component';
import { Service } from '../shared/enums/service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'ossfd-account-view',
  standalone: true,
  imports: [
    LinkButtonComponent,
    ScoreRingComponent,
    LoadingComponent,
    RouterOutlet,
    IconComponent,
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

  readonly selectedAccount: WritableSignal<AccountModel | undefined> = signal(undefined);
  readonly accountLoadState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly totalRepositories: WritableSignal<number> = signal(0);
  readonly totalRepositoriesWithScorecards: WritableSignal<number> = signal(0);

  readonly scorecardLoadState: Signal<LoadingState>;
  readonly averageScorecardScore: Signal<number>;
  readonly selectedAccountServiceName: Signal<string> = signal('');

  /**
   * This is used to clean up when ngOnDestroy is called, or we wish to reset state.
   * @private
   */
  private onDestroy = new Subject<void>();

  /**
   * Constructor.
   */
  constructor(
    private router: Router,
    private title: Title,
    private activatedRoute: ActivatedRoute,
    private accountViewModelService: AccountViewModelService,
    private accountService: AccountService,
    private errorService: ErrorService,
  ) {
    // Used for the visit repository button
    this.selectedAccountServiceName = computed(() => {
      switch (this.selectedAccount()?.service) {
        case Service.GITHUB:
          return 'GitHub.com'
        case Service.GITLAB:
          return 'GitLab.com'
        default:
          return ''
      }
    });

    this.averageScorecardScore = toSignal(
      this.accountViewModelService.observeAverageScore(), { initialValue: 0 })

    this.scorecardLoadState = toSignal(
      this.accountViewModelService.observeScorecardsLoading()
        .pipe(
          tap(() =>
            this.totalRepositoriesWithScorecards.set(this.accountViewModelService.getRepositoriesWithScorecardCount()))
        ), { initialValue: LoadingState.LOADING }
    );
  }

  /**
   * @inheritdoc
   */
  ngOnInit(): void {
    this.accountViewModelService.observeRepositories()
      .pipe(
        tap(repositoryCollection =>
          this.totalRepositories.set(repositoryCollection.getRepositoriesAsArray().length)),
        takeUntil(this.onDestroy)
      )
      .subscribe();

    this.accountViewModelService.observeAccount()
      .pipe(
        // Update the account when the account changes
        tap(account => {
          this.title.setTitle(`${account.name} - OpenSSF Scorecard Dashboard`);

          this.selectedAccount.set(account);
          this.accountLoadState.set(LoadingState.LOAD_SUCCESS);
        }),

        // Catch any error
        catchError(error =>
          this.errorService.handleError(error)),

        // Take until we clean
        takeUntil(this.onDestroy)
      )
      .subscribe()

    this.activatedRoute.params
      .pipe(
        // Reset the view
        tap(() =>
          this.reset()),

        // Set the selected account based on router params
        switchMap(params =>
          this.accountViewModelService.setSelectedAccount(params['serviceTag'], params['accountTag'])),

        // Catch any errors
        catchError(error =>
          this.errorService.handleError(error)),

        // Take new route changes until destroy
        takeUntil(this.onDestroy)
      )
      .subscribe();
  }

  /**
   * @inheritdoc
   */
  ngOnDestroy() {
    this.onDestroy.next();
    this.onDestroy.complete();
  }

  /**
   * Reload all the scorecard results.
   */
  onReloadScorecardResults() {
    this.accountViewModelService.reloadScorecards(true)
      .pipe(take(1))
      .subscribe();
  }

  /**
   * Called when a user presses the delete service account button.
   */
  onDeleteServiceAccount(
    account: AccountModel
  ) {
    try {
      // Delete the account
      this.accountService.deleteCached(account)
        .pipe(
          // On success, navigate to the root where we will redirect to the correct place
          tap(() =>
            this.router.navigate(['/'], { replaceUrl: true }).then()),

          // Handle any error
          catchError(error =>
            this.errorService.handleError(error, false)),

          // Ensure we close
          take(1)
        )
        .subscribe();
    } catch (error: any) {
      this.errorService.handleError(error, false);
    }
  }

  /**
   * Called when a user wishes to reload the repositories.
   */
  onReloadRepositories(
    account: AccountModel
  ) {
    this.accountViewModelService.reloadRepositories(true, false)
      .pipe(
        tap(() =>
          this.router.navigate(
            [`/${account.service}/${account.tag}`],
            { relativeTo: this.activatedRoute })),

        catchError(error =>
          this.errorService.handleError(error, false))
      )
      .subscribe();
  }

  /**
   * Reset the UI state.
   * @private
   */
  private reset() {
    this.onDestroy.complete();

    this.selectedAccount.set(undefined);
    this.accountLoadState.set(LoadingState.LOADING);
    this.totalRepositoriesWithScorecards.set(0);
  }
}
