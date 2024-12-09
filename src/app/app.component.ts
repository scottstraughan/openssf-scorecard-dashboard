import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { OrganizationModel } from './shared/models/organization.model';
import { NgClass } from '@angular/common';
import { OrganizationService } from './shared/services/organization.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgClass, RouterLinkActive, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  organizations: OrganizationModel[] = [];
  selectedOrganization: OrganizationModel | undefined = this.organizations[0];

  constructor(
    protected router: Router,
    protected organizationService: OrganizationService,
  ) {
    this.organizations = this.organizationService.getOrganizations();
    this.setSelectedOrganization(this.organizations[0]);
  }

  setSelectedOrganization(organization: OrganizationModel) {
    this.selectedOrganization = organization;
  }

  onAddOrg() {
    alert();
  }
}
