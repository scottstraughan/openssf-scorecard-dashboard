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
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingComponent } from '../shared/components/loading/loading.component';
import { Subscription } from 'rxjs';
import { AccountModel } from '../shared/models/account.model';

@Component({
  selector: 'ossfd-home-view',
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
   * @param activatedRoute
   * @param router
   */
  constructor(
    private serviceStoreService: AccountService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) { }

  /**
   * @inheritDoc
   */
  ngOnInit() {
    this.accountSubscription$ = this.serviceStoreService.observeAccounts()
      .subscribe(accounts => {
        if (accounts.length == 0) {
          this.router.navigate(
            [`/${AccountService.DEFAULT_ACCOUNT}`], { relativeTo: this.activatedRoute, replaceUrl: true })
            .then();

          return ;
        }

        return this.redirectToFirstAccount(accounts);
      });
  }

  /**
   * @inheritDoc
   */
  ngOnDestroy(): void {
    this.accountSubscription$?.unsubscribe();
  }

  /**
   * Redirect a user to the first account.
   * @param accounts
   * @private
   */
  private redirectToFirstAccount(
    accounts: AccountModel[]
  ) {
    this.accountSubscription$?.unsubscribe();

    if (accounts.length > 0) {
      const firstAccount = accounts[0];

      this.router.navigate(
        [`/${firstAccount.service}/${firstAccount.tag}`], { relativeTo: this.activatedRoute, replaceUrl: true })
        .then();
    }
  }
}
