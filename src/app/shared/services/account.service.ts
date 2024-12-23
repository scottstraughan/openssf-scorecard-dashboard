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
import { BehaviorSubject, Observable, of, take, tap } from 'rxjs';
import { GithubService } from './repository-services/github.service';
import { RepositoryModel } from '../models/repository.model';
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';

export enum Service {
  GITHUB = 'github',
  GITLAB = 'gitlab'
}

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
    this.load();
  }

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

  getRepositories(
    account: AccountModel
  ): Observable<RepositoryModel[]> {
    const storageKey = AccountService.createRepositoryStorageKey(account);

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

  private fetchAccount(
    service: Service,
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel> {
    switch (service) {
      case Service.GITHUB:
        return this.githubAccountService.getAccount(accountName, apiToken)
    }

    throw new ServiceNotSupportedError();
  }

  private setAccounts(
    accounts: AccountModel[]
  ) {
    for (const account of accounts) {
      this.accounts.set(
        AccountService.createAccountMapKey(account.service, account.account), account);
    }

    this.updateObservers();
    this.save();
  }

  private updateObservers() {
    this.accounts$.next(Array.from(this.accounts.values()));
  }

  private load() {
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

  private save() {
    this.storageService.set(AccountService.STORAGE_KEY, Array.from(this.accounts.values()));
  }

  private static createAccountMapKey(
    service: Service,
    accountName: string
  ): string {
    return service.toString() + '-' + accountName;
  }

  private static createRepositoryStorageKey(
    account: AccountModel
  ): string {
    return 'osf-repositories-' + account.service + '-' + account.account;
  }
}

export class DuplicateAccountError extends Error {}
export class MinimumAccountError extends Error {}
export class ServiceNotSupportedError extends Error {}
