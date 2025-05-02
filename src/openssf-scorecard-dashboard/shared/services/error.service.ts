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
import { PopupService } from '../components/popup/popup.service';
import { DuplicateAccountError, InvalidAccountError } from '../errors/account';
import { ScorecardNotFoundError } from '../errors/scorecard';
import { RateLimitError } from '../errors/service';
import { GenericError } from '../errors/generic';
import { Router } from '@angular/router';
import { ErrorPopupComponent } from '../popups/error-popup/error-popup.component';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  /**
   * References to the provided error.
   * @private
   */
  private error: GenericError | undefined;

  /**
   * Constructor.
   */
  constructor(
    private popupService: PopupService,
    private router: Router
  ) { }

  /**
   * Get the current error.
   */
  getError() {
    return this.error;
  }

  /**
   * Handle an error.
   */
  handleError = (
    error: GenericError,
    fatal: boolean = true
  ): Observable<any> => {
    this.error = error

    if (!fatal) {
      setTimeout(() => {
        this.popupService.create(ErrorPopupComponent, error, true);
      });
    } else {
      this.router.navigate([`./error`], { queryParams: { goTo: this.router.url }})
        .then();
    }

    return of(error);
  };

  /**
   * Get an icon for the error type.
   */
  getIconForError(
    error: any
  ): string {
    if (error instanceof RateLimitError) {
      return 'speed';
    } else if (error instanceof InvalidAccountError) {
      return 'followers';
    } else if (error instanceof DuplicateAccountError) {
      return 'followers';
    } else if (error instanceof ScorecardNotFoundError) {
      return 'score';
    }

    return 'error';
  }
}
