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
 * Error that is thrown when the backend has reported an invalid account.
 */
export class InvalidAccountError extends GenericError {
  constructor(
    message?: string
  ) {
    super('Account Not Found', message || 'No account could be found on the repository service.');
  }
}

/**
 * Error used for when an account already exists.
 */
export class DuplicateAccountError extends GenericError {
  /**
   * Constructor.
   */
  constructor(
    message?: string
  ) {
    super('Account Already Exists', message || 'There is already exists for this account.');
  }
}

/**
 * Error used when the user has tried to remove all the accounts (requires at least one).
 */
export class MinimumAccountError extends GenericError {
  /**
   * Constructor.
   */
  constructor(
    message?: string
  ) {
    super('Cannot Remove Account', message || 'You must have at least one account to track. ' +
      'Please add another account if you wish to delete this one.');
  }
}

/**
 * Error used when a repository has not been found.
 */
export class RepositoryNotFoundError extends GenericError {
  /**
   * Constructor.
   */
  constructor(
    message?: string
  ) {
    super('Repository Not Found', message || 'The requested repository could not be found in the account.');
  }
}

/**
 * When the API token is invalid.
 */
export class InvalidApiTokenError extends GenericError {
  constructor(
    message?: string
  ) {
    super('Invalid API Token', message || 'The provided API token is invalid.');
  }
}
