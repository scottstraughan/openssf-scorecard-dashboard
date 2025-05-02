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
export class KeyValueStore {
  /**
   * Storage key prefix.
   */
  static readonly prefix: string = 'ossfd-ts';

  /**
   * Constructor
   */
  constructor(
    @Inject(LOCAL_STORAGE) private storageService: StorageService
  ) { }

  /**
   * Get an item from the storage service, but only if it has not expired.
   */
  get<T>(
    key: string
  ): T | undefined {
    return this.fetch<T | undefined>(KeyValueStore.getFullKey(key));
  }

  /**
   * Set an item to the storage service, along with a date it should expire at.
   */
  set<T>(
    key: string,
    value: T
  ) {
    this.storageService.set(KeyValueStore.getFullKey(key), value);
  }

  /**
   * Check if an item exists in the storage service.
   */
  has(
    key: string
  ): boolean {
    return this.fetch(KeyValueStore.getFullKey(key)) !== undefined;
  }

  /**
   * Fetch an item from the storage service, verifying if the data has expired or not.
   * @private
   */
  private fetch<T>(
    key: string
  ): T | undefined {
    if (!this.storageService.has(key)) {
      return undefined;
    }

    const stored: T = this.storageService.get(key);
    return <T> stored;
  }

  /**
   * Generate a full storage key.
   * @private
   */
  private static getFullKey(
    key: string
  ): string {
    return `${KeyValueStore.prefix}-${key}`;
  }
}

