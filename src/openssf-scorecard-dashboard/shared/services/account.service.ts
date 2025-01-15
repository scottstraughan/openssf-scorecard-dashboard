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
import { AccountModel } from '../models/account.model';
import { BehaviorSubject, catchError, forkJoin, Observable, Observer, of, take, tap, } from 'rxjs';
import { GithubService } from './repository-services/github.service';
import { RepositoryModel } from '../models/repository.model';
import { MinimumAccountError } from '../errors/account';
import { Service } from '../enums/service';
import { ServiceNotSupportedError } from '../errors/service';
import { TransientStorage } from './transient-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  /**
   * Default accounts, for when nothing is stored.
   */
  static readonly DEFAULT_ACCOUNTS: any[] = [
    {
      service: Service.GITHUB,
      account: 'scottstraughan'
    }
  ];

  /**
   * Storage timeout for accounts.
   */
  static readonly STORAGE_ACCOUNT_TIMEOUT_IN_DAYS = 30;

  /**
   * Storage timeout for account repositories.
   */
  static readonly STORAGE_REPOSITORIES_TIMEOUT_IN_DAYS = 14;

  /**
   * Accounts observable.
   */
  private accounts$: BehaviorSubject<AccountModel[]> = new BehaviorSubject<AccountModel[]>([]);

  /**
   * Internal accounts map.
   * @private
   */
  private accounts: Map<string, AccountModel> = new Map();

  /**
   * Constructor
   * @param transientStorage
   * @param githubAccountService
   */
  constructor(
    private transientStorage: TransientStorage,
    private githubAccountService: GithubService
  ) {
    this.initializeAccounts()
      .pipe(
        tap(() => this.notifyObservers()),
        take(1),
      )
      .subscribe();
  }

  /**
   * Get the accounts observable.
   */
  observeAccounts(): Observable<AccountModel[]> {
    return this.accounts$.asObservable();
  }

  /**
   * Get an account either from storage or requested from the backend service.
   * @param service
   * @param accountName
   * @param apiToken
   */
  getAccount(
    service: Service,
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel> {
    const existingAccount = this.accounts.get(AccountService.createAccountMapKey(service, accountName));

    if (existingAccount) {
      return of(existingAccount);
    }

    return this.add(service, accountName, apiToken);
  }

  /**
   * Get repositories either from storage or requested from the backend service.
   * @param account
   * @param reload
   */
  getRepositories(
    account: AccountModel,
    reload: boolean = false
  ): Observable<RepositoryModel[]> {
    const storageKey = AccountService.createRepositoryStorageKey(account);

    if (reload) {
      this.transientStorage.remove(storageKey);
    }

    const repositories = this.transientStorage.get<RepositoryModel[]>(storageKey);

    if (repositories) {
      return of(repositories);
    }

    switch (account.service) {
      case Service.GITHUB:
        return this.githubAccountService.getRepositories(account)
          .pipe(
            tap(repositories => this.transientStorage.set<RepositoryModel[]>(
              storageKey, repositories, AccountService.STORAGE_REPOSITORIES_TIMEOUT_IN_DAYS))
          );
    }

    throw Error('Unsupported account service type.');
  }

  /**
   * Add a new account. If the account exists, it will just return it. If it doesn't exist, it will fetch it.
   * @param service
   * @param accountName
   * @param apiToken
   */
  add(
    service: Service,
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel> {
    if (this.accounts.has(AccountService.createAccountMapKey(service, accountName))) {
      return this.getAccount(service, accountName, apiToken);
    }

    return this.fetchAccount(service, accountName, apiToken)
      .pipe(tap(account => this.setAccounts([account])));
  }

  /**
   * Delete an account.
   * @param account
   */
  delete(
    account: AccountModel
  ) {
    if (this.accounts.size == 1) {
      throw new MinimumAccountError();
    }

    this.accounts.delete(AccountService.createAccountMapKey(account.service, account.tag));
    this.transientStorage.remove(AccountService.createRepositoryStorageKey(account));
    this.setAccounts(Array.from(this.accounts.values()));
  }

  /**
   * Initialize the accounts, will notify observers once initialization is completed.
   */
  private initializeAccounts(): Observable<any> {
    const cached = this.transientStorage.get<AccountModel[]>('accounts');

    if (Array.isArray(cached) && cached.length > 0) {
      this.setAccounts(cached, false);
      return of(undefined);
    }

    const defaultAccountsObservables = AccountService.DEFAULT_ACCOUNTS.map(
      defaultAccount => this.add(defaultAccount.service, defaultAccount.account)
        .pipe(catchError(() => of()))); // Skip any errors

    return forkJoin(defaultAccountsObservables)
      .pipe(tap(accounts => {
        this.setAccounts(accounts, false);
      }));
  }

  /**
   * Notify any observers to changes to the account list.
   * @private
   */
  private notifyObservers() {
    this.accounts$.next(Array.from(this.accounts.values()));
  }

  /**
   * Fetch an account from the backend service.
   * @param service
   * @param accountName
   * @param apiToken
   * @private
   */
  private fetchAccount(
    service: Service,
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel> {
    return new Observable((observer: Observer<AccountModel>) => {
      switch (service) {
        case Service.GITHUB:
          return this.githubAccountService.getAccount(accountName, apiToken)
            .pipe(
              tap(account => {
                observer.next(account);
                observer.complete();
              }),
              take(1),
              catchError(error => {
                observer.error(error);
                return of(error);
              })
            )
            .subscribe();
      }
      
      throw new ServiceNotSupportedError();
    });
  }

  /**
   * Set the accounts, notifying any observers of changes.
   * @param accounts
   * @param notifySubscribers
   * @private
   */
  private setAccounts(
    accounts: AccountModel[],
    notifySubscribers: boolean = true
  ) {
    for (const account of accounts) {
      this.accounts.set(
        AccountService.createAccountMapKey(account.service, account.tag), account);
    }

    if (notifySubscribers) {
      this.notifyObservers();
    }

    this.transientStorage.set<AccountModel[]>(
      'accounts', Array.from(this.accounts.values()), AccountService.STORAGE_ACCOUNT_TIMEOUT_IN_DAYS);
  }

  /**
   * Create a new key for storing an account in a map.
   * @param service
   * @param accountName
   * @private
   */
  private static createAccountMapKey(
    service: Service,
    accountName: string
  ): string {
    return service.toString() + '-' + accountName;
  }

  /**
   * Create a key for storing a value in the storage service.
   * @param account
   * @private
   */
  private static createRepositoryStorageKey(
    account: AccountModel
  ): string {
    return 'osf-repositories-' + account.service + '-' + account.tag;
  }
}

