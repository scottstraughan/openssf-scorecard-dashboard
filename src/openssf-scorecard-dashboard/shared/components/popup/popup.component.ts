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

import { CommonModule, DOCUMENT } from '@angular/common';
import {
  AfterViewInit, ChangeDetectionStrategy,
  Component, HostListener,
  Inject,
  Injector,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { PopupReference } from './popup.service';
import { NavigationStart, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'ossfd-popup',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent
  ],
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PopupComponent implements AfterViewInit {
  /**
   * Popup target reference, this is where the popup will be attached.
   */
  @ViewChild('popupTarget', { read: ViewContainerRef })
  popupContainerRef: ViewContainerRef | null = null;

  /**
   * Reference to the popup component.
   */
  component: any = null;

  /**
   * Injector reference.
   */
  injector: Injector | null = null;

  /**
   * Reference to the popup.
   */
  popupReference: PopupReference | null = null;

  /**
   * Represents if the popup is visible or not
   */
  visible: boolean = false;

  /**
   * Used to track route change events.
   */
  routerChangeSubscription: Subscription;

  /**
   * Constructor.
   */
  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router
  ) {
    /**
     * To avoid the popup lingering when a link is clicked, we will subscribe to router changes
     * and then hide the popup.
     */
    this.routerChangeSubscription = this.router.events
      .pipe(
        filter(event => (event instanceof NavigationStart))
      )
      .subscribe(() =>
        this.hide());
  }

  /**
   * When the view is ready and the @ViewChild is ready, attach the component into the popup container.
   */
  ngAfterViewInit() {
    if (this.popupContainerRef && this.injector) {
      const ref = this.popupContainerRef.createComponent(this.component, {injector: this.injector});
      ref.changeDetectorRef.detectChanges();
    }
  }

  /**
   * Called when a user presses the escape key. Hides the popup.
   */
  @HostListener('document:keydown.escape')
  onKeydownHandler() {
    this.hide();
  }

  /**
   * Attach a component into the popup container element.
   */
  attach(
    component: any,
    injector: Injector,
    popupReference: PopupReference
  ) {
    this.injector = injector;
    this.component = component;
    this.popupReference = popupReference;
  }

  /**
   * Show the popup container.
   */
  show() {
    this.visible = true;
    this.document.body.style.overflow = 'hidden';
  }

  /**
   * Hide the popup container.
   */
  hide() {
    this.visible = false;
    this.document.body.style.overflow = 'auto';
    this.routerChangeSubscription.unsubscribe();
  }

  /**
   * Called when a user clicks on the popup, used to avoid closing the popup.
   */
  onPopupClick(
    event: Event
  ) {
    event.stopPropagation();
  }

  /**
   * Called when a user clicks on the container, attempting to close the popup.
   */
  onContainerClick() {
    this.hide();
  }
}
