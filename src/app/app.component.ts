import { Component, signal, Signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ServiceAccountModel } from './shared/models/service-account.model';
import { NgClass } from '@angular/common';
import { ServiceStoreService } from './shared/services/service-store.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { PopupService } from './shared/components/popup/popup.service';
import { AddOrganizationPopupComponent } from './popups/add-service-account-popup/add-organization-popup.component';

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
  readonly serviceAccounts: Signal<ServiceAccountModel[]> = signal([]);

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
      this.organizationService.getServiceAccounts(), { initialValue: [] });
  }

  /**
   * Called when a user presses the add service button.
   */
  onAddServiceAccount() {
    this.popupService.create(AddOrganizationPopupComponent, null, true);
  }
}
