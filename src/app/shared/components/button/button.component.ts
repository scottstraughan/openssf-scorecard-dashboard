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

import { Component, HostListener, input, output } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'osf-button',
  standalone: true,
  imports: [
    NgClass
  ],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  icon = input<string | undefined>(undefined);
  label = input<string | undefined>(undefined);
  disabled = input<boolean>(false);
  onClicked = output();

  @HostListener('click')
  onClick() {
    if (this.disabled()) {
      return ;
    }

    this.onClicked.emit();
  }
}
