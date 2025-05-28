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

import { Injectable } from '@angular/core';
import { AccountModel } from '../../models/account.model';
import { BehaviorSubject, filter, Observable, of, switchMap, take, tap, throwError, } from 'rxjs';
import { GithubService } from '../api/github.service';
import { MinimumAccountError } from '../../errors/account';
import { Service } from '../../enums/service';
import { ServiceNotSupportedError } from '../../errors/service';
import { GitlabService } from '../api/gitlab.service';
import { CacheService } from '../storage/cache.service';
import { RepositoryService } from './repository.service';
import { InitializableService } from './initializable-service';
import { LoggingService } from '../logging.service';

@Injectable({
  providedIn: 'root'
})
export class AccountService extends InitializableService {
  /**
   * Cache table name.
   * @private
   */
  private static readonly CACHE_TABLE_NAME = 'accounts';

  /**
   * Accounts observable.
   * @private
   */
  private accounts$: BehaviorSubject<AccountModel[]> = new BehaviorSubject<AccountModel[]>([]);

  /**
   * Constructor
   */
  constructor(
    private githubAccountService: GithubService,
    private gitlabAccountService: GitlabService,
    private cacheService: CacheService,
    private repositoryService: RepositoryService,
    private loggingService: LoggingService
  ) {
    super();

    // Initialize the account service
    this.initialize()
      .pipe(take(1))
      .subscribe()
  }

  /**
   * Get the accounts observable.
   */
  observeAccounts(): Observable<AccountModel[]> {
    return this.accounts$.asObservable()
      .pipe(
        filter(accounts =>
          accounts.length > 0)
      );
  }

  /**
   * Get an account either from storage or requested from the backend service.
   */
  getAccount(
    service: any,
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel> {
    // Check if the service is supported or not
    if (!Object.values(Service).includes(service.toString()))
      return throwError(() => new ServiceNotSupportedError());

    const accountKey = AccountService.createAccountMapKey(service, accountName);

    return this.whenReady()
      .pipe(
        // Attempt to load account from cache
        switchMap(() =>
          this.cacheService.getByKey<AccountModel>(AccountService.CACHE_TABLE_NAME, accountKey)),

        // Handle if an account exists or not
        switchMap(cached => {
          return cached
            ? of(cached.value)
            : this.add(service, accountName, apiToken);
        })
      );
  }

  /**
   * Add a new account. If the account exists in cache then that will be returned. Otherwise, a new request to the
   * API service will occur and the result then cached.
   */
  add(
    service: Service,
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel> {
    const accountKey = AccountService.createAccountMapKey(service, accountName);

    let serviceObservable = null;

    if (service == Service.GITLAB) {
      serviceObservable = this.gitlabAccountService;
    } else if (service == Service.GITHUB) {
      serviceObservable = this.githubAccountService;
    } else {
      throw new Error('Account service not supported.');
    }

    let accountResult: AccountModel;

    return serviceObservable
      .getAccount(accountName, apiToken)
      .pipe(
        // Cache the account result, so we can referer to it later
        tap(account =>
          accountResult = account),

        // Add account to cache
        switchMap(account =>
          this.cacheService.add<AccountModel>(AccountService.CACHE_TABLE_NAME, account, accountKey)
            .pipe(
              // Reload all the accounts
              switchMap(() =>
                this.reloadAccounts()),

              // Return the account
              switchMap(() =>
                of(accountResult))
            )
        )
      );
  }

  /**
   * Delete an account.
   */
  deleteCached(
    account: AccountModel
  ): Observable<any> {
    const accountKey = AccountService.createAccountMapKey(account.service, account.tag);

    return this.whenReady()
      .pipe(
        switchMap(() =>
          this.cacheService.getAll(AccountService.CACHE_TABLE_NAME)
            .pipe(
              // Ensure we are not deleting the last account
              tap(cached => {
                if (cached.length == 1)
                  throw new MinimumAccountError();
              }),

              // Delete any account repositories
              switchMap(() =>
                this.repositoryService.deleteCached(account)),

              // Delete the account
              switchMap(() =>
                this.cacheService.deleteItem(AccountService.CACHE_TABLE_NAME, accountKey)),

              // Reload the cache
              switchMap(() =>
                this.reloadAccounts())
            )
        )
      )
  }

  /**
   * Initialize the accounts for all observers.
   * @private
   */
  private initialize(): Observable<any> {
    return this.reloadAccounts(false)
      .pipe(
        // Notify any observers of updates to accounts
        tap(accounts =>
          this.accounts$.next(accounts)),

        // Set that we are now initialized
        tap(() =>
          this.setInitialized(true)),
      )
  }

  /**
   * Reload any cached accounts.
   * @private
   */
  private reloadAccounts(
    notifyObservers: boolean = true
  ): Observable<AccountModel[]> {
    return this.cacheService.getAll<AccountModel>(AccountService.CACHE_TABLE_NAME)
      .pipe(
        // If we have cache, return that or return an empty array
        switchMap(cached =>
          Array.isArray(cached)
            ? of(cached)
            : of([])),

        // Notify any observers if enabled
        tap(accounts => {
          if (notifyObservers) {
            this.loggingService.info('Notifying observers...');
            this.accounts$.next(accounts)
          }
        })
      );
  }

  /**
   * Create a new key for storing an account in a map.
   * @private
   */
  private static createAccountMapKey(
    service: Service,
    accountTag: string
  ): string {
    return service.toString() + '-' + accountTag;
  }
}
