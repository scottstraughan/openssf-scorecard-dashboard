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
import { map, Observable, of, switchMap, tap } from 'rxjs';
import Dexie, { Version } from 'dexie';
import { LoggingService } from '../logging.service';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  /**
   * The name of the indexed database.
   * @private
   */
  private static readonly DATABASE_NAME = 'ossfd';

  /**
   * Database version, increment if the structure of database changes.
   * @private
   */
  private static readonly DATABASE_VERSION = 1;

  /**
   * Track dexie version.
   * @private
   */
  private static dexieVersion: Version | undefined;

  /**
   * Track dexie reference.
   * @private
   */
  private static dexie: Dexie;

  /**
   * Constructor.
   */
  constructor(
    private loggingService: LoggingService,
  ) { }

  /**
   * Delete an item from the database.
   */
  deleteItem(
    tableName: string,
    key: string,
  ): Observable<void> {
    return this.getDexie()
      .pipe(
        switchMap(dexie =>
          dexie.table(tableName).delete(key)),
        tap(() =>
          this.loggingService.warn(`Deleting item with key '${key}' from '${tableName}' cache.`))
      )
  }

  /**
   * Bulk delete from database.
   */
  bulkDelete(
    tableName: string,
    keys: string[],
  ) {
    return this.getDexie()
      .pipe(
        switchMap(dexie =>
          dexie.table(tableName).bulkDelete(keys)),
        tap(() =>
          this.loggingService.warn(`Deleting '${keys.length}' items from '${tableName}' cache.`))
      )
  }

  /**
   * Returns entry by id.
   * @param storeName The name of the store to query
   * @param key The entry key
   */
  getByKey<T>(
    storeName: string,
    key: string
  ): Observable<CacheItem<T> | undefined> {
    return this.getDexie()
      .pipe(
        // Get any existing element from database
        switchMap(dexie =>
          dexie.table(storeName).get(key)),

        // Ensure the cached item has not expired
        switchMap((cached: CacheItem<T>) => {
          // If there is no cached item, just return undefined
          if (cached == undefined)
            return of(undefined);

          // If there is no expires set, it will last for ever
          if (cached.expires == undefined)
            return of(cached);

          return this.verifyExpired(storeName, cached);
        })
      )
  }

  /**
   * Return all elements from one store
   */
  getAll<T>(
    storeName: string,
  ): Observable<T[]> {
    return this.getDexie()
      .pipe(
        // Fetch all the items in the table
        switchMap(dexie =>
          dexie.table(storeName).toArray()),

        // Clear any expired item
        map((all: CacheItem<T>[]) =>
          all.filter(cached => this.verifyExpired(storeName, cached))),

        // Unwrap the item
        map((all: CacheItem<T>[]) =>
          all.map(cached => cached.value))
      )
  }

  /**
   * Add to the table.
   */
  add<T>(
    storeName: string,
    item: T,
    key: any,
    timeoutInDays?: number
  ): Observable<T> {
    let expires = undefined;

    if (timeoutInDays) {
      expires = new Date();
      expires.setDate(expires.getDate() + timeoutInDays);
    }

    return this.getDexie()
      .pipe(
        // Add to database
        switchMap(dexie =>
          dexie.table(storeName).put({ expires: expires, value: item, key: key }, key)),

        // Return the added item for easy chaining
        map(() => item)
      )
  }

  /**
   * Verify if an item is expired or not. If it is, remove it from the database.
   */
  verifyExpired<T>(
    storeName: string,
    cached: CacheItem<T>
  ): Observable<CacheItem<T> | undefined > {
    // Ensure the current date is not past the expiry date, return cached if okay
    const currentDate: Date = new Date();

    if (cached.expires == undefined)
      return of(cached);

    if (currentDate > cached.expires) {
      this.loggingService.warn(`Cached item for store '${storeName}' has expired, deleting.`, cached);

      return this.deleteItem(storeName, cached.key)
        .pipe(map(() => undefined));
    }

    return of(cached);
  }

  /**
   * Return an initialized dexie instance. Save it within a static reference for future reloads.
   */
  private getDexie(): Observable<Dexie> {
    return new Observable(observer => {
      if (CacheService.dexie) {
        observer.next(CacheService.dexie);
        observer.complete();
        return ;
      }

      this.loggingService.error(`Dexie doesn't exist, creating a new instance..`);

      CacheService.dexie = new Dexie(CacheService.DATABASE_NAME);
      CacheService.dexieVersion = CacheService.dexie.version(CacheService.DATABASE_VERSION);

      CacheService.dexieVersion.stores({
        accounts: 'key',
        repositories: 'key',
        scorecards: 'key',
      });

      CacheService.dexie.open()
        .then(() => {
          observer.next(CacheService.dexie);
          observer.complete();

          this.loggingService.error('Database is now opened.');
        });
    });
  }
}

/**
 * Represents a cachable item of type T.
 */
export interface CacheItem<T> {
  expires?: Date
  key: any
  value: T
}
