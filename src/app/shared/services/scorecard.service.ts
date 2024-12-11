import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OrganizationModel } from '../models/organization.model';
import { RepositoryModel } from '../models/repository.model';
import { catchError, map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScorecardService {
  constructor(
    private httpClient: HttpClient
  ) { }

  getScore(
    organization: OrganizationModel,
    repository: RepositoryModel
  ): Observable<number | undefined> {
    const url = `https://api.securityscorecards.dev/projects/github.com/${organization.login}/${repository.name}`;

    return this.httpClient.get(url, { responseType: 'json' })
      .pipe(
        map((scorecardResult: any) => {
          return scorecardResult.score;
        }),
        catchError(() => {
          return of(undefined);
        })
      );
  }
}
