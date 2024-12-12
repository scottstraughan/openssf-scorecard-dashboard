import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import { RepositoryModel } from '../../models/repository.model';
import { ServiceAccountModel } from '../../models/service-account.model';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ServiceStoreService } from '../service-store.service';
import { BaseRepositoryService, InvalidAccountError, RateLimitError } from './base-repository-service';

@Injectable({
  providedIn: 'root'
})
export class GithubService extends BaseRepositoryService {
  /**
   * @inheritdoc
   */
  public getServiceDetails(
    accountName: string,
    apiToken?: string
  ): Observable<ServiceAccountModel> {
    const apiUrl = `${GithubService.generateApiUrl(accountName)}`;

    return this.getRequestInstance(apiUrl, apiToken)
      .pipe(
        map((accountResult: any) => {
          return {
            id: ServiceStoreService.generateUniqueId('github', accountResult['login']),
            service: 'github',
            account: accountResult['login'],
            name: accountResult['name'] ? accountResult['name'] : accountName,
            icon: accountResult['avatar_url'],
            description: accountResult['description'] ? accountResult['description'] : 'This account does not have a description.',
            averageScore: 0,
            totalRepositories: accountResult['public_repos'],
            repositoriesWithScorecards: 0,
            followers: accountResult['followers'],
            url: accountResult['html_url'],
            apiToken: apiToken
          }
        }),
        catchError((error: HttpErrorResponse) => {
          return throwError(
            () => this.throwDecentError(error));
        })
      );
  }

  /**
   * @inheritdoc
   */
  public getRepositories(
    accountName: string,
    apiToken?: string
  ): Observable<RepositoryModel[]> {
    return this.getAllRepositories(accountName, apiToken);
  }

  /**
   * Throw a more helpful error.
   * @param error
   * @private
   */
  private throwDecentError(error: HttpErrorResponse) {
    if (error.status == 429) {
      return new RateLimitError(
        'You have been throttled by GitHub. Please wait 30 minutes or add a different API key to the account.');
    } else if (error.status == 404) {
      return new InvalidAccountError(
        `No GitHub account with the provided name was found. Please recheck the account name.`);
    }

    return error;
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
              url: repository['url'],
              lastUpdated: new Date(repository['updated_at']),
              stars: repository['stargazers_count'],
              description: repository['description']
            });
          }

          exhausted = repositoriesResult.length < GithubService.RESULTS_PER_PAGE;
          return repositories;
        }),
        switchMap((repositories) => {
          if (exhausted) {
            return of(repositories);
          }

          return this.getAllRepositories(accountName, apiToken, page + 1, repositories);
        }),
        catchError((error) => {
          return throwError(
            () => this.throwDecentError(error));
        })
      );
  }

  /**
   * Get a request instance, initialized with some defaults.
   * @param url
   * @param apiToken
   */
  private getRequestInstance(
    url: string,
    apiToken?: string
  ) {
    let headers: HttpHeaders = new HttpHeaders();

    if (apiToken) {
      headers = headers.set('Authorization', `Bearer ${apiToken}`);
    }

    return this.httpClient.get(url, { responseType: 'json', headers: headers });
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
