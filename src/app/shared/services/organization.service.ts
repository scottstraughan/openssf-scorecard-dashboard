import { Inject, Injectable } from '@angular/core';
import { OrganizationModel } from '../models/organization.model';
import { RepositoryModel, RepositoryType } from '../models/repository.model';
import { map, Observable, of, switchMap, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  static readonly RESULTS_PER_REQUEST = 100;

  constructor(
    private httpClient: HttpClient,
    @Inject(LOCAL_STORAGE) private storageService: StorageService
  ) { }

  getOrganizations(): Observable<OrganizationModel[]> {
    return of([
      {
        login: 'codeplaysoftware',
        icon: 'https://avatars.githubusercontent.com/u/7440916?s=48&v=4',
        totalRepositories: 0,
        repositoriesWithScorecards: 0,
        followers: 0,
        averageScore: 0,
        url: 'https://github.com',
        description: '', name: ''
      },
      {
        login: 'jetbrains',
        icon: 'https://avatars.githubusercontent.com/u/878437?s=48&v=4',
        totalRepositories: 0,
        repositoriesWithScorecards: 0,
        followers: 0,
        averageScore: 0,
        url: 'https://github.com',
        description: '', name: ''
      },
      {
        login: 'uxlfoundation',
        icon: 'https://avatars.githubusercontent.com/u/144704571?s=200&v=4',
        totalRepositories: 0,
        repositoriesWithScorecards: 0,
        followers: 0,
        averageScore: 0,
        url: 'https://github.com',description: '', name: ''
      }
    ]);
  }

  getOrganizationByTag(
    organizationLogin: string
  ): Observable<OrganizationModel> {
    const apiUrl = OrganizationService.getGitHubApiUrl(
      organizationLogin, RepositoryType.ORGANIZATION);

    if (this.storageService.has(apiUrl)) {
      console.log('Loading organization details from cache...');
      return of(this.storageService.get(apiUrl));
    }

    return this.httpClient.get(`${apiUrl}`, { responseType: 'json' })
      .pipe(
        map((organizationResult: any) => {
          console.log('Loading organization details from GitHub API...');

          return {
            login: organizationResult['login'],
            name: organizationResult['name'],
            icon: organizationResult['avatar_url'],
            description: organizationResult['description'],
            averageScore: 0,
            totalRepositories: organizationResult['public_repos'],
            repositoriesWithScorecards: 0,
            followers: organizationResult['followers'],
            url: organizationResult['html_url'],
          }
        }),
        tap((organization) =>
          this.storageService.set(apiUrl, organization))
      );
  }

  getOrganizationRepositories(
    organizationModel: OrganizationModel,
    page: number = 1,
    repositories: RepositoryModel[] = []
  ): Observable<RepositoryModel[]> {
    const apiUrl = OrganizationService.getGitHubApiUrl(
      organizationModel.login, RepositoryType.ORGANIZATION) + '/repos';

    if (this.storageService.has(apiUrl)) {
      console.log('Loading repositories from cache...');
      return of(this.storageService.get(apiUrl));
    }

    let exhausted = false;

    return this.httpClient.get(`${apiUrl}?per_page=${OrganizationService.RESULTS_PER_REQUEST}&page=${page}`,
      { responseType: 'json', headers: { 'authorization': 'Bearer ' + this.getAuthorizationToken() } })
      .pipe(
        map((repositoriesResult: any) => {
          console.log('Loading repositories from GitHub API...');

          for (const repository of repositoriesResult) {
            repositories.push({
              name: repository['name'],
              url: repository['url'],
              lastUpdated: new Date(repository['updated_at']),
              stars: repository['stargazers_count'],
              description: repository['description']
            });
          }

          exhausted = repositoriesResult.length < OrganizationService.RESULTS_PER_REQUEST;
          return repositories;
        }),
        switchMap((repositories) => {
          if (exhausted) {
            this.storageService.set(apiUrl, repositories);
            return of(repositories);
          }

          return this.getOrganizationRepositories(organizationModel, page + 1, repositories);
        }),
      );
  }

  getAuthorizationToken(): string | undefined {
    if (this.storageService.has('authorizationToken')) {
      return this.storageService.get('authorizationToken')
    }

    return undefined;
  }

  /**
   * Return the full GitHub api url.
   */
  protected static getGitHubApiUrl(
    name: string,
    type: RepositoryType
  ): string {
    if (type == RepositoryType.ORGANIZATION) {
      return `https://api.github.com/orgs/${name}`;
    } else if (type == RepositoryType.USER) {
      return `https://api.github.com/users/${name}`;
    }

    throw new Error('Unsupported repository type.');
  }
}
