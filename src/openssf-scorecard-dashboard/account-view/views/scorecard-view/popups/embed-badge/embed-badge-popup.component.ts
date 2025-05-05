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

import { ChangeDetectionStrategy, Component, computed, Inject, Signal, signal, WritableSignal } from '@angular/core';
import { LinkButtonComponent } from '../../../../../shared/components/link-button/link-button.component';
import { PopupReference } from '../../../../../shared/components/popup/popup.service';
import { RepositoryModel } from '../../../../../shared/models/repository.model';
import { NgOptimizedImage } from '@angular/common';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';

@Component({
  selector: 'ossfd-embed-badge-popup',
  standalone: true,
  templateUrl: './embed-badge-popup.component.html',
  imports: [
    LinkButtonComponent,
    NgOptimizedImage,
    IconComponent,
  ],
  styleUrls: [
    '../../../../../shared/popups/error-popup/error-popup.component.scss',
    './embed-badge-popup.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmbedBadgePopupComponent {
  /**
   * Signal that represents the repo url without any https:// prefix.
   * @protected
   */
  protected repoUrl: WritableSignal<string | undefined> = signal(undefined);

  /**
   * Represents the full badge URL.
   * @protected
   */
  protected badgeUrl: Signal<string>;

  /**
   * Constructor
   */
  constructor(
    @Inject('POPUP_DATA') private popupReference: PopupReference
  ) {
    const repository: RepositoryModel = popupReference.data;

    this.repoUrl.set(repository.url.replace('https://', ''));

    this.badgeUrl = computed(() =>
      `https://api.scorecard.dev/projects/${this.repoUrl()}/badge`);
  }

  /**
   * Called when the user presses the close button.
   */
  onClose() {
    this.popupReference.close();
  }
}
