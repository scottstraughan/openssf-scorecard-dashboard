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
import { BaseRepositoryService } from './base-repository-service';
import { Service } from '../../enums/service';
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
    return this.getAccountViaMethod(Method.GROUPS, accountName, apiToken)
      .pipe(
        catchError(() => {
          return this.getAccountViaMethod(Method.USERS, accountName, apiToken)
            .pipe(
              catchError(() => {
                throw new InvalidAccountError()
              })
            )
        })
      );
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
   * @inheritdoc
   */
  private getAccountViaMethod(
    method: Method,
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel> {
    return this.getRequestInstance(GitlabService.generateApiForAccount(method, accountName), apiToken)
      .pipe(
        // The user endpoint will return response in different format, modify it, so it matches group response
        map(response =>
          method == Method.USERS ? GitlabService.transmogrifyUserResponse(response) : response),
        // Convert the response into the account response
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
        // Inject the repository account number
        switchMap(account =>
          this.injectTotalRepositoryCount(method, account, apiToken))
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
    const apiUrl = `${GitlabService.generateApiUrl(method, account.tag)}/projects?with_projects=false&page=1`;

    return this.getRequestInstance(apiUrl, apiToken, 'response')
      .pipe(
        map((response: any) => {
          account.totalRepositories = response.headers.get('x-total-pages');
          return account;
        })
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
    method: Method,
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
          throwError(() => this.throwDecentError(Service.GITLAB, error)))
      );
  }

  /**
   * Modify a response from the user endpoint to match the groups endpoint.
   * @param response
   * @private
   */
  private static transmogrifyUserResponse(
    response: any
  ): any {
    response = response[0];
    response['path'] = response['username'];
    response['html_url'] = response['web_url'];

    return response;
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

  /**
   * Generate an API url for requesting account information.
   * @param method
   * @param accountName
   * @private
   */
  private static generateApiForAccount(
    method: Method,
    accountName: string
  ) {
    if (method == Method.USERS) {
      return `https://gitlab.com/api/v4/users?username=${accountName}`;
    }

    return `${GitlabService.generateApiUrl(Method.GROUPS, accountName)}?with_projects=false`;
  }
}

/**
 * Enum to keep things defined.9
 */
enum Method {
  GROUPS = 'groups',
  USERS = 'users'
}