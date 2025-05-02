/*---------------------------------------------------------------------------------------------
 *
 *  Copyright (C) Codeplay Software Ltd, Scott Straughan.
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

import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal } from '@angular/core';
import { IconComponent } from '../shared/components/icon/icon.component';
import { ErrorService } from '../shared/services/error.service';
import { ActivatedRoute, Router } from '@angular/router';
import { take, tap } from 'rxjs';
import { GenericError } from '../shared/errors/generic';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'ossfd-error-view',
  standalone: true,
  imports: [
    IconComponent
  ],
  templateUrl: './error-view.component.html',
  styleUrl: './error-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorViewComponent implements OnInit {
  /**
   * Signal for error.
   */
  readonly error: WritableSignal<GenericError> = signal(
    new GenericError(
    'A Wee Problem', 'There was a problem, gremlins in the system! Please fresh the page.'
  ));

  /**
   * Constructor.
   */
  constructor(
    private errorService: ErrorService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private title: Title
  ) { }

  /**
   * @inheritdoc
   */
  ngOnInit() {
    this.activatedRoute.queryParams
      .pipe(
        tap(params => {
          const error = this.errorService.getError();

          if (error == undefined) {
            this.router.navigate(['./']).then();
            return ;
          }

          this.error.set(error);
          this.title.setTitle(error.title);

          if (params['goTo'] && !error) {
            this.router.navigate([params['goTo']], {
               replaceUrl: true
            }).then();
          }
        }),
        take(1)
      )
      .subscribe();
  }

  /**
   * Get a suitable icon for the error.
   * @param error
   */
  getIconForError(
    error: GenericError
  ) {
    return this.errorService.getIconForError(error);
  }
}
