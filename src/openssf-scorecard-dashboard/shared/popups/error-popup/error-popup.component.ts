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
import { PopupReference } from '../../components/popup/popup.service';
import { LinkButtonComponent } from '../../components/link-button/link-button.component';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../components/icon/icon.component';


@Component({
  selector: 'ossfd-error-popup',
  standalone: true,
  templateUrl: './error-popup.component.html',
  imports: [
    LinkButtonComponent,
    FormsModule,
    IconComponent
  ],
  styleUrls: [
    './error-popup.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorPopupComponent {
  title: WritableSignal<string> = signal('');
  message: WritableSignal<string> = signal('');
  icon: WritableSignal<string> = signal('error');

  /**
   * Constructor
   * @param popupReference
   */
  constructor(
    @Inject('POPUP_DATA') protected popupReference: PopupReference
  ) {
    this.title.set(popupReference.data['title']);
    this.message.set(popupReference.data['message']);

    if (popupReference.data['icon']) {
      this.icon.set(popupReference.data['icon']);
    }
  }

  /**
   * Called when the user presses the close button.
   */
  onClose() {
    this.popupReference.close();
  }
}
