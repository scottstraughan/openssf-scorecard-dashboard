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

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { AccountService } from '../shared/services/account.service';
import { Router } from '@angular/router';
import { LoadingComponent } from '../shared/components/loading/loading.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'osd-home-view',
  standalone: true,
  templateUrl: 'home-view.component.html',
  styleUrls: ['./home-view.component.scss'],
  imports: [
    LoadingComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeViewComponent implements OnInit, OnDestroy {
  /**
   * Holds a reference to the account subscription to ensure we can close it.
   */
  private accountSubscription$ : Subscription | undefined;

  /**
   * Constructor.
   * @param serviceStoreService
   * @param router
   */
  constructor(
    private serviceStoreService: AccountService,
    private router: Router
  ) { }

  /**
   * @inheritDoc
   */
  ngOnInit() {
    this.accountSubscription$ = this.serviceStoreService.observeAccounts()
      .subscribe((accounts) => {
        this.accountSubscription$?.unsubscribe();

        if (accounts.length > 0) {
          const firstAccount = accounts[0];

          this.router.navigate([`/${firstAccount.service}/${firstAccount.tag}`])
            .then();
        }
      });
  }

  /**
   * @inheritDoc
   */
  ngOnDestroy(): void {
    this.accountSubscription$?.unsubscribe();
  }
}
