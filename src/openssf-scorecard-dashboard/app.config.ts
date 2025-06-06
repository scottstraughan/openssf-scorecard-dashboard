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

import { ChangeDetectionStrategy, SecurityContext, ViewEncapsulation } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideMarkdown } from 'ngx-markdown';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withFetch()
    ),
    provideAnimations(),
    provideMarkdown({
      sanitize: SecurityContext.NONE,
      markedExtensions: [gfmHeadingId()],
    }),
    provideClientHydration(withEventReplay())
  ],
  defaultEncapsulation: ViewEncapsulation.ShadowDom,
  defaultChangeDetection: ChangeDetectionStrategy.OnPush
};
