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

import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AccountModel } from '../../models/account.model';
import { RepositoryModel } from '../../models/repository.model';

/**
 * Base repository service.
 */
export abstract class BaseRepositoryService {
  /**
   * The number of results to return per API request. Max is 100. Higher value means less requests.
   */
  static readonly RESULTS_PER_PAGE = 100;

  /**
   * Injected HttpClient, used for making API requests.
   * @protected
   */
  protected httpClient: HttpClient = inject(HttpClient);

  /**
   * Get the service details from the API backend.
   * @param accountName
   * @param apiToken
   */
  abstract getAccount(
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel>;

  /**
   * Get the repositories fromm the service backend.
   * @param account
   * @param apiToken
   */
  abstract getRepositories(
    account: AccountModel,
    apiToken?: string
  ): Observable<RepositoryModel[]>;
}

/**
 * Error that is thrown when the backend has rate limited the user.
 */
export class RateLimitError extends Error {}

/**
 * Error that is thrown when the backend has reported an invalid account.
 */
export class InvalidAccountError extends Error {}
