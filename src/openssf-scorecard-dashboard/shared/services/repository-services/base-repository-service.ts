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

import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AccountModel } from '../../models/account.model';
import { RepositoryModel } from '../../models/repository.model';
import { RateLimitError } from '../../errors/service';
import { InvalidAccountError } from '../../errors/account';
import { Service } from '../../enums/service';

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
   * Get a request instance, initialized with some defaults.
   * @param url
   * @param apiToken
   * @param observe
   */
  protected getRequestInstance(
    url: string,
    apiToken?: string,
    observe?: any
  ) {
    let headers: HttpHeaders = new HttpHeaders();

    if (apiToken) {
      headers = headers.set('Authorization', `Bearer ${apiToken}`);
    }

    if (!observe) {
      observe = 'body';
    }

    return this.httpClient.get(url, { responseType: 'json', headers: headers, observe: observe });
  }

  /**
   * Throw a more helpful error.
   * @param service
   * @param error
   * @private
   */
  protected throwDecentError(
    service: Service,
    error: HttpErrorResponse
  ) {
    if (error.status == 429 || error.status == 403) {
      return new RateLimitError(
        `You have been throttled by ${service}. Please wait 30 minutes or add a different API key to the account.`);
    } else if (error.status == 404) {
      return new InvalidAccountError(
        `No ${service} account with the provided name was found. Please recheck the account name.`);
    }

    return error;
  }

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
