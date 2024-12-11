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
import { PopupReference } from '../shared/components/popup/popup.service';
import { SearchComponent } from '../shared/components/search/search.component';
import { ButtonComponent } from '../shared/components/button/button.component';
import { FormsModule } from '@angular/forms';
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';

@Component({
  selector: 'osf-add-security-key-popup',
  standalone: true,
  templateUrl: './add-security-key-popup.component.html',
  imports: [
    SearchComponent,
    ButtonComponent,
    FormsModule
  ],
  styleUrls: [
    './add-security-key-popup.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddSecurityKeyPopupComponent {
  readonly apiService: WritableSignal<string | undefined> = signal('github');
  readonly apiToken: WritableSignal<string> = signal('');

  /**
   * Constructor.
   * @param popupReference
   * @param storageService
   */
  constructor(
    @Inject('POPUP_DATA') protected popupReference: PopupReference,
    @Inject(LOCAL_STORAGE) private storageService: StorageService
  ) { }

  /**
   * Called when a user presses the save token button.
   */
  onSaveToken() {
    const store: ApiTokenStore = {};

    if (this.apiService() == 'github') {
      store.github = this.apiToken();
    } else if (this.apiService() == 'gitlab') {
      store.gitlab = this.apiToken();
    }

    this.storageService.set('apiToken',  store);
    console.log('API Token saved.');
    this.popupReference.close();
  }

  onSelectService(service: string) {
    this.apiService.set(service);
  }
}

export interface ApiTokenStore {
  github?: string;
  gitlab?: string;
}