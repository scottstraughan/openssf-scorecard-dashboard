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
import { InputComponent } from '../../components/search/input.component';
import { ButtonComponent } from '../../components/button/button.component';
import { FormsModule } from '@angular/forms';
import { InvalidAccountError, RateLimitError } from '../../services/repository-services/base-repository-service';
import { DuplicateAccountError, MinimumAccountError, ServiceNotSupportedError } from '../../errors/account';

@Component({
  selector: 'osf-error-popup',
  standalone: true,
  templateUrl: './error-popup.component.html',
  imports: [
    InputComponent,
    ButtonComponent,
    FormsModule
  ],
  styleUrls: [
    './error-popup.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorPopupComponent {
  title: WritableSignal<string> = signal('');
  message: WritableSignal<string> = signal('');
  icon: WritableSignal<string> = signal('warning');

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

  /**
   * Generate an error response for the UI.
   */
  static handleErrorThrown(
    error: any
  ) {
    let title = error.message;
    let message = error.message;
    let icon = 'error';

    if (error instanceof MinimumAccountError) {
      title = 'Cannot Remove Account';
      message = 'You must have at least one account to track. Please add another account if you wish to delete this one.';
    } else if (error instanceof RateLimitError) {
      title = 'Rate Limited';
      icon = 'speed';
    } else if (error instanceof InvalidAccountError) {
      title = 'Account Not Found';
      icon = 'person_search';
    } else if (error instanceof ServiceNotSupportedError) {
      title = 'Service Not Supported';
      icon = 'person_search';
    } else if (error instanceof DuplicateAccountError) {
      title = 'Account Already Exists';
      icon = 'person_search';
    }

    return {
      title: title, message: message, icon: icon
    };
  }
}
