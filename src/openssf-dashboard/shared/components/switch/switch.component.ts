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

import { ChangeDetectionStrategy, Component, HostListener, input, model } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'osd-switch',
  standalone: true,
  templateUrl: './switch.component.html',
  styleUrl: './switch.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('activate', [
      state(
        'active',
        style({
          left: 'calc(0% + var(--osd-switch-internal-padding))'
        }),
      ),
      state(
        'inactive',
        style({
          left: 'calc(50% - var(--osd-switch-internal-padding))'
        }),
      ),
      transition('* => *', [animate('.2s')]),
    ])
  ]
})
export class SwitchComponent {
  readonly active = model.required<boolean>();
  readonly iconActive = input<string>('light_mode');
  readonly iconInactive = input<string>('dark_mode');

  /**
   * Called when a user clicks anywhere on the component.
   */
  @HostListener('click', ['$event'])
  onComponentClick() {
    this.active.set(!this.active());
  }
}
