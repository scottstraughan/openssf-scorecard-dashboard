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
import { AccountViewModelService } from '../../../shared/services/account-view-model.service';
import { catchError, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ScorecardModel } from '../../../shared/models/scorecard.model';
import { ScorecardService } from '../../../shared/services/providers/scorecard.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ErrorService } from '../../../shared/services/error.service';
import { ScorecardCheck } from '../../../shared/models/scorecard-check.model';
import { FadedBgComponent } from '../../../shared/components/faded-bg/faded-bg.component';
import { ScorecardCheckDetails } from '../../../shared/models/scorecard-check-details.model';
import { AccountModel } from '../../../shared/models/account.model';
import { ScorecardNotFoundError } from '../../../shared/errors/scorecard';
import { Title } from '@angular/platform-browser';
import { PopupService } from '../../../shared/components/popup/popup.service';
import { EmbedBadgePopupComponent } from './popups/embed-badge/embed-badge-popup.component';
import { LoadingState } from '../../../shared/loading-state';
import { RepositoryService } from '../../../shared/services/providers/repository.service';

@Component({
  selector: 'ossfd-scorecard-view',
  standalone: true,
  imports: [
    ScoreRingComponent,
    LinkButtonComponent,
    CheckComponent,
    DatePipe,
    LoadingComponent,
    FadedBgComponent
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

  protected readonly loading: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  protected readonly repository: WritableSignal<RepositoryModel | undefined> = signal(undefined);
  protected readonly scorecard: WritableSignal<ScorecardModel | undefined> = signal(undefined);

  protected readonly selectedScorecardCheck: WritableSignal<ScorecardCheck | undefined> = signal(undefined);
  protected readonly scorecardCheckDetailsLoadState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  protected readonly scorecardCheckDetails: WritableSignal<ScorecardCheckDetails | undefined> = signal(undefined);

  /**
   * Constructor.
   */
  constructor(
    private router: Router,
    private location: Location,
    private accountViewModelService: AccountViewModelService,
    private repositoryService: RepositoryService,
    private activatedRoute: ActivatedRoute,
    private scorecardService: ScorecardService,
    private errorService: ErrorService,
    private popupService: PopupService,
    private title: Title
  ) { }

  /**
   * @inheritdoc
   */
  ngOnInit(): void {
    this.activatedRoute.params
      .pipe(
        // Fetch all the required data
        switchMap(params =>
          this.accountViewModelService.observeAccount()
            .pipe(
              tap(account =>
                this.account = account),
              switchMap(account =>
                this.repositoryService.observeRepository(account, params['repositoryName'])
                  .pipe(
                    tap(repository =>
                      this.setRepository(account, repository)),
                    switchMap(repository =>
                      this.scorecardService.getScorecard(account, repository)
                        .pipe(tap(scorecard => this.setScorecard(scorecard, params['checkName'])))
                    )
                  )
              )
            )
        ),

        // Catch any error
        catchError(error =>
          this.errorService.handleError(error, true)),

        // Take until cleanup
        takeUntil(this.cleanup),
        take(1)
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
    this.router.navigate(['../'], { relativeTo: this.activatedRoute })
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
   */
  onClicked(
    check: ScorecardCheck
  ) {
    this.setSelectedCheck(check);
  }

  /**
   * Check if a check is selected.
   */
  isSelected(
    check: ScorecardCheck
  ) {
    return this.selectedScorecardCheck()?.name == check.name;
  }

  /**
   * Get the priority color for the UI.
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
   * @private
   */
  private setScorecard(
    scorecard: ScorecardModel | undefined,
    selectedCheckName: string | undefined
  ) {
    this.loading.set(LoadingState.LOAD_SUCCESS);
    this.scorecard.set(scorecard);

    if (!scorecard)
      throw new ScorecardNotFoundError();

    if (selectedCheckName) {
      try {
        this.setSelectedCheck(
          this.scorecardService.getCheckByName(selectedCheckName, scorecard));
      } catch (error: any) {
        this.errorService.handleError(error, false)
      }
    }
  }

  /**
   * Set the currently selected check, showing the information panel.
   * @private
   */
  private setSelectedCheck(
    check: ScorecardCheck | undefined
  ) {
    if (!check)
      return;

    const account = this.account;
    const repository = this.repository();

    if (!account || !repository)
      return ;

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
