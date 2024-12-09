import { Injectable } from '@angular/core';
import { OrganizationModel } from '../models/organization.model';

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  getOrganizations(): OrganizationModel[] {
    return [
      {
        name: 'codeplaysoftware',
        icon: 'https://avatars.githubusercontent.com/u/7440916?s=48&v=4',
        totalRepositories: 121,
        repositoriesWithScorecards: 24,
        totalStars: 300,
        averageScore: 8.3
      },
      {
        name: 'jetbrains',
        icon: 'https://avatars.githubusercontent.com/u/878437?s=48&v=4',
        totalRepositories: 42,
        repositoriesWithScorecards: 12,
        totalStars: 23,
        averageScore: 5
      },
      {
        name: 'uxlfoundation',
        icon: 'https://avatars.githubusercontent.com/u/144704571?s=200&v=4',
        totalRepositories: 5,
        repositoriesWithScorecards: 2,
        totalStars: 123,
        averageScore: 3.2
      }
    ];
  }
}
