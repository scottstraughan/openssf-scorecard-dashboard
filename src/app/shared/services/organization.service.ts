import { Inject, Injectable } from '@angular/core';
import { OrganizationModel } from '../models/organization.model';
import { RepositoryType } from '../models/repository.model';
import { map, Observable, of, switchMap, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  constructor(
    private httpClient: HttpClient,
    @Inject(LOCAL_STORAGE) private storageService: StorageService
  ) { }

  getOrganizations(): Observable<OrganizationModel[]> {
    return of([
      {
        login: 'codeplaysoftware',
        icon: 'https://avatars.githubusercontent.com/u/7440916?s=48&v=4',
        totalRepositories: 121,
        repositoriesWithScorecards: 24,
        followers: 300,
        averageScore: 8.3,
        url: 'https://github.com',
        description: '', name: ''
      },
      {
        login: 'jetbrains',
        icon: 'https://avatars.githubusercontent.com/u/878437?s=48&v=4',
        totalRepositories: 42,
        repositoriesWithScorecards: 12,
        followers: 23,
        averageScore: 5,
        url: 'https://github.com',
        description: '', name: ''
      },
      {
        login: 'uxlfoundation',
        icon: 'https://avatars.githubusercontent.com/u/144704571?s=200&v=4',
        totalRepositories: 5,
        repositoriesWithScorecards: 2,
        followers: 123,
        averageScore: 3.2,
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
            averageScore: 8.3,
            totalRepositories: organizationResult['public_repos'],
            repositoriesWithScorecards: 0,
            followers: organizationResult['followers'],
            url: organizationResult['html_url'],
            repositories: []
          }
        }),
        tap((organization) => this.storageService.set(apiUrl, organization))
      );
  }

  getOrganizationRepositories(
    organizationModel: OrganizationModel,
    page: number = 1,
  ): Observable<OrganizationModel> {
    const resultsPagePage = 100;

    const apiUrl = OrganizationService.getGitHubApiUrl(
      organizationModel.login, RepositoryType.ORGANIZATION);

    const fullUrl = `${apiUrl}/repos?per_page=${resultsPagePage}&page=${page}`;

    if (this.storageService.has(fullUrl)) {
      console.log('Loading repositories from cache...');
      return of(this.storageService.get(fullUrl));
    }

    let exhausted = false;

    return this.httpClient.get(fullUrl, { responseType: 'json' })
      .pipe(
        map((repositoriesResult: any) => {
          console.log('Loading repositories from GitHub API...');

          if (!organizationModel.repositories) {
            organizationModel.repositories = [];
          }

          for (const repository of repositoriesResult) {
            organizationModel.repositories.push({
              name: repository['name'],
              url: repository['url'],
              lastUpdated: new Date(repository['updated_at']),
              stars: repository['stargazers_count'],
              description: repository['description'],
            });
          }

          exhausted = repositoriesResult.length < resultsPagePage;
          return organizationModel;
        }),
        switchMap((organizationModel) => {
          if (exhausted) {
            this.storageService.set(fullUrl, organizationModel);
            return of(organizationModel);
          }

          return this.getOrganizationRepositories(organizationModel, page + 1);
        }),
      );
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
