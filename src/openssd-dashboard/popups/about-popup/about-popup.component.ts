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

import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { PopupReference } from '../../shared/components/popup/popup.service';
import { InputComponent } from '../../shared/components/search/input.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'osd-about-popup',
  standalone: true,
  templateUrl: './about-popup.component.html',
  imports: [
    InputComponent,
    ButtonComponent,
    FormsModule
  ],
  styleUrls: [
    '../../shared/popups/error-popup/error-popup.component.scss',
    './about-popup.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPopupComponent {
  /**
   * Constructor
   * @param popupReference
   */
  constructor(
    @Inject('POPUP_DATA') protected popupReference: PopupReference
  ) { }

  /**
   * Called when the user presses the close button.
   */
  onClose() {
    this.popupReference.close();
  }
}
