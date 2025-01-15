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
import { ErrorPopupComponent } from '../popups/error-popup/error-popup.component';
import { DuplicateAccountError, InvalidAccountError } from '../errors/account';
import { CheckNotFoundError, ScorecardNotFoundError } from '../errors/scorecard';
import { RateLimitError, ServiceNotSupportedError } from '../errors/service';
import { GenericError } from '../errors/generic';

@Injectable({
  providedIn: 'root'
})
export class ErrorPopupService {
  /**
   * Constructor.
   * @param popupService
   */
  constructor(
    protected popupService: PopupService
  ) { }

  /**
   * Show an error popup.
   * @param title
   * @param message
   * @param icon
   */
  showPopup(
    title: string,
    message: string,
    icon: string = 'error'
  ) {
    setTimeout(() => {
      const error: ErrorPopupError = {
        title: title,
        message: message,
        icon: icon
      };

      this.popupService.create(ErrorPopupComponent, error, true);
    });
  }

  /**
   * Handle an error.
   * @param error
   */
  handleError(
    error: any
  ) {
    const convertedError = this.convertError(error);
    this.showPopup(convertedError.title, convertedError.message, convertedError.icon);
  }

  /**
   * Convert an error for the popup.
   */
  convertError(
    error: any
  ): ErrorPopupError {
    let title = 'A Wee Problem!';
    let icon = 'error';
    const message = error.message;

    if (error instanceof GenericError) {
      title = error.title ?? title;
    }

    if (error instanceof RateLimitError) {
      icon = 'speed';
    } else if (error instanceof InvalidAccountError) {
      icon = 'followers';
    } else if (error instanceof DuplicateAccountError) {
      icon = 'followers';
    } else if (error instanceof ScorecardNotFoundError) {
      icon = 'score';
    } else if (error instanceof CheckNotFoundError) {
      icon = 'score';
    }

    return {
      title: title,
      message: message,
      icon: icon
    }
  }
}

/**
 * Represents the minimum required error details.
 */
export interface ErrorPopupError {
  title: string
  message: string
  icon: string
}
