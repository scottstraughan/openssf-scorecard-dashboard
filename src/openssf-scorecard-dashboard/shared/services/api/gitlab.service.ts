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
import { HttpResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GitlabService extends BaseApiService {
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
              catchError(error =>
                throwError(() =>
                  this.throwDecentError(Service.GITLAB, error)))
            )
        })
      );
  }

  /**
   * @inheritdoc
   */
  public getRepositories(
    account: AccountModel,
    cancelled$: Subject<void>
  ): Observable<RepositoryCollection> {
    return this.fetchRepositories(Method.GROUPS, account, cancelled$)
      .pipe(
        catchError(() =>
          this.fetchRepositories(Method.USERS, account, cancelled$))
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
   * Fetch repositories from GitLab for the provided account. Since the API returns pages of results, we need to fetch
   * each page until we have exhausted.
   * @param apiMethod what API method to use
   * @param accountModel the account for the repositories to fetch
   * @param cancelled$ subject to use to cancel the requests
   */
  private fetchRepositories(
    apiMethod: Method,
    accountModel: AccountModel,
    cancelled$: Subject<void>
  ): Observable<RepositoryCollection> {
    const loadState: RepositoryCollection = new RepositoryCollection();
    const loggingService = this.loggingService;
    const apiUrl = GitlabService.generateApiUrl(apiMethod, accountModel.tag) + '/projects';

    /**
     * The GitLab repository API limits the number of repositories it will return per "page". Therefor, to load all the
     * repositories, we need to recursively fetch each page until exhaustion.
     * nothing more to fetch.
     */
    function fetchRepositoryPage(
      observer: Observer<any>,
      service: GitlabService,
      accountModel: AccountModel,
      page: number = 1
    ): Observable<RepositoryCollection> {
      return service.getRequestInstance(
        `${apiUrl}?per_page=${GitlabService.RESULTS_PER_PAGE}&page=${page}`, accountModel.apiToken, 'response')
        .pipe(
          tap(() =>
            loggingService.info(`Fetched repository page ${page} from GitLab API.`)),

          // Set the total number of repos we can fetch
          tap((response: HttpResponse<any>) =>
            loadState.totalRepositories = Number.parseInt(response.headers.get('x-total') || '0')),

          // Convert response
          map((result: HttpResponse<any>) =>
            result.body.map((repository: any) => {
              return {
                name: repository['name'],
                url: repository['web_url'],
                lastUpdated: new Date(repository['last_activity_at']),
                stars: repository['star_count'],
                description: repository['description'] ?? 'This repository has no description available.',
                archived: repository['archived'],
              }
            })
          ),

          // Update load state
          map(repositories => {
            loadState.addRepositories(repositories);
            loadState.completed = repositories.length < GitlabService.RESULTS_PER_PAGE;
            return loadState;
          }),

          // Notify observers of new updates
          tap(repositories =>
            observer.next(repositories)),

          // Capture any error that happens and then throw it
          catchError(error => {
            return throwError(() => error);
          }),

          // Continue to next page or return finally state
          switchMap(loadState =>
            loadState.completed
              ? of(loadState)
              : fetchRepositoryPage(observer, service, accountModel, page + 1)),
        )
    }

    return new Observable(observer => {
      fetchRepositoryPage(observer, this, accountModel)
        .pipe(
          // Notify observers we have completed
          tap(loadState =>
            loadState.completed && observer.complete()),

          // Handle any error and notify observer
          catchError(error => {
            observer.error(this.throwDecentError(Service.GITLAB, error));
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
   * Modify a response from the user endpoint to match the groups' endpoint.
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
   */
  private static generateApiUrl(
    method: Method,
    accountName: string
  ): string {
    return `https://gitlab.com/api/v4/${method.toString()}/${accountName}`;
  }

  /**
   * Generate an API url for requesting account information.
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
