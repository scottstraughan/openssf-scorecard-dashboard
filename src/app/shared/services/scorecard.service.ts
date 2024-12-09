import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OrganizationModel } from '../models/organization.model';
import { RepositoryModel } from '../models/repository.model';
import { catchError, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScorecardService {
  constructor(
    private httpClient: HttpClient
  ) { }

  getScorecard(
    organization: OrganizationModel,
    repository: RepositoryModel
  ) {
    const url = `https://api.securityscorecards.dev/projects/github.com/${organization.login}/${repository.name}`;

    console.log('Loading scorecard from API... ');

    return this.httpClient.get(url, { responseType: 'json' }).pipe(
      map((scorecardResult: any) => {
        return {
          repository: repository.name,
          updated: new Date(scorecardResult.date),
          score: scorecardResult.score,
          url: `https://scorecard.dev/viewer/?uri=github.com/${organization.login}/${repository.name}`
        };
      }),
      catchError(() => {
        return of(undefined);
      })
    );
  }
}
