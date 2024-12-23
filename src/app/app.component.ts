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

import { Component, signal, Signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccountModel } from './shared/models/account.model';
import { NgClass, NgOptimizedImage } from '@angular/common';
import { AccountService } from './shared/services/account.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { PopupService } from './shared/components/popup/popup.service';
import { AddAccountPopupComponent } from './popups/add-account-popup/add-account-popup.component';
import { AboutPopupComponent } from './popups/about-popup/about-popup.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgClass, RouterLinkActive, RouterLink, NgOptimizedImage],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  /**
   * A list of service accounts.
   */
  readonly serviceAccounts: Signal<AccountModel[]> = signal([]);

  /**
   * Constructor
   * @param serviceStoreService
   * @param popupService
   */
  constructor(
    protected serviceStoreService: AccountService,
    protected popupService: PopupService
  ) {
    this.serviceAccounts = toSignal(
      this.serviceStoreService.accounts$, { initialValue: [] });
  }

  /**
   * Called when a user presses the add service button.
   */
  onAddServiceAccount() {
    this.popupService.create(AddAccountPopupComponent, null, true);
  }

  /**
   * Called when a user presses the view about button.
   */
  onAboutClicked() {
    this.popupService.create(
      AboutPopupComponent, undefined, true);
  }
}
