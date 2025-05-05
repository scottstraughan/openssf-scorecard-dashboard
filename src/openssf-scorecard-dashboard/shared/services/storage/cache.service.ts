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
        switchMap(dexie =>
          dexie.table(storeName).get(key)),

        switchMap((cached: CacheItem<T>) => {
          // If there is no cached item, just return undefined
          if (cached == undefined) {
            return of(undefined);
          }

          if (cached.expires == undefined) {
            return of(cached);
          }

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
    return this.getByKey<T>(storeName, key)
      .pipe(
        switchMap(existing => {
          if (existing) {
            return of(existing.value);
          }

          let expires = undefined;

          if (timeoutInDays) {
            expires = new Date();
            expires.setDate(expires.getDate() + timeoutInDays);
          }

          return this.getDexie()
            .pipe(
              switchMap(dexie =>
                dexie.table(storeName).add({ expires: expires, value: item, key: key }, key)
              ),
              map(() => item)
            )
        })
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

    if (cached.expires == undefined) {
      return of(cached);
    }

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
