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

@Component({
  selector: 'osd-link-button',
  standalone: true,
  imports: [],
  templateUrl: './link-button.component.html',
  styleUrl: './link-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkButtonComponent {
  readonly icon = input<string | undefined>(undefined);
  readonly label = input<string | undefined>(undefined);

  readonly href = input<string | undefined>(undefined);
  readonly target = input<string | undefined>(undefined);
  readonly rel = input<string | undefined>(undefined);

  readonly disabled = input<boolean>(false);
  readonly active = input<boolean>(false);

  /**
   * Called when a user clicks the component.
   * @param $event
   */
  onClick($event: MouseEvent) {
    if (this.disabled()) {
      $event.stopPropagation();
      return ;
    }
  }
}
