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
import { animate, state, style, transition, trigger } from '@angular/animations';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'ossfd-score-ring',
  standalone: true,
  templateUrl: './score-ring.component.html',
  styleUrl: './score-ring.component.scss',
  imports: [
    NgCircleProgressModule,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('revealOnHover', [
      state('blurred', style({ opacity: 0 })),
      state('focused', style({ opacity: 1 })),
      transition('blurred => focused', [animate('0.2s')]),
      transition('focused => blurred', [animate('0.2s')]),
    ])
  ],
})
export class ScoreRingComponent {
  readonly score = input.required<number>();
  readonly allowReload = input<boolean>(true);

  @HostBinding('style.--progress')
  protected percentage: string = '0%';

  @HostBinding('style.--cursor')
  protected cursor: string = 'default';

  protected readonly hover: WritableSignal<boolean> = signal(false);

  private readonly hoverDelay: number = 350;
  private timeout: any | undefined;

  /**
   * Constructor.
   */
  constructor(
    @SkipSelf() private cdRef: ChangeDetectorRef
  ) {
    effect(() => {
      this.percentage = Math.round(this.score() * 10) + '%';

      if (this.allowReload()) {
        this.cursor = 'pointer';
      }

      this.cdRef.detectChanges();
    });
  }

  /**
   * Get the color grade of the repository based on its score.
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
    if (!this.allowReload()) {
      return ;
    }

    // Set a timer that is invalided if the user hovers-outs
    this.timeout = setTimeout(() =>
      this.hover.set(true), this.hoverDelay);
  }

  /**
   * Called when a user hovers-out the score ring with their mouse.
   */
  onMouseLeave() {
    if (!this.allowReload())
      return ;

    this.hover.set(false)
    clearTimeout(this.timeout);
    this.timeout = undefined;
  }

  /**
   * Get the color grade of the repository based on its score.
   */
  static getColorVariableForScore(
    score?: number
  ): string {
    if (!score)
      return '';

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
