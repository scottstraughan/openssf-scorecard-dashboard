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

import { ChangeDetectionStrategy, Component, HostListener, model, output, signal, WritableSignal } from '@angular/core';
import { LinkButtonComponent } from '../link-button/link-button.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'ossfd-multi-toggle-button',
  standalone: true,
  imports: [
    LinkButtonComponent,
    IconComponent,
  ],
  templateUrl: './multi-toggle-button.component.html',
  styleUrl: './multi-toggle-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiToggleButtonComponent {
  readonly items = model<ToggleButtonItem[]>([]);
  readonly itemChange = output<ToggleButtonItem>();
  readonly optionsVisible: WritableSignal<boolean> = signal(false);

  /**
   * Called when a user clicks anywhere.
   */
  @HostListener('document:click', ['$event'])
  documentClick() {
    if (!this.optionsVisible())
      return ;

    this.optionsVisible.set(false);
  }

  /**
   * Called when a user clicks on the button.
   */
  onButtonClicked(
    event: MouseEvent
  ) {
    event.stopPropagation();
    this.optionsVisible.set(!this.optionsVisible());
  }

  /**
   * Called when a user toggles an option.
   */
  onOptionToggled(
    event: MouseEvent,
    option: ToggleButtonItem
  ): void {
    event.stopPropagation();

    option.active = !option.active;
    this.itemChange.emit(option);
  }
}

/**
 * Public interface for the toggle button item.
 */
export interface ToggleButtonItem {
  id: any
  name: string
  icon: string
  active: boolean
}
