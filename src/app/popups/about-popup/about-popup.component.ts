import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { PopupReference } from '../../shared/components/popup/popup.service';
import { SearchComponent } from '../../shared/components/search/search.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'osf-about-popup',
  standalone: true,
  templateUrl: './about-popup.component.html',
  imports: [
    SearchComponent,
    ButtonComponent,
    FormsModule
  ],
  styleUrls: [
    './../error-popup/error-popup.component.scss',
    './about-popup.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPopupComponent {
  /**
   * Constructor
   * @param popupReference
   */
  constructor(
    @Inject('POPUP_DATA') protected popupReference: PopupReference
  ) { }

  /**
   * Called when the user presses the close button.
   */
  onClose() {
    this.popupReference.close();
  }
}
