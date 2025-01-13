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

import { Component, input, output } from '@angular/core';

@Component({
  selector: 'osd-button',
  standalone: true,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  readonly icon = input<string | undefined>(undefined);
  readonly label = input<string | undefined>(undefined);
  readonly disabled = input<boolean>(false);
  readonly active = input<boolean>(false);
  readonly clicked = output();

  /**
   * Called when a user clicks on the button.
   */
  onClick() {
    if (this.disabled()) {
      return ;
    }

    this.clicked.emit();
  }
}
