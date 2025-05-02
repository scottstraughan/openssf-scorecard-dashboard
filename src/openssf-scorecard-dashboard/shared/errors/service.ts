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

import { GenericError } from './generic';

/**
 * Error used for when a service is not supported.
 */
export class ServiceNotSupportedError extends GenericError {
  /**
   * Constructor.
   */
  constructor(
    message?: string
  ) {
    super('Service Not Supported', message || 'The repository service provided is not currently supported.');
  }
}

/**
 * Error that is thrown when the backend has rate limited the user.
 */
export class RateLimitError extends GenericError {
  constructor(
    message?: string
  ) {
    super('Rate Limited', message || 'You have been rated limited by the repository service, try again later.');
  }
}
