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

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'truncate'
})
export class TruncatePipe implements PipeTransform {
  /**
   * Truncate a string of text to a specific length.
   * @param value the value to truncate
   * @param limit the max length of the string
   * @param ellipsis the ellipsis to use at the end of the truncated string
   */
  transform(
    value: string | null | undefined,
    limit = 25,
    ellipsis = '...'
  ): string | null | undefined {
    if (value === null || value === undefined)
      return value;

    return value.length > limit
      ? value.slice(0, limit) + ellipsis
      : value;
  }
}
