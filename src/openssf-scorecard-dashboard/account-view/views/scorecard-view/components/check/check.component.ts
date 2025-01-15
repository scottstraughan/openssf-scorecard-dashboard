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

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ScoreRingComponent } from '../../../../../shared/components/score-ring/score-ring.component';
import { ScorecardCheck } from '../../../../../shared/models/scorecard-check.model';
import { FadedBgComponent } from '../../../../../shared/components/faded-bg/faded-bg.component';
import { ScorecardService } from '../../../../../shared/services/scorecard.service';

@Component({
  selector: 'osd-scorecard-check',
  standalone: true,
  imports: [
    ScoreRingComponent,
    FadedBgComponent
  ],
  templateUrl: './check.component.html',
  styleUrl: './check.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckComponent {
  readonly check = input.required<ScorecardCheck>();
  readonly selected = input<boolean>();

  /**
   * Constructor.
   * @param scorecardService
   */
  constructor(
    protected scorecardService: ScorecardService
  ) { }

  /**
   * Get priority color.
   * @param check
   * @param showOnlyOnSelected
   */
  getPriorityColor(
    check: ScorecardCheck,
    showOnlyOnSelected: boolean = true
  ) {
    if (showOnlyOnSelected || this.selected()) {
      return this.scorecardService.getPriorityColor(check.priority);
    }

    return '';
  }
}
