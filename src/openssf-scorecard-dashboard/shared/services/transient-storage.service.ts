/*---------------------------------------------------------------------------------------------
 *
 *  Copyright (C) Scott Straughan
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

import { Inject, Injectable } from '@angular/core';
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';

/**
 * This service provides a medium to store content to the local storage but with an associated expiry time.
 */
@Injectable({
  providedIn: 'root'
})
export class TransientStorage {
  /**
   * Storage key prefix.
   */
  static readonly prefix: string = 'osd-ts';

  /**
   * Constructor
   * @param storageService
   */
  constructor(
    @Inject(LOCAL_STORAGE) private storageService: StorageService
  ) { }

  /**
   * Get an item from the storage service, but only if it has not expired.
   * @param key
   */
  get<T>(
    key: string
  ): T | undefined {
    const value = this.fetch<T>(TransientStorage.getFullKey(key));

    if (value) {
      return value.data;
    }

    return undefined;
  }

  /**
   * Set an item to the storage service, along with a date it should expire at.
   * @param key
   * @param value
   * @param timeoutInDays
   */
  set<T>(
    key: string,
    value: T,
    timeoutInDays?: number
  ) {
    if (!timeoutInDays) {
      timeoutInDays = 365;
    }

    const expires = new Date();
    expires.setDate(expires.getDate() + timeoutInDays);

    this.storageService.set(TransientStorage.getFullKey(key), <TransientStorageWrapper<T>> {
      expires: expires,
      data: value
    });
  }

  /**
   * Check if an item exists in the storage service.
   * @param key
   */
  has(
    key: string
  ): boolean {
    return this.fetch(TransientStorage.getFullKey(key)) !== undefined;
  }

  /**
   * Remove an item from the storage service.
   * @param key
   */
  remove(
    key: string
  ) {
    this.storageService.remove(TransientStorage.getFullKey(key));
  }

  /**
   * Fetch an item from the storage service, verifying if the data has expired or not.
   * @param key
   * @private
   */
  private fetch<T>(
    key: string
  ): TransientStorageWrapper<T> | undefined {
    if (!this.storageService.has(key)) {
      return undefined;
    }

    const stored: TransientStorageWrapper<T> = this.storageService.get(key);

    if (new Date() >= new Date(stored.expires)) {
      this.storageService.remove(key);
      return undefined;
    }

    return <TransientStorageWrapper<T>> stored;
  }

  /**
   * Generate a full storage key.
   * @param key
   * @private
   */
  private static getFullKey(
    key: string
  ): string {
    return `${TransientStorage.prefix}-${key}`;
  }
}

/**
 * Wraps a storage item with an expiry date.
 */
interface TransientStorageWrapper<T> {
  expires: Date
  data: T
}
