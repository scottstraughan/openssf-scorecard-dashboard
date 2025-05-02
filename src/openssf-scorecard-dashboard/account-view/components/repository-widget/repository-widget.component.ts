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

import { ChangeDetectionStrategy, Component, input, OnDestroy, OnInit, signal, WritableSignal, } from '@angular/core';
import { RepositoryModel } from '../../../shared/models/repository.model';
import { ScoreRingComponent } from '../../../shared/components/score-ring/score-ring.component';
import { DatePipe } from '@angular/common';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { AccountModel } from '../../../shared/models/account.model';
import { ScorecardModel } from '../../../shared/models/scorecard.model';
import { PopupService } from '../../../shared/components/popup/popup.service';
import { ErrorPopupComponent } from '../../../shared/popups/error-popup/error-popup.component';
import { LoadingState } from '../../../shared/loading-state';
import { catchError, of, Subscription, take, tap } from 'rxjs';
import { AccountViewModelService } from '../../../shared/services/account-view-model.service';
import { Router } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { TruncatePipe } from '../../../shared/pipes/truncate.pipe';
import { LayoutView } from '../../views/repository-list-view/repository-list-view.component';

@Component({
  selector: 'ossfd-repository-widget',
  standalone: true,
  imports: [
    ScoreRingComponent,
    DatePipe,
    LoadingComponent,
    IconComponent,
    TruncatePipe
  ],
  templateUrl: './repository-widget.component.html',
  styleUrl: './repository-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RepositoryWidgetComponent implements OnInit, OnDestroy {
  protected readonly LayoutView = LayoutView;
  protected readonly LoadingState = LoadingState;

  readonly account = input.required<AccountModel>();
  readonly repository = input.required<RepositoryModel>();
  readonly layout = input<LayoutView>(LayoutView.GRID);

  protected readonly scorecard: WritableSignal<ScorecardModel | undefined> = signal(undefined);
  protected readonly loading: WritableSignal<LoadingState> = signal(LoadingState.LOADING);

  private scorecardSubscription: Subscription | undefined;

  /**
   * Constructor.
   */
  constructor(
    private popupService: PopupService,
    private selectedAccountService: AccountViewModelService,
    private router: Router
  ) { }

  /**
   * @inheritdoc
   */
  ngOnInit(): void {
    this.scorecardSubscription = this.selectedAccountService.observeScorecardRequestByRepository(this.repository())
      .pipe(
        tap(scorecardRequest => {
          this.scorecard.set(scorecardRequest.scorecard);
          this.loading.set(scorecardRequest.loadState);
        }),
        catchError(error => {
          this.scorecard.set(undefined);
          this.loading.set(LoadingState.LOAD_SUCCESS);
          return of(error);
        })
      )
      .subscribe();
  }

  /**
   * @inheritdoc
   */
  ngOnDestroy() {
    this.scorecardSubscription?.unsubscribe();
  }

  /**
   * Called when a user clicks on the main body of the repository view.
   */
  onClick() {
    if (this.scorecard()?.score) {
      this.router.navigate([`/${this.account().service}/${this.account().tag}/${this.repository().name}`])
        .then();
    } else {
      this.popupService.create(
        ErrorPopupComponent, {
          title: 'No Scorecard',
          message: 'This repository does not have any associated scorecard available.',
          icon: 'score'
        }, true);
    }
  }

  /**
   * Called when a user clicks the score ring to reload the score.
   */
  onReloadScore() {
    this.loading.set(LoadingState.LOADING);
    this.selectedAccountService.reloadScorecard(this.repository())
      .pipe(take(1))
      .subscribe();
  }
}
