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
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  /**
   * Enable or disable logging.
   */
  private enabled: boolean = environment.logging;

  /**
   * Log an info level message.
   */
  info(
    ...data: any
  ) {
    if (!this.enabled) return ;
    console.info(data);
  }

  /**
   * Log an error level message.
   */
  error(
    ...data: any
  ) {
    if (!this.enabled) return ;
    console.error(data);
  }

  /**
   * Log a warn level message.
   */
  warn(
    ...data: any
  ) {
    if (!this.enabled) return ;
    console.warn(data);
  }
}
