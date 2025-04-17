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

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { ScoreRingComponent } from '../../../shared/components/score-ring/score-ring.component';
import { LinkButtonComponent } from '../../../shared/components/link-button/link-button.component';
import { CheckComponent } from './components/check/check.component';
import { RepositoryModel } from '../../../shared/models/repository.model';
import { SelectedAccountStateService } from '../../../shared/services/selected-account-state.service';
import { catchError, map, of, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ScorecardModel } from '../../../shared/models/scorecard.model';
import { ScorecardService } from '../../../shared/services/scorecard.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ErrorPopupError, ErrorPopupService } from '../../../shared/services/error-popup.service';
import { ScorecardCheck } from '../../../shared/models/scorecard-check.model';
import { FadedBgComponent } from '../../../shared/components/faded-bg/faded-bg.component';
import { ScorecardCheckDetails } from '../../../shared/models/scorecard-check-details.model';
import { AccountModel } from '../../../shared/models/account.model';
import { GenericError } from '../../../shared/errors/generic';
import { ScorecardNotFoundError } from '../../../shared/errors/scorecard';
import { InvalidAccountError } from '../../../shared/errors/account';
import { Title } from '@angular/platform-browser';
import { PopupService } from '../../../shared/components/popup/popup.service';
import { EmbedBadgePopupComponent } from './popups/embed-badge/embed-badge-popup.component';
import { LoadingState } from '../../../shared/loading-state';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'ossfd-scorecard-view',
  standalone: true,
  imports: [
    ScoreRingComponent,
    LinkButtonComponent,
    CheckComponent,
    DatePipe,
    LoadingComponent,
    FadedBgComponent,
    IconComponent
  ],
  templateUrl: './scorecard-view.component.html',
  styleUrl: './scorecard-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScorecardViewComponent implements OnInit, OnDestroy {
  protected readonly LoadingState = LoadingState;
  protected readonly ScoreRingComponent = ScoreRingComponent;

  protected account: AccountModel | undefined;
  protected cleanup = new Subject<void>();

  readonly fatalError: WritableSignal<ErrorPopupError | undefined> = signal(undefined);
  readonly loading: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly repository: WritableSignal<RepositoryModel | undefined> = signal(undefined);
  readonly scorecard: WritableSignal<ScorecardModel | undefined> = signal(undefined);

  readonly selectedScorecardCheck: WritableSignal<ScorecardCheck | undefined> = signal(undefined);
  readonly scorecardCheckDetailsLoadState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly scorecardCheckDetails: WritableSignal<ScorecardCheckDetails | undefined> = signal(undefined);

  /**
   * Constructor.
   * @param router
   * @param location
   * @param selectedAccountService
   * @param activatedRoute
   * @param scorecardService
   * @param errorPopupService
   * @param popupService
   * @param title
   */
  constructor(
    protected router: Router,
    protected location: Location,
    protected selectedAccountService: SelectedAccountStateService,
    protected activatedRoute: ActivatedRoute,
    protected scorecardService: ScorecardService,
    protected errorPopupService: ErrorPopupService,
    protected popupService: PopupService,
    protected title: Title
  ) { }

  /**
   * @inheritdoc
   */
  ngOnInit(): void {
    this.selectedAccountService.observeScorecardsLoadState()
      .pipe(
        tap(loadState => this.loading.set(loadState)),
        takeUntil(this.cleanup)
      )
      .subscribe();

    this.activatedRoute.params
      .pipe(
        tap(params => {
          // Watch changes to the selected account
          this.selectedAccountService.observeAccount()
            .pipe(
              tap(account =>
                this.account = account),
              map(account => {
                if (!account) {
                  throw new InvalidAccountError();
                }

                return account;
              }),
              switchMap(account =>
                this.selectedAccountService.getRepository(params['repositoryName'])
                  .pipe(
                    tap(repository =>
                      this.setRepository(account, repository)),
                    switchMap(repository =>
                      this.scorecardService.getScorecard(account, repository)
                        .pipe(tap(scorecard => this.setScorecard(scorecard, params['checkName'])))
                    )
                  )
              ),
              catchError(error => {
                this.handleError(error, true);
                return of(error);
              }),
              take(1)
            )
            .subscribe();
        }),
        takeUntil(this.cleanup)
      )
      .subscribe();
  }

  /**
   * @inheritdoc
   */
  ngOnDestroy(): void {
    this.cleanup.complete();
  }

  /**
   * Called when a user clicks the back button.
   */
  onBackClicked() {
    this.router.navigate(['../'])
      .then();
  }

  /**
   * Called when a user wishes to close the scorecard check details.
   */
  onCloseDetails(
    repository: RepositoryModel
  ) {
    this.selectedScorecardCheck.set(undefined);
    this.scorecardCheckDetails.set(undefined);

    this.router.navigate([`../${repository.name}`], { relativeTo: this.activatedRoute })
      .then()
  }

  /**
   * Called when the user clicks on the check.
   * @param check
   */
  onClicked(
    check: ScorecardCheck
  ) {
    this.setSelectedCheck(check);
  }

  /**
   * Check if a check is selected.
   * @param check
   */
  isSelected(
    check: ScorecardCheck
  ) {
    return this.selectedScorecardCheck()?.name == check.name;
  }

  /**
   * Get the priority color for the UI.
   * @param scorecardCheckDetails
   */
  getPriorityColor(
    scorecardCheckDetails: ScorecardCheckDetails
  ) {
    return this.scorecardService.getPriorityColor(scorecardCheckDetails.check.priority);
  }

  /**
   * Called when a user clicks on the generate badge button.
   */
  onGenerateBadge(repository: RepositoryModel) {
    this.popupService.create(EmbedBadgePopupComponent, repository, true);
  }

  /**
   * Set the selected repository.
   * @param account
   * @param repository
   * @private
   */
  private setRepository(
    account: AccountModel,
    repository: RepositoryModel
  ) {
    this.repository.set(repository);
    this.title.setTitle(`${repository.name} - ${account.name} - OpenSSF Scorecard Dashboard`);
  }

  /**
   * Set the selected scorecard.
   * @param scorecard
   * @param selectedCheckName
   * @private
   */
  private setScorecard(
    scorecard: ScorecardModel | undefined,
    selectedCheckName: string | undefined
  ) {
    this.loading.set(LoadingState.LOAD_SUCCESS);
    this.scorecard.set(scorecard);

    if (!scorecard) {
      throw new ScorecardNotFoundError();
    }

    if (selectedCheckName) {
      try {
        this.setSelectedCheck(
          this.scorecardService.getCheckByName(selectedCheckName, scorecard));
      } catch (error: any) {
        return this.handleError(error, false);
      }
    }
  }

  /**
   * Handle an error.
   * @param error
   * @param fatal
   * @private
   */
  private handleError(
    error: GenericError,
    fatal: boolean = true
  ) {
    this.errorPopupService.handleError(error);

    if (fatal) {
      this.fatalError.set(this.errorPopupService.convertError(error));

      this.router.navigate([`../`, { replaceUrl: true }])
        .then();
    }
  }

  /**
   * Set the currently selected check, showing the information panel.
   * @param check
   */
  private setSelectedCheck(
    check: ScorecardCheck | undefined
  ) {
    if (!check) {
      return;
    }

    const account = this.account;
    const repository = this.repository();

    if (!account || !repository) {
      return ;
    }

    const urlTree = this.router.createUrlTree([
      account.service,
      account.tag,
      repository.name,
      check.name
    ]);

    this.selectedScorecardCheck.set(check);
    this.scorecardCheckDetailsLoadState.set(LoadingState.LOADING);

    this.scorecardService.getCheckDetails(check)
      .pipe(
        tap(details => {
          this.scorecardCheckDetails.set(details);
          this.scorecardCheckDetailsLoadState.set(LoadingState.LOAD_SUCCESS);

          // Update the URL
          this.location.replaceState(this.router.serializeUrl(urlTree))
        }),
        take(1)
      )
      .subscribe();
  }
}
