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

import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ScoreRingComponent } from '../../../shared/components/score-ring/score-ring.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CheckComponent } from './components/check/check.component';
import { RepositoryModel } from '../../../shared/models/repository.model';
import { SelectedAccountService } from '../../../shared/services/selected-account.service';
import { catchError, of, take, tap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ScorecardModel } from '../../../shared/models/scorecard.model';
import { ScorecardCheckDetails, ScorecardService } from '../../../shared/services/scorecard.service';
import { LoadingState } from '../../../shared/LoadingState';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ErrorPopupError, ErrorPopupService } from '../../../shared/services/error-popup.service';
import { ScorecardCheck } from '../../../shared/models/scorecard-check.model';
import { FadedBgComponent } from '../../../shared/components/faded-bg/faded-bg.component';

@Component({
  selector: 'osd-scorecard-view',
  standalone: true,
  imports: [
    ScoreRingComponent,
    ButtonComponent,
    CheckComponent,
    DatePipe,
    LoadingComponent,
    FadedBgComponent
  ],
  templateUrl: './scorecard-view.component.html',
  styleUrl: './scorecard-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScorecardViewComponent implements OnInit {
  protected readonly LoadingState = LoadingState;
  protected readonly ScoreRingComponent = ScoreRingComponent;

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
   * @param selectedAccountService
   * @param activatedRoute
   * @param scorecardService
   * @param errorPopupService
   */
  constructor(
    protected router: Router,
    protected selectedAccountService: SelectedAccountService,
    protected activatedRoute: ActivatedRoute,
    protected scorecardService: ScorecardService,
    protected errorPopupService: ErrorPopupService
  ) { }

  /**
   * @inheritdoc
   */
  ngOnInit(): void {
    this.activatedRoute.params
      .pipe(
        tap(params => {
          this.selectedAccountService.account$
            .pipe(
              tap(account => {
                if (!account) {
                  this.handleFatalError('Account Not Found', 'The requested account was not found.')
                  return;
                }

                this.selectedAccountService.getRepository(params['repositoryName'])
                  .pipe(
                    tap(repository => {
                      this.repository.set(repository);

                      this.scorecardService.getScorecard(account, repository)
                        .pipe(
                          tap(scorecard => {
                            if (!scorecard) {
                              this.handleFatalError(
                                'Scorecard Not Found',
                                'There was a problem loading the scorecard associated with this repository.')
                            } else {
                              this.loading.set(LoadingState.LOAD_SUCCESS);
                              this.scorecard.set(scorecard);
                            }
                          }),
                          take(1)
                        )
                        .subscribe();
                    }),
                    take(1),
                    catchError(error => {
                      this.handleFatalError(
                        'Repository Not Found',
                        'The requested repository was not found.')

                      return of(error);
                    }),
                  )
                  .subscribe();
              }),
              take(1)
            )
            .subscribe();
        })
      )
      .subscribe();
  }

  /**
   * Handle a fatal error.
   * @param title
   * @param message
   * @param icon
   */
  handleFatalError(
    title: string,
    message: string,
    icon: string = 'error'
  ) {
    this.fatalError.set({title, message, icon});

    this.errorPopupService.showPopup(title, message, icon);

    this.router.navigate([`../`])
      .then();
  }

  /**
   * Called when a user clicks the back button.
   */
  onBackClicked() {
    this.router.navigate(['../'])
      .then();
  }

  /**
   * Called when the user clicks on the check.
   * @param check
   */
  onClicked(check: ScorecardCheck) {
    this.selectedScorecardCheck.set(check);
    this.scorecardCheckDetailsLoadState.set(LoadingState.LOADING);

    this.scorecardService.getCheckDetails(check)
      .pipe(
        tap(details => {
          this.scorecardCheckDetails.set(details);
          this.scorecardCheckDetailsLoadState.set(LoadingState.LOAD_SUCCESS);
        }),
        take(1)
      )
      .subscribe();
  }

  /**
   * Check if a check is selected.
   * @param check
   */
  isSelected(check: ScorecardCheck) {
    const selectedCheck = this.selectedScorecardCheck();

    if (!selectedCheck) {
      return false;
    }

    return selectedCheck.name == check.name;
  }

  /**
   * Called when a user wishes to close the scorecard check details.
   */
  onCloseDetails() {
    this.selectedScorecardCheck.set(undefined);
    this.scorecardCheckDetails.set(undefined);
  }

  /**
   * Get the priority color for the UI.
   * @param scorecardCheckDetails
   */
  getPriorityColor(scorecardCheckDetails: ScorecardCheckDetails) {
    return this.scorecardService.getPriorityColor(scorecardCheckDetails.check.priority);
  }
}
