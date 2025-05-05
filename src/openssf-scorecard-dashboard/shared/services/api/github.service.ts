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
import { catchError, map, Observable, Observer, of, Subject, switchMap, takeUntil, tap, throwError } from 'rxjs';
import { AccountModel } from '../../models/account.model';
import { BaseApiService, RepositoryCollection } from './base-api-service';
import { Service } from '../../enums/service';

@Injectable({
  providedIn: 'root'
})
export class GithubService extends BaseApiService {
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
        // Map result to account model
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

        // Throw a decent error
        catchError(error =>
          throwError(() => this.throwDecentError(Service.GITHUB, error)))
      );
  }

  /**
   * @inheritdoc
   */
  public getRepositories(
    account: AccountModel,
    cancelled$: Subject<void> = new Subject<void>()
  ): Observable<RepositoryCollection> {
    return this.fetchRepositories(account, cancelled$);
  }

  /**
   * Fetch repositories from GitHub for the provided account. Since the API returns pages of results, we need to fetch
   * each page until we have exhausted.
   * @param accountModel the account for the repositories to fetch
   * @param cancelled$ subject to use to cancel the requests
   */
  private fetchRepositories(
    accountModel: AccountModel,
    cancelled$: Subject<void>
  ): Observable<RepositoryCollection> {
    const loadState: RepositoryCollection = new RepositoryCollection();
    const loggingService = this.loggingService;

    /**
     * The GitHub repository API limits the number of repositories it will return per "page". Therefor, to load all the
     * repositories, we need to recursively fetch each page until exhaustion.
     * nothing more to fetch.
     */
    function fetchRepositoryPage(
      observer: Observer<any>,
      service: GithubService,
      accountModel: AccountModel,
      page: number = 1
    ): Observable<RepositoryCollection> {
      const url = `${GithubService.generateApiUrl(accountModel.tag)}/repos`;

      return service.getRequestInstance(
        `${url}?per_page=${GithubService.RESULTS_PER_PAGE}&page=${page}`, accountModel.apiToken)
        .pipe(
          tap(() =>
            loggingService.info(`Fetched repository page ${page} from GitHub API.`)),

          // Convert response
          map((result: any) =>
            result.map((repository: any) => {
              return {
                accountUrl: accountModel.url,
                name: repository['name'],
                url: repository['html_url'],
                lastUpdated: new Date(repository['updated_at']),
                stars: repository['stargazers_count'],
                description: repository['description'] ?? 'This repository has no description available.',
                archived: repository['archived']
              }
            })
          ),

          // Update load state
          map(repositories => {
            loadState.addRepositories(repositories);
            loadState.completed = repositories.length < GithubService.RESULTS_PER_PAGE;
            return loadState;
          }),

          // Notify observers of new updates
          tap(repositories =>
            observer.next(repositories)),

          // Capture any error that happens and then throw it
          catchError(error =>
            throwError(() => error)),

          // Continue to next page or return finally state
          switchMap(loadState =>
            loadState.completed
              ? of(loadState)
              : fetchRepositoryPage(observer, service, accountModel, page + 1)),
        )
    }

    return new Observable(observer => {
      this.getPublicRepositoryCount(accountModel)
        .pipe(
          // Set the max number of repos we can load, this will provide a load percentage
          tap(count =>
            loadState.totalRepositories = count),

          // Switch map to the repository fetching
          switchMap(() =>
            fetchRepositoryPage(observer, this, accountModel)
              .pipe(
                // Notify observers we have completed
                tap(loadState =>
                  loadState.completed && observer.complete())
              )
            ),

          // Handle any error and notify observer
          catchError(error => {
            observer.error(this.throwDecentError(Service.GITHUB, error));
            return of(error);
          }),

          // Stop loading if we are cancelled
          takeUntil(cancelled$)
        )
        // Subscribe
        .subscribe();
    });
  }

  /**
   * @inheritdoc
   */
  protected getPublicRepositoryCount(
    account: AccountModel
  ): Observable<number> {
    return this.getRequestInstance(GithubService.generateApiUrl(account.tag), account.apiToken)
      .pipe(
        map((result: any) =>
          Number(result['public_repos']))
      );
  }

  /**
   * Generate an API URL for an account.
   */
  private static generateApiUrl(
    accountName: string
  ): string {
    return `https://api.github.com/users/${accountName}`;
  }
}
