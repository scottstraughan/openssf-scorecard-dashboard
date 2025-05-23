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

import { ChangeDetectionStrategy, Component, ElementRef, input, model, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'ossfd-input',
  standalone: true,
  imports: [
    FormsModule,
    IconComponent
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputComponent implements OnInit {
  readonly value = model<string>('');
  readonly placeholder = input<string>('');
  readonly icon = input<string | undefined>(undefined);
  readonly focus = input<boolean>(false);

  @ViewChild('input') inputElement: ElementRef | undefined;

  ngOnInit(): void {
    if (this.focus()) {
      setTimeout(() => {
        if (!this.inputElement)
          return;

        this.inputElement.nativeElement.focus();
      });
    }
  }
}
