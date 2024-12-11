import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import { RepositoryModel } from '../../models/repository.model';
import { ServiceAccountModel } from '../../models/service-account.model';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';

export abstract class RepositoryService {
  static readonly RESULTS_PER_PAGE = 100;

  protected httpClient: HttpClient = inject(HttpClient);

  abstract getServiceDetails(
    accountName: string
  ): Observable<ServiceAccountModel>;

  abstract getRepositories(
    accountName: string
  ): Observable<RepositoryModel[]>;
}

export class RateLimitError extends Error {}
export class InvalidAccountError extends Error {}


@Injectable({
  providedIn: 'root'
})
export class GithubService extends RepositoryService {
  /**
   * @inheritdoc
   */
  public getServiceDetails(
    accountName: string
  ): Observable<ServiceAccountModel> {
    const apiUrl = `${GithubService.generateApiUrl(accountName)}`;

    return this.httpClient.get(`${apiUrl}`, { responseType: 'json', headers: {
      'authorization': 'Bearer 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'
      } })
      .pipe(
        map((accountResult: any) => {
          return {
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
          }
        }),
        catchError((error: HttpErrorResponse) => {
          if (error.status == 429) {
            return throwError(() => new RateLimitError(error.error.message));
          } else if (error.status == 404) {
            return throwError(() => new InvalidAccountError(error.error.message));
          }

          return throwError(() => error);
        })
      );
  }

  /**
   * @inheritdoc
   */
  public getRepositories(
    accountName: string
  ): Observable<RepositoryModel[]> {
    return this.getAllRepositories(accountName);
  }

  /**
   * Fetch all the repositories for a given account, going through each API request page until complete.
   * @param accountName
   * @param page
   * @param repositories
   * @private
   */
  private getAllRepositories(
    accountName: string,
    page: number = 1,
    repositories: RepositoryModel[] = []
  ): Observable<RepositoryModel[]> {
    let exhausted = false;
    const apiUrl = `${GithubService.generateApiUrl(accountName)}/repos`;
    const headers = new HttpHeaders();

    return this.httpClient.get(`${apiUrl}?per_page=${GithubService.RESULTS_PER_PAGE}&page=${page}`,
      { responseType: 'json', headers: {
          'authorization': 'Bearer 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'
        } })
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

          return this.getAllRepositories(accountName, page + 1, repositories);
        }),
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
