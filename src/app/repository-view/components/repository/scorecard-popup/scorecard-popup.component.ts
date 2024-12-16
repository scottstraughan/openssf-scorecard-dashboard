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

import { ChangeDetectionStrategy, Component, Inject, signal, WritableSignal } from '@angular/core';
import { ScoreRingComponent } from '../../../../shared/components/score-ring/score-ring.component';
import { CheckComponent } from './components/check/check.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DatePipe, NgClass } from '@angular/common';
import { RepositoryModel } from '../../../../shared/models/repository.model';
import { PopupReference } from '../../../../shared/components/popup/popup.service';

import { ScorecardCheck } from '../../../../shared/models/scorecard-check.model';

@Component({
  selector: 'app-scorecard-view',
  standalone: true,
  imports: [
    ScoreRingComponent,
    CheckComponent,
    ButtonComponent,
    NgClass,
    DatePipe
  ],
  templateUrl: './scorecard-popup.component.html',
  styleUrl: './scorecard-popup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScorecardPopupComponent {
  /**
   * The repository this scorecard is for.
   */
  repository: WritableSignal<RepositoryModel | undefined> = signal(undefined);

  /**
   * Constructor
   * @param popupReference
   */
  constructor(
    @Inject('POPUP_DATA') protected popupReference: PopupReference
  ) {
    this.repository = popupReference.data;
  }

  /**
   * Get the background color, based on the result score, for the UI.
   */
  getScoreBackgroundColor() {
    const repository = this.repository();

    if (!repository || !repository.scorecard) {
      return '';
    }

    return ScoreRingComponent.getColorVariableForScore(repository.scorecard.score);
  }
}