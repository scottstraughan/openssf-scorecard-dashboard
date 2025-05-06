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

import { Routes } from '@angular/router';
import { AccountViewComponent } from './account-view/account-view.component';
import { HomeViewComponent } from './home-view/home-view.component';
import { RepositoryListViewComponent } from './account-view/views/repository-list-view/repository-list-view.component';
import { ScorecardViewComponent } from './account-view/views/scorecard-view/scorecard-view.component';
import { ErrorViewComponent } from './error-view/error-view.component';

export const routes: Routes = [
  {
    path: ':serviceTag/:accountTag',
    component: AccountViewComponent,
    children: [
      {
        path: '',
        component: RepositoryListViewComponent
      },
      {
        path: ':repositoryName',
        component: ScorecardViewComponent
      },
      {
        path: ':repositoryName/:checkName',
        component: ScorecardViewComponent
      }
    ]
  },
  {
    path: 'error',
    component: ErrorViewComponent
  },
  {
    path: 'home',
    component: HomeViewComponent
  },
  {
    path: '**',
    component: HomeViewComponent
  },
]
