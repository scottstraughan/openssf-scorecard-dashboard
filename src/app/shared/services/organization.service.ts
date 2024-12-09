import { Injectable } from '@angular/core';
import { OrganizationModel } from '../models/organization.model';
import { RepositoryModel } from '../models/repository.model';
import { map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  getOrganizations(): Observable<OrganizationModel[]> {
    return of([
      {
        name: 'codeplaysoftware',
        icon: 'https://avatars.githubusercontent.com/u/7440916?s=48&v=4',
        totalRepositories: 121,
        repositoriesWithScorecards: 24,
        totalStars: 300,
        averageScore: 8.3,
        url: 'https://github.com',
      },
      {
        name: 'jetbrains',
        icon: 'https://avatars.githubusercontent.com/u/878437?s=48&v=4',
        totalRepositories: 42,
        repositoriesWithScorecards: 12,
        totalStars: 23,
        averageScore: 5,
        url: 'https://github.com',
      },
      {
        name: 'uxlfoundation',
        icon: 'https://avatars.githubusercontent.com/u/144704571?s=200&v=4',
        totalRepositories: 5,
        repositoriesWithScorecards: 2,
        totalStars: 123,
        averageScore: 3.2,
        url: 'https://github.com',
      }
    ]);
  }

  getOrganizationByTag(tag: string): Observable<OrganizationModel | undefined> {
    return this.getOrganizations()
      .pipe(
        map((organizations) => {
          for (const org of organizations) {
            if (org.name == tag) {
              return org
            }
          }

          return undefined;
        })
      );
  }

  getRepos(): Observable<RepositoryModel[]> {
    return of([
      {
        name: 'repo1',
        url: 'https://githhub.com'
      },
      {
        name: 'repo2',
        url: 'https://githhub.com'
      },
      {
        name: 'repo3',
        url: 'https://githhub.com'
      },
      {
        name: 'repo4',
        url: 'https://githhub.com'
      },
      {
        name: 'repo5',
        url: 'https://githhub.com'
      },
      {
        name: 'repo6',
        url: 'https://githhub.com'
      }
    ]);
  }
}
