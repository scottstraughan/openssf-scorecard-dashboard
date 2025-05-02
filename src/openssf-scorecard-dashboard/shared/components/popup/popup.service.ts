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

import { ApplicationRef, ComponentRef, EventEmitter, Injectable, Injector, ViewContainerRef } from '@angular/core';
import { PopupComponent } from './popup.component';

@Injectable({
  providedIn: 'root'
})
export class PopupService {
  /**
   * Reference to root container.
   * @protected
   */
  private rootContainerReference: ViewContainerRef | undefined;

  /**
   * Constructor.
   */
  constructor(
    private applicationRef: ApplicationRef
  ) { }

  /**
   * Create a new popup, returning a reference to it.
   */
  create<T>(component: T, data: any, immediatelyShow: boolean = false): PopupReference {
    this.rootContainerReference = this.applicationRef.components[0].injector.get(ViewContainerRef);

    if (!this.rootContainerReference) {
      throw new Error();
    }

    const popupComponentComponentRef = this.rootContainerReference.createComponent(PopupComponent);

    const popupReference: PopupReference = new PopupReference(
      popupComponentComponentRef,
      data);

    const injector = Injector.create({
      providers: [{ provide: 'POPUP_DATA', useValue: popupReference }],
    });

    popupComponentComponentRef.instance.attach(component, injector, popupReference);

    if (immediatelyShow) {
      popupComponentComponentRef.instance.show();
    }

    return popupReference;
  }
}

/**
 * Popup reference, used for transferring data and a reference to original popup.
 */
export class PopupReference {
  public onChanged: EventEmitter<any> = new EventEmitter<any>();

  /**
   * Constructor for a panel reference.
   */
  constructor(
    private componentRef: ComponentRef<PopupComponent>,
    public data: any
  ) { }

  /**
   * Close the popup.
   */
  close(data?: any) {
    this.onChanged.emit(data);
    this.componentRef.instance.hide();
    this.componentRef.destroy();
  }
}
