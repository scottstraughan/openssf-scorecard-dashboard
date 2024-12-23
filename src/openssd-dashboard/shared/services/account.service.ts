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

import { Inject, Injectable } from '@angular/core';
import { AccountModel } from '../models/account.model';
import { BehaviorSubject, catchError, Observable, Observer, of, take, tap, throwError } from 'rxjs';
import { GithubService } from './repository-services/github.service';
import { RepositoryModel } from '../models/repository.model';
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';
import { DuplicateAccountError, MinimumAccountError, ServiceNotSupportedError } from '../errors/account';
import { Service } from '../enums/service';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  static readonly STORAGE_KEY = 'osf-accounts';
  static readonly DEFAULT_ACCOUNTS: any[] = [
    {
      service: Service.GITHUB,
      account: 'scottstraughan'
    }
  ];

  readonly accounts$: BehaviorSubject<AccountModel[]> = new BehaviorSubject<AccountModel[]>([]);
  private accounts: Map<string, AccountModel> = new Map();

  /**
   * Constructor
   * @param storageService
   * @param githubAccountService
   */
  constructor(
    @Inject(LOCAL_STORAGE) private storageService: StorageService,
    private githubAccountService: GithubService
  ) {
    if (this.storageService.has(AccountService.STORAGE_KEY)) {
      try {
        this.setAccounts(this.storageService.get(AccountService.STORAGE_KEY));
      } catch (error) { }
    }

    if (this.accounts.size == 0) {
      for (const defaultAccount of AccountService.DEFAULT_ACCOUNTS) {
        this.add(defaultAccount.service, defaultAccount.account)
          .pipe(take(1))
          .subscribe();
      }
    }
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
      this.storageService.remove(storageKey);
    }

    const repositories = this.storageService.get(storageKey);

    if (repositories) {
      return of(repositories);
    }

    switch (account.service) {
      case Service.GITHUB:
        return this.githubAccountService.getRepositories(account)
          .pipe(
            tap(repositories => this.storageService.set(storageKey, repositories))
          );
    }

    throw Error('Unsupported account service type.');
  }

  /**
   * Add a new account.
   * @param service
   * @param accountName
   * @param apiToken
   */
  add(
    service: Service,
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel> {
    return this.fetchAccount(service, accountName, apiToken)
      .pipe(
        tap(account => {
          if (this.accounts.has(AccountService.createAccountMapKey(service, accountName))) {
            throw new DuplicateAccountError();
          }

          this.setAccounts([account]);
        })
      )
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

    this.storageService.remove(AccountService.createRepositoryStorageKey(account));
    this.accounts.delete(AccountService.createAccountMapKey(account.service, account.account));
    this.setAccounts(Array.from(this.accounts.values()));
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
                return throwError(() => error);
              })
            )
            .subscribe();
      }
      
      throw new ServiceNotSupportedError(`The service ${service} is not currently supported, check back soon!`);
    });
  }

  /**
   * Set the accounts, notifying any observers of changes.
   * @param accounts
   * @private
   */
  private setAccounts(
    accounts: AccountModel[]
  ) {
    for (const account of accounts) {
      this.accounts.set(
        AccountService.createAccountMapKey(account.service, account.account), account);
    }

    this.accounts$.next(Array.from(this.accounts.values()));

    this.storageService.set(AccountService.STORAGE_KEY, Array.from(this.accounts.values()));
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
    return 'osf-repositories-' + account.service + '-' + account.account;
  }
}

