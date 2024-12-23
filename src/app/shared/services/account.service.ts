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
import { BehaviorSubject, Observable, of } from 'rxjs';
import { GithubService } from './repository-services/github.service';
import { RepositoryModel } from '../models/repository.model';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  public accounts$: BehaviorSubject<AccountModel[]> = new BehaviorSubject<AccountModel[]>([]);

  constructor(
    private githubAccountService: GithubService
  ) {
    this.loadAccounts();
  }

  // TODO: Load form local storage here
  loadAccounts() {
    const accounts: AccountModel[] = [

    ];

    this.accounts$.next(accounts);
  }

  getAccount(
    service: Service,
    accountName: string
  ): Observable<AccountModel> {
    switch (service) {
      case Service.GITHUB:
        return this.githubAccountService.getAccount(accountName);
    }
  }

  getRepositories(
    accountModel: AccountModel
  ): Observable<RepositoryModel[]> {
    switch (accountModel.service) {
      case Service.GITHUB:
        return this.githubAccountService.getRepositories(accountModel);
    }
  }

  add(s: string, s2: string, apiToken1: string | undefined): Observable<AccountModel> {
    return of();
  }
}

export enum Service {
  GITHUB = 'github'
}

export class DuplicateAccountError extends Error {}
export class MinimumAccountError extends Error {}
