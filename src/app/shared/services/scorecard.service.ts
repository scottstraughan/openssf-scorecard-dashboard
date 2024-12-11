import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ServiceAccountModel } from '../models/service-account.model';
import { RepositoryModel } from '../models/repository.model';
import { catchError, map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScorecardService {
  /**
   * Constructor
   * @param httpClient
   */
  constructor(
    private httpClient: HttpClient
  ) { }

  /**
   * Get a score from the securityscorecards API.
   * @param organization
   * @param repository
   */
  getScore(
    organization: ServiceAccountModel,
    repository: RepositoryModel
  ): Observable<number | undefined> {
    const url = `https://api.securityscorecards.dev/projects/github.com/${organization.account}/${repository.name}`;

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
