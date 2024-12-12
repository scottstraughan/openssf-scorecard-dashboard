import { ChangeDetectionStrategy, Component, Inject, signal, WritableSignal } from '@angular/core';
import { PopupReference } from '../../shared/components/popup/popup.service';
import { SearchComponent } from '../../shared/components/search/search.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FormsModule } from '@angular/forms';
import { MinimumAccountError } from '../../shared/services/service-store.service';
import { InvalidAccountError, RateLimitError } from '../../shared/services/repository-services/base-repository-service';

@Component({
  selector: 'osf-error-popup',
  standalone: true,
  templateUrl: './error-popup.component.html',
  imports: [
    SearchComponent,
    ButtonComponent,
    FormsModule
  ],
  styleUrls: [
    './error-popup.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorPopupComponent {
  title: WritableSignal<string> = signal('');
  message: WritableSignal<string> = signal('');
  icon: WritableSignal<string> = signal('warning');

  /**
   * Constructor
   * @param popupReference
   */
  constructor(
    @Inject('POPUP_DATA') protected popupReference: PopupReference
  ) {
    this.title.set(popupReference.data['title']);
    this.message.set(popupReference.data['message']);

    if (popupReference.data['icon']) {
      this.icon.set(popupReference.data['icon']);
    }
  }

  /**
   * Called when the user presses the close button.
   */
  onClose() {
    this.popupReference.close();
  }

  /**
   * Generate an error response for the UI.
   */
  static handleErrorThrown(
    error: any
  ) {
    let title = 'Error';
    let message = error.message;
    let icon = 'error';

    if (error instanceof MinimumAccountError) {
      title = 'Cannot Remove Account';
      message = 'You must have at least one account to track. Please add another account if you wish to delete this one.';
    } else if (error instanceof RateLimitError) {
      title = 'Rate Limited';
      icon = 'speed';
    } else if (error instanceof InvalidAccountError) {
      title = 'Account Not Found';
      icon = 'person_search';
    } else {
      title = error.message;
      message = error.message;
    }

    return {
      title: title, message: message, icon: icon
    };
  }
}
