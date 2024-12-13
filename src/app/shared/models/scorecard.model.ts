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

import { ResultPriority } from '../services/scorecard.service';

export interface ScorecardModel {
  score?: number
  checks: ScorecardCheck[]
  url: string
}

export interface ScorecardCheck {
  name: string
  score: number
  reason: string
  details: string | undefined
  priority: ResultPriority
  documentation: {
    url: string
  }
}
