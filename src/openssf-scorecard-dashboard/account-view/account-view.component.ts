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
  readonly scorecardLoadState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly totalRepositories: WritableSignal<number> = signal(0);
  readonly totalRepositoriesWithScorecards: WritableSignal<number> = signal(0);
  readonly averageScorecardScore: WritableSignal<number> = signal(0);
  readonly selectedAccountServiceName: Signal<string> = signal('');

  /**
   * This is used to clean up when ngOnDestroy is called, or we wish to reset state.
   * @private
   */
  private cleanup = new Subject<void>();

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
    })
  }

  /**
   * @inheritdoc
   */
  ngOnInit(): void {
    this.accountViewModelService.observeRepositories()
      .pipe(
        tap(repositoryCollection =>
          this.totalRepositories.set(repositoryCollection.repositories.length)),
        takeUntil(this.cleanup)
      )
      .subscribe();

    this.accountViewModelService.observeScorecardsLoading()
      .pipe(
        tap(loadState => {
          this.scorecardLoadState.set(loadState);

          if (loadState == LoadingState.LOAD_SUCCESS) {
            this.averageScorecardScore.set(this.accountViewModelService.getAverageAccountScore());
            this.totalRepositoriesWithScorecards.set(this.accountViewModelService.getRepositoriesWithScorecardCount());
          }
        }),
        takeUntil(this.cleanup)
      )
      .subscribe();

    this.accountViewModelService.observeAccount()
      .pipe(
        tap(account => {
          this.title.setTitle(`${account.name} - OpenSSF Scorecard Dashboard`);

          this.selectedAccount.set(account);
          this.accountLoadState.set(LoadingState.LOAD_SUCCESS);
        }),
        catchError(error =>
          this.errorService.handleError(error)),

        takeUntil(this.cleanup)
      )
      .subscribe()

    this.activatedRoute.params
      .pipe(
        tap(() => this.reset()),

        switchMap(params =>
          this.accountViewModelService.setSelectedAccount(params['serviceTag'], params['accountTag'])),

        catchError(error =>
          this.errorService.handleError(error)),

        takeUntil(this.cleanup)
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
    this.cleanup.complete();

    this.selectedAccount.set(undefined);
    this.accountLoadState.set(LoadingState.LOADING);
    this.scorecardLoadState.set(LoadingState.LOADING);
    this.totalRepositoriesWithScorecards.set(0);
    this.averageScorecardScore.set(0);
  }
}
