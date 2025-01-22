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

@Injectable({
  providedIn: 'root'
})
export class GithubService extends BaseRepositoryService {
  /**
   * @inheritdoc
   */
  public getAccount(
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel> {
    const apiUrl = `${GithubService.generateApiUrl(accountName)}`;

    return this.getRequestInstance(apiUrl, apiToken)
      .pipe(
        map((accountResult: any) => {
          return {
            service: Service.GITHUB,
            tag: accountResult['login'],
            name: accountResult['name'] ? accountResult['name'] : accountName,
            icon: accountResult['avatar_url'],
            description: accountResult['description']
              ?? accountResult['bio']
              ?? 'This account does not have a description.',
            averageScore: 0,
            totalRepositories: accountResult['public_repos'],
            repositoriesWithScorecards: 0,
            followers: accountResult['followers'],
            url: accountResult['html_url'],
            apiToken: apiToken
          }
        }),
        catchError(error =>
          throwError(() => this.throwDecentError(Service.GITHUB, error)))
      );
  }

  /**
   * @inheritdoc
   */
  public getRepositories(
    account: AccountModel,
    apiToken?: string
  ): Observable<RepositoryModel[]> {
    return this.getAllRepositories(account.tag, apiToken);
  }

  /**
   * Fetch all the repositories for a given account, going through each API request page until complete.
   * @param accountName
   * @param apiToken
   * @param page
   * @param repositories
   * @private
   */
  private getAllRepositories(
    accountName: string,
    apiToken?: string,
    page: number = 1,
    repositories: RepositoryModel[] = []
  ): Observable<RepositoryModel[]> {
    const apiUrl = `${GithubService.generateApiUrl(accountName)}/repos`;

    let exhausted = false;

    return this.getRequestInstance(`${apiUrl}?per_page=${GithubService.RESULTS_PER_PAGE}&page=${page}`, apiToken)
      .pipe(
        map((repositoriesResult: any) => {
          for (const repository of repositoriesResult) {
            repositories.push({
              name: repository['name'],
              url: repository['html_url'],
              lastUpdated: new Date(repository['updated_at']),
              stars: repository['stargazers_count'],
              description: repository['description'] ?? 'This repository has no description available.',
              archived: repository['archived']
            });
          }

          exhausted = repositoriesResult.length < GithubService.RESULTS_PER_PAGE;
          return repositories;
        }),
        switchMap(repositories =>
          exhausted ? of(repositories) : this.getAllRepositories(accountName, apiToken, page + 1, repositories)),
        catchError(error =>
          throwError(() => this.throwDecentError(Service.GITHUB, error)))
      );
  }

  /**
   * Generate an API URL.
   * @param accountName
   */
  private static generateApiUrl(
    accountName: string
  ): string {
    return `https://api.github.com/users/${accountName}`;
  }
}
