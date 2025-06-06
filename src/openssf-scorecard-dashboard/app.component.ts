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
  Component,
  effect,
  Inject,
  Renderer2,
  signal,
  Signal,
  WritableSignal
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccountModel } from './shared/models/account.model';
import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { AccountService } from './shared/services/providers/account.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { PopupService } from './shared/components/popup/popup.service';
import { FollowAccountPopupComponent } from './popups/follow-account-popup/follow-account-popup.component';
import { AboutPopupComponent } from './popups/about-popup/about-popup.component';
import { DarkModeService } from './shared/services/dark-mode.service';
import { tap } from 'rxjs';
import { SwitchComponent } from './shared/components/switch/switch.component';
import { IconComponent } from './shared/components/icon/icon.component';

@Component({
  selector: 'ossfd-app',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLinkActive,
    RouterLink,
    NgOptimizedImage,
    SwitchComponent,
    IconComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  /**
   * A list of service accounts.
   */
  readonly serviceAccounts: Signal<AccountModel[]> = signal([]);

  /**
   * Signal used for dark mode enabling/disabling.
   */
  readonly darkMode: WritableSignal<boolean | undefined> = signal(undefined);

  /**
   * Constructor
   */
  constructor(
    private serviceStoreService: AccountService,
    private popupService: PopupService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private darkModeService: DarkModeService
  ) {
    this.serviceAccounts = toSignal(
      this.serviceStoreService.observeAccounts(), { initialValue: [] });

    this.darkModeService.observeDarkModeEnabled()
      .pipe(tap(darkModeEnabled => this.darkMode.set(darkModeEnabled)))
      .subscribe();

    effect(() => {
      this.renderer.addClass(
        this.document.body, this.darkMode() ? 'dark-mode' : 'light-mode');

      this.renderer.removeClass(
        this.document.body, this.darkMode() ? 'light-mode' : 'dark-mode');
    });
  }

  /**
   * Called when a user presses the add service button.
   */
  onAddServiceAccount() {
    this.popupService.create(FollowAccountPopupComponent, null, true);
  }

  /**
   * Called when a user presses the view about button.
   */
  onAboutClicked() {
    this.popupService.create(
      AboutPopupComponent, undefined, true);
  }

  /**
   * Toggle the dark mode.
   */
  onToggleDarkMode() {
    this.darkModeService.toggleDarkModeEnabled();
  }
}
