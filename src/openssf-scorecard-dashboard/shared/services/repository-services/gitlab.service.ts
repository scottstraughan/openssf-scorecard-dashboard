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
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import { RepositoryModel } from '../../models/repository.model';
import { AccountModel } from '../../models/account.model';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BaseRepositoryService } from './base-repository-service';
import { Service } from '../../enums/service';
import { RateLimitError } from '../../errors/service';
import { InvalidAccountError } from '../../errors/account';

@Injectable({
  providedIn: 'root'
})
export class GitlabService extends BaseRepositoryService {
  /**
   * @inheritdoc
   */
  public getAccount(
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel> {
    return this.getAccountViaGroups(accountName, apiToken)
      .pipe(
        catchError(() => {
          return this.getAccountViaUser(accountName, apiToken)
            .pipe(
              catchError(() => {
                throw new InvalidAccountError()
              })
            )
        })
      );
  }

  /**
   * Attempt to get an account using the groups API endpoint.
   * @param accountName
   * @param apiToken
   * @private
   */
  private getAccountViaGroups(
    accountName: string,
    apiToken?: string
  ) {
    const apiUrl = `${GitlabService.generateApiUrl(Method.GROUPS, accountName)}?with_projects=false`;

    return this.getRequestInstance(apiUrl, apiToken)
      .pipe(
        map((accountResult: any) => {
          return <AccountModel> {
            service: Service.GITLAB,
            tag: accountResult['path'],
            name: accountResult['name'] ? accountResult['name'] : accountName,
            icon: accountResult['avatar_url'] || '/assets/images/missing-avatar.png',
            description: accountResult['description'] || 'The group has no description available.',
            averageScore: 0,
            totalRepositories: 0,
            repositoriesWithScorecards: 0,
            followers: accountResult['followers'] || 0,
            url: accountResult['html_url'],
            apiToken: apiToken
          }
        }),
        switchMap(account =>
          this.injectTotalRepositoryCount(Method.GROUPS, account, apiToken))
      );
  }

  /**
   * Attempt to get an account using the users API endpoint.
   * @param accountName
   * @param apiToken
   * @private
   */
  private getAccountViaUser(
    accountName: string,
    apiToken?: string
  ) {
    return this.getRequestInstance(`https://gitlab.com/api/v4/users?username=${accountName}`, apiToken)
      .pipe(
        map((accountResult: any) => {
          return <AccountModel> {
            service: Service.GITLAB,
            tag: accountResult[0]['username'],
            name: accountResult[0]['name'] ? accountResult[0]['name'] : accountName,
            icon: accountResult[0]['avatar_url'] || '/assets/images/missing-avatar.png',
            description: accountResult[0]['description'] || 'The user has no description available.',
            averageScore: 0,
            totalRepositories: 0,
            repositoriesWithScorecards: 0,
            followers: 0,
            url: accountResult[0]['web_url'],
            apiToken: apiToken
          }
        }),
        switchMap(account =>
          this.injectTotalRepositoryCount(Method.USERS, account, apiToken))
      );
  }

  /**
   * Inject the total repository count for a given account.
   * @param method
   * @param account
   * @param apiToken
   * @private
   */
  private injectTotalRepositoryCount(
    method: Method,
    account: AccountModel,
    apiToken?: string
  ): Observable<AccountModel> {
    const apiUrl = `${GitlabService.generateApiUrl(method, account.tag)}/projects?with_projects=false`;

    return this.getRequestInstance(`${apiUrl}&per_page=${GitlabService.RESULTS_PER_PAGE}&page=1`, apiToken, 'response')
      .pipe(
        map((response: any) => {
          account.totalRepositories = response.headers.get('x-total-pages');
          return account;
        })
      )
  }

  /**
   * @inheritdoc
   */
  public getRepositories(
    account: AccountModel,
    apiToken?: string
  ): Observable<RepositoryModel[]> {
    return this.getAllRepositories(Method.GROUPS, account.tag, apiToken)
      .pipe(
        catchError(() =>
          this.getAllRepositories(Method.USERS, account.tag, apiToken))
      )
  }

  /**
   * Fetch all the repositories for a given account, going through each API request page until complete.
   * @param method
   * @param accountName
   * @param apiToken
   * @param page
   * @param repositories
   * @private
   */
  private getAllRepositories(
    method: Method = Method.GROUPS,
    accountName: string,
    apiToken?: string,
    page: number = 1,
    repositories: RepositoryModel[] = []
  ): Observable<RepositoryModel[]> {
    const apiUrl = GitlabService.generateApiUrl(method, accountName) + '/projects';
    let exhausted = false;

    return this.getRequestInstance(`${apiUrl}?per_page=${GitlabService.RESULTS_PER_PAGE}&page=${page}`, apiToken)
      .pipe(
        map((repositoriesResult: any) => {
          for (const repository of repositoriesResult) {
            repositories.push({
              name: repository['name'],
              url: repository['web_url'],
              lastUpdated: new Date(repository['last_activity_at']),
              stars: repository['star_count'],
              description: repository['description'] ?? 'This repository has no description available.',
              archived: repository['archived']
            });
          }

          exhausted = repositoriesResult.length < GitlabService.RESULTS_PER_PAGE;
          return repositories;
        }),
        switchMap(repositories =>
          exhausted ? of(repositories) : this.getAllRepositories(
            method, accountName, apiToken, page + 1, repositories)),
        catchError(error =>
          throwError(() => this.throwDecentError(error)))
      );
  }

  /**
   * Get a request instance, initialized with some defaults.
   * @param url
   * @param apiToken
   * @param observe
   */
  private getRequestInstance(
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
   * @param error
   * @private
   */
  private throwDecentError(error: HttpErrorResponse) {
    if (error.status == 429 || error.status == 403) {
      return new RateLimitError(
        'You have been throttled by GitLab. Please wait 30 minutes or add a different API key to the account.');
    } else if (error.status == 404) {
      return new InvalidAccountError(
        `No GitLab account with the provided name was found. Please recheck the account name.`);
    }

    return error;
  }

  /**
   * Generate an API URL.
   * @param method
   * @param accountName
   */
  private static generateApiUrl(
    method: Method,
    accountName: string
  ): string {
    return `https://gitlab.com/api/v4/${method.toString()}/${accountName}`;
  }
}

/**
 * Enum to keep things defined.9
 */
enum Method {
  GROUPS = 'groups',
  USERS = 'users'
}