/*---------------------------------------------------------------------------------------------
 *
 *  Copyright (C) Codeplay Software Ltd, Scott Straughan.
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

import { ChangeDetectionStrategy, Component, HostListener, Inject, signal, WritableSignal } from '@angular/core';
import { PopupReference, PopupService } from '../../shared/components/popup/popup.service';
import { InputComponent } from '../../shared/components/input/input.component';
import { LinkButtonComponent } from '../../shared/components/link-button/link-button.component';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../shared/services/account.service';
import { catchError, of, take, tap } from 'rxjs';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { Router } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { Service } from '../../shared/enums/service';
import { DuplicateAccountError } from '../../shared/errors/account';
import { ErrorPopupService } from '../../shared/services/error-popup.service';

@Component({
  selector: 'ossfd-watch-account-popup',
  standalone: true,
  templateUrl: './watch-account-popup.component.html',
  imports: [
    InputComponent,
    LinkButtonComponent,
    FormsModule,
    LoadingComponent,
    NgOptimizedImage
  ],
  styleUrls: [
    './watch-account-popup.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WatchAccountPopupComponent {
  readonly Service = Service;

  readonly service: WritableSignal<Service> = signal(Service.GITHUB);
  readonly accountName: WritableSignal<string> = signal('');
  readonly apiToken: WritableSignal<string | undefined> = signal(undefined);
  readonly loading: WritableSignal<boolean> = signal(false);

  /**
   * Constructor.
   * @param popupReference
   * @param accountService
   * @param popupService
   * @param errorPopupService
   * @param router
   */
  constructor(
    @Inject('POPUP_DATA') protected popupReference: PopupReference,
    protected accountService: AccountService,
    protected popupService: PopupService,
    protected errorPopupService: ErrorPopupService,
    protected router: Router
  ) { }

  /**
   * Called when the user presses enter, anywhere!
   */
  @HostListener('document:keydown.enter', ['$event'])
  onKeydownHandler() {
    if (!this.isServiceFormsValid()) {
      return;
    }

    this.onAdd();
  }

  /**
   * Determine if all the forms are valid.
   */
  isServiceFormsValid(): boolean {
    return this.accountName().length != 0;
  }

  /**
   * Called when a user clicks to add a new account to inspect.
   */
  onAdd() {
    if (!this.isServiceFormsValid()) {
      return ;
    }

    this.loading.set(true);

    this.accountService.add(this.service(), this.accountName(), this.apiToken())
      .pipe(
        tap((account) => {
          this.popupReference.close();
          this.loading.set(false);
          this.router.navigate([`/${account.service}/${account.tag}`, { replaceUrl: true }]).then();
        }),
        take(1),
        catchError((error) => {
          if (error instanceof DuplicateAccountError) {
            this.router.navigate([`/${this.service()}/${this.accountName()}`], { replaceUrl: true }).then();
            this.popupReference.close();
            return of();
          }

          this.errorPopupService.handleError(error);

          this.loading.set(false);
          return of();
        })
      )
      .subscribe();
  }

  /**
   * Called when the user clicks to close the popup.
   */
  onCloseClicked() {
    this.popupReference.close();
  }

  /**
   * Called when a user clicks the to change the service.
   */
  onChangeService(service: Service) {
    this.service.set(service);
  }
}
