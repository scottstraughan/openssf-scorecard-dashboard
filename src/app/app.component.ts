import { Component, signal, Signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ServiceAccountModel } from './shared/models/service-account.model';
import { NgClass } from '@angular/common';
import { ServiceStoreService } from './shared/services/service-store.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { PopupService } from './shared/components/popup/popup.service';
import { AddSecurityKeyPopupComponent } from './add-security-key-popup/add-security-key-popup.component';
import { AddOrganizationPopupComponent } from './add-organization-popup/add-organization-popup.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgClass, RouterLinkActive, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  organizations: Signal<ServiceAccountModel[]> = signal([]);
  selectedOrganization: ServiceAccountModel | undefined;

  constructor(
    protected organizationService: ServiceStoreService,
    protected popupService: PopupService
  ) {
    this.organizations = toSignal(this.organizationService.getServiceAccounts(),
      { initialValue: ServiceStoreService.DEFAULT_ORGANIZATIONS });

    this.setSelectedOrganization(this.organizations()[0]);

    setTimeout(() => {
      //this.onAddOrg();
    })
  }

  setSelectedOrganization(organization: ServiceAccountModel) {
    this.selectedOrganization = organization;
  }

  onAddOrg() {
    this.popupService.create(AddOrganizationPopupComponent, null, true);
  }

  onAddAuthorizationKey() {
    this.popupService.create(AddSecurityKeyPopupComponent, null, true);
  }
}
