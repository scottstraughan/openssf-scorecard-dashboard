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

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  HostBinding,
  input, signal,
  SkipSelf, WritableSignal
} from '@angular/core';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { NgClass, NgIf } from '@angular/common';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'osf-score-ring',
  standalone: true,
  templateUrl: './score-ring.component.html',
  imports: [
    NgCircleProgressModule,
    NgClass,
    NgIf
  ],
  styleUrl: './score-ring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('rotateAndFade', [
      state('blurred', style({ opacity: 0, transform: 'rotate(-180deg)' })),
      state('focused', style({ opacity: 1, transform: 'rotate(0deg)' })),
      transition('blurred => focused', [animate('0.2s')]),
      transition('focused => blurred', [animate('0.2s')]),
    ])
  ],
})
export class ScoreRingComponent {
  readonly hoverDelay: number = 200;
  readonly score = input.required<number>();
  readonly thickness = input<string>('5px');
  readonly fontSize = input<string>('1.5rem');

  protected timeout: number | undefined;

  @HostBinding('style.--progress')
  percentage: string = '0%';

  @HostBinding('style.--thickness')
  thicknessBinding: string = '5px';

  hover: WritableSignal<boolean> = signal(false);

  /**
   * Constructor.
   */
  constructor(
    @SkipSelf() protected cdRef: ChangeDetectorRef
  ) {
    effect(() => {
      this.percentage = Math.round(this.score() * 10) + '%';
      this.thicknessBinding = this.thickness();

      this.cdRef.detectChanges();
    });
  }

  /**
   * Get the color grade of the repository based on its score.
   * @param score
   */
  getColorVariableForScore(
    score?: number
  ) {
    return ScoreRingComponent.getColorVariableForScore(score);
  }

  /**
   * Called when a user hovers-enters the score ring with their mouse.
   */
  onMouseEnter() {
    // Set a timer that is invalided if the user hovers-outs
    this.timeout = setTimeout(() => {
      this.hover.set(true);
    }, this.hoverDelay);
  }

  /**
   * Called when a user hovers-out the score ring with their mouse.
   */
  onMouseLeave() {
    this.hover.set(false)
    clearTimeout(this.timeout);
    this.timeout = undefined;
  }

  /**
   * Get the color grade of the repository based on its score.
   * @param score
   */
  static getColorVariableForScore(
    score?: number
  ): string {
    if (!score) {
      return '';
    }

    if (score >= 0 && score < 2.5) {
      return 'var(--color-shocking)';
    } else if (score >= 2.5 && score < 5) {
      return 'var(--color-poor)';
    } else if (score >= 5 && score < 7) {
      return 'var(--color-good)';
    } else if (score >= 7 && score < 7.5) {
      return 'var(--color-verygood)';
    } else {
      return 'var(--color-excellent)';
    }
  }
}
