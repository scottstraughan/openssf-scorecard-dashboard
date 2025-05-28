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
import { Observable, Subject, take } from 'rxjs';
import { AccountModel } from '../../models/account.model';
import { RepositoryModel } from '../../models/repository.model';
import { RateLimitError } from '../../errors/service';
import { AccountNotFoundError, InvalidApiTokenError } from '../../errors/account';
import { Service } from '../../enums/service';
import { LoggingService } from '../logging.service';

/**
 * Base API service.
 */
export abstract class BaseApiService {
  /**
   * The number of results to return per API request. Max is 100. Higher value means less requests.
   * @protected
   */
  protected static readonly RESULTS_PER_PAGE = 100;

  /**
   * Injected HttpClient, used for making API requests.
   * @protected
   */
  protected httpClient: HttpClient = inject(HttpClient);

  /**
   * Service used for logging.
   * @protected
   */
  protected loggingService: LoggingService = inject(LoggingService);

  /**
   * Get a request instance, initialized with some defaults.
   * @param url the url to the given service
   * @param apiToken optional api token to pass as a bearer
   * @param observe what to observe from the request
   */
  protected getRequestInstance(
    url: string,
    apiToken?: string,
    observe: any = 'body'
  ): Observable<any> {
    let headers: HttpHeaders = new HttpHeaders();

    if (apiToken) {
      headers = headers.set('Authorization', `Bearer ${apiToken}`);
    }

    return this.httpClient.get(url, { responseType: 'json', headers: headers, observe: observe })
      .pipe(take(1));
  }

  /**
   * Throw a more helpful error.
   * @param service the service
   * @param error the error the service has thrown
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
      return new AccountNotFoundError(
        `No ${service} account with the provided name was found. Please recheck the account name.`);
    } else if (error.status == 401) {
      return new InvalidApiTokenError(
        `The ${service} service has stated that the API token you have provided is invalid.`);
    }

    return error;
  }

  /**
   * Get the service details from the API backend.
   * @param accountName the name of the account on the given service
   * @param apiToken optional the api token to use when making the request
   */
  abstract getAccount(
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel>;

  /**
   * Get the repositories fromm the service backend.
   * @param account the account that the repositories belong to
   * @param cancelled$ call when you wish to cancel observation
   */
  abstract getRepositories(
    account: AccountModel,
    cancelled$: Subject<void>
  ): Observable<RepositoryCollection>;
}

/**
 * Since an account could contain a huge number of repositories, and we have to fetch them for multiple requests, we
 * would want to provide feedback to the user that something is happening and progressing. This class allows a target
 * repository count to be set and a method to add more repositories to the array. It also a working percentage of the
 * current progress.
 */
export class RepositoryCollection {
  public repositoriesMap: Map<string, RepositoryModel> = new Map();

  /**
   * Constructor.
   */
  constructor(
    public totalRepositories: number = 0,
    repositories: RepositoryModel[] = [],
    public completed: boolean = false,
    public loadedRepositoryCount: number = 0
  ) {
    this.addRepositories(repositories);
  }

  /**
   * Add more repositories to the repository map.
   */
  addRepositories(
    repositories: RepositoryModel[]
  ) {
    for (const repository of repositories) {
      this.repositoriesMap.set(repository.name, repository);
    }

    this.loadedRepositoryCount = this.repositoriesMap.size;
  }

  /**
   * Get all the repositories as an array.
   */
  getRepositoriesAsArray(): RepositoryModel[] {
    if (this.repositoriesMap.size == 0) {
      return [];
    }

    return Array.from(this.repositoriesMap.values());
  }

  /**
   * Get the current percentage of the repositories that we have loaded to what is available.
   */
  loadPercentage(): number {
    if (this.totalRepositories == 0 || this.repositoriesMap.size == 0)
      return 0;

    return Math.round((this.repositoriesMap.size / this.totalRepositories) * 100);
  }

  /**
   * Convert from a complete array of RepositoryModel, into a completed RepositoryCollection.
   */
  static createFromRepositories(
    repositories: RepositoryModel[]
  ) {
    return new RepositoryCollection(
      repositories.length, repositories, true, repositories.length);
  }
}
