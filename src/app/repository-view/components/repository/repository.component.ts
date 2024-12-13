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

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RepositoryModel } from '../../../shared/models/repository.model';
import { ScoreRingComponent } from '../../../shared/components/score-ring/score-ring.component';
import { DatePipe, JsonPipe } from '@angular/common';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { AccountModel } from '../../../shared/models/account.model';
import { ScorecardModel } from '../../../shared/models/scorecard.model';
import { PopupService } from '../../../shared/components/popup/popup.service';
import { ScorecardPopupComponent } from './scorecard-popup/scorecard-popup.component';
import { ErrorPopupComponent } from '../../../shared/popups/error-popup/error-popup.component';

@Component({
  selector: 'osf-repository',
  standalone: true,
  imports: [
    ScoreRingComponent,
    DatePipe,
    LoadingComponent,
    JsonPipe
  ],
  templateUrl: './repository.component.html',
  styleUrl: './repository.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RepositoryComponent {
  readonly account = input.required<AccountModel>();
  readonly repository = input.required<RepositoryModel>();
  readonly scorecard = input<ScorecardModel>();
  readonly onReloadScorecard = output();

  /**
   * Constructor.
   * @param popupService
   */
  constructor(
    protected popupService: PopupService
  ) { }

  /**
   * Called when a user clicks on the main body of the repository view.
   */
  onClick() {
    if (this.scorecard()?.score) {
      this.popupService.create(
        ScorecardPopupComponent, this.repository, true);
    } else {
      this.popupService.create(
        ErrorPopupComponent, {
          title: 'No Scorecard',
          message: 'This repository does not have any associated scorecard available.',
        }, true);
    }
  }
}
