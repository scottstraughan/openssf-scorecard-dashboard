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

import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'osd-icon',
  standalone: true,
  imports: [
    NgOptimizedImage
  ],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent {
  readonly icon = input.required<string>();
  readonly alt: Signal<string> = input<string>('Icon');
  readonly width = input<number>(26);
  readonly height = input<number>(26);

  readonly iconSrc: Signal<string>;

  /**
   * Constructor.
   */
  constructor() {
    this.iconSrc = computed(() => {
      return `./assets/icons/${this.icon()}.svg`;
    });
  }
}