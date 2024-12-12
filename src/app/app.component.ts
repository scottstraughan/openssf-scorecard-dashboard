import { Component, signal, Signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccountModel } from './shared/models/account.model';
import { NgClass } from '@angular/common';
import { ServiceStoreService } from './shared/services/service-store.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { PopupService } from './shared/components/popup/popup.service';
import { AddOrganizationPopupComponent } from './popups/add-service-account-popup/add-organization-popup.component';
import { AboutPopupComponent } from './popups/about-popup/about-popup.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgClass, RouterLinkActive, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  /**
   * A list of service accounts.
   */
  readonly serviceAccounts: Signal<AccountModel[]> = signal([]);

  /**
   * Constructor
   * @param organizationService
   * @param popupService
   */
  constructor(
    protected organizationService: ServiceStoreService,
    protected popupService: PopupService
  ) {
    this.serviceAccounts = toSignal(
      this.organizationService.getAccounts(), { initialValue: [] });
  }

  /**
   * Called when a user presses the add service button.
   */
  onAddServiceAccount() {
    this.popupService.create(AddOrganizationPopupComponent, null, true);
  }

  /**
   * Called when a user presses the view about button.
   */
  onAboutClicked() {
    this.popupService.create(
      AboutPopupComponent, undefined, true);
  }
}
