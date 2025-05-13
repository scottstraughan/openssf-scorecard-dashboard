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
import { AccountModel } from '../../models/account.model';
import { forkJoin, map, Observable, of, Subject, switchMap, takeUntil, tap, } from 'rxjs';
import { GithubService } from '../api/github.service';
import { Service } from '../../enums/service';
import { RepositoryCollection } from '../api/base-api-service';
import { CacheService } from '../storage/cache.service';
import { RepositoryModel } from '../../models/repository.model';
import { ScorecardService } from './scorecard.service';
import { ServiceNotSupportedError } from '../../errors/service';
import { RepositoryNotFoundError } from '../../errors/account';
import { GitlabService } from '../api/gitlab.service';

@Injectable({
  providedIn: 'root'
})
export class RepositoryService {
  /**
   * Cache table name.
   */
  private static readonly CACHE_TABLE_NAME = 'repositories';

  /**
   * How long the cache should live for before timing out and clearing.
   */
  private static readonly CACHE_TIMEOUT = 30;

  /**
   * Constructor.
   */
  constructor(
    private githubService: GithubService,
    private gitlabService: GitlabService,
    private indexedDbService: CacheService,
    private scorecardService: ScorecardService,
  ) { }

  /**
   * Observe repositories.
   */
  getRepositories(
    account: AccountModel,
    forceReload: boolean = false,
    cancelled$: Subject<void> = new Subject<void>()
  ): Observable<RepositoryCollection> {
    let observableResult: RepositoryCollection;

    return this.indexedDbService.getByKey<RepositoryModel[]>(RepositoryService.CACHE_TABLE_NAME, account.url)
      .pipe(
        switchMap(cached =>
          cached != undefined && !forceReload
            ? of(RepositoryCollection.createFromRepositories(cached.value))
            : this.getRepositoryServiceProvider(account, cancelled$)
              .pipe(
                // Cache the result
                switchMap(repositoryCollection =>
                  repositoryCollection.completed
                    // If completed, add to cache
                    ? this.indexedDbService.add<RepositoryModel[]>(
                      RepositoryService.CACHE_TABLE_NAME,
                      repositoryCollection.repositories, account.url, RepositoryService.CACHE_TIMEOUT)
                      .pipe(map(() => repositoryCollection))

                    // If not completed, return previous result
                    : of(repositoryCollection)
                )
              )
        ),

        // Create backup of result reference
        tap(result =>
          observableResult = result),

        // Return the original result reference
        switchMap(() =>
          of(observableResult)),

        // Stop when cancelled
        takeUntil(cancelled$),
      )
  }

  /**
   * Observe a single repository.
   */
  observeRepository(
    account: AccountModel,
    name: string,
    cancelled$: Subject<void> = new Subject<void>()
  ): Observable<RepositoryModel> {
    return this.getRepositories(account)
      .pipe(
        map(repositories => {
          for (const repository of repositories.repositories) {
            if (repository.name == name)
              return repository;
          }

          throw new RepositoryNotFoundError();
        }),
        takeUntil(cancelled$)
      )
  }

  /**
   * Delete from cache.
   */
  deleteCached(
    account: AccountModel
  ): Observable<any> {
    return this.getRepositories(account)
      .pipe(
        map(repositoryCollection =>
          repositoryCollection.repositories.map(repository =>
            this.indexedDbService.deleteItem(RepositoryService.CACHE_TABLE_NAME, account.url)
              .pipe(
                // Switch to the delete cache observable
                switchMap(() =>
                  this.scorecardService.deleteCached(repository))
              )
          )
        ),

        // Wait for all the delete observables to complete
        switchMap(deleteObservables =>
          forkJoin(deleteObservables))
      )
  }

  /**
   * Get an appropriate service provider for the given account.
   * @private
   */
  private getRepositoryServiceProvider(
    account: AccountModel,
    cancelled$: Subject<void>
  ) {
    let observable: Observable<RepositoryCollection> | undefined;

    if (account.service == Service.GITHUB) {
      observable = this.githubService.getRepositories(account, cancelled$);
    } else if (account.service == Service.GITLAB) {
      observable = this.gitlabService.getRepositories(account, cancelled$);
    }

    if (!observable)
      throw new ServiceNotSupportedError();

    return observable;
  }
}