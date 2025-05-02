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

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { KeyValueStore } from './storage/key-value.service';

/**
 * This service make it easy to enable or disable dark mode.
 */
@Injectable({
  providedIn: 'root'
})
export class DarkModeService {
  /**
   * Local storage key.
   */
  private static readonly STORAGE_KEY = 'ossfd-dark-mode-enabled';

  /**
   * BehaviorSubject, used to track changes to the dark mode state.
   */
  private readonly darkModeEnabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  /**
   * Constructor.
   */
  constructor(
    private keyValueStore: KeyValueStore
  ) {
    const savedDarkMode = this.keyValueStore.get<boolean>(DarkModeService.STORAGE_KEY);
    const browserDarkMode = this.isBrowserDarkModeEnabled();

    if (savedDarkMode !== undefined) {
      this.darkModeEnabled$.next(savedDarkMode);
    } else if (browserDarkMode !== undefined) {
      this.darkModeEnabled$.next(browserDarkMode);
    } else {
      this.darkModeEnabled$.next(this.darkModeEnabled$.getValue());
    }
  }

  /**
   * Watch for changes to the dark mode state.
   */
  observeDarkModeEnabled(): Observable<boolean> {
    return this.darkModeEnabled$.asObservable();
  }

  /**
   * Toggle the dark mode state.
   */
  toggleDarkModeEnabled(): void {
    const darkModeEnabled = !this.darkModeEnabled$.getValue();

    this.keyValueStore.set(DarkModeService.STORAGE_KEY, darkModeEnabled);
    this.darkModeEnabled$.next(darkModeEnabled);
  }

  /**
   * Determine if the browser has applied the media query "dark" or not.
   */
  private isBrowserDarkModeEnabled(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
