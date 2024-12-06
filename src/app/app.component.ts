import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OrganizationModel } from './shared/models/organization.model';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgClass],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'openssf-dashboard';

  organizations: OrganizationModel[] = [
    {
      name: 'codeplaysoftware',
      icon: 'https://avatars.githubusercontent.com/u/7440916?s=48&v=4'
    },
    {
      name: 'codeplaysoftware1',
      icon: 'https://avatars.githubusercontent.com/u/7440916?s=48&v=4'
    },
    {
      name: 'codeplaysoftware2',
      icon: 'https://avatars.githubusercontent.com/u/7440916?s=48&v=4'
    }
  ];

  selectedOrganization: OrganizationModel | undefined = this.organizations[0];


  onOrganizationSelected(organization: OrganizationModel) {
    this.selectedOrganization = organization;
  }

  onAddOrg() {
    alert();
  }

  protected readonly Object = Object;
}
