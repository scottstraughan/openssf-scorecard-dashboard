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

import { BehaviorSubject, filter, Observable } from 'rxjs';

/**
 * This service provides an easy way to ensure that initialization has completed before specific blocks of code can
 * run. This ensures that there is never an issue where something is trying to access data, api etc. before the service
 * has been fully initialized and setup.
 */
export abstract class InitializableService {
  /**
   * Used to track if this service is fully initialized or not.
   * @protected
   */
  protected ready$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  /**
   * Set the initialization state.
   * @param initialized the initialization state
   * @protected
   */
  protected setInitialized(
    initialized: boolean
  ) {
    this.ready$.next(initialized);
  }

  /**
   * Observe this method and then run code but only when the service is initialized.
   * @protected
   */
  protected whenReady(): Observable<any> {
    return this.ready$
      .pipe(
        filter(ready => ready)
      );
  }
}