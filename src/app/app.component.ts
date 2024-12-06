import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
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
  constructor(
    protected router: Router
  ) { }

  organizations: OrganizationModel[] = [
    {
      name: 'codeplaysoftware',
      icon: 'https://avatars.githubusercontent.com/u/7440916?s=48&v=4'
    },
    {
      name: 'jetbrains',
      icon: 'https://avatars.githubusercontent.com/u/878437?s=48&v=4'
    },
    {
      name: 'uxlfoundation',
      icon: 'https://avatars.githubusercontent.com/u/144704571?s=200&v=4'
    }
  ];

  selectedOrganization: OrganizationModel | undefined = this.organizations[0];

  onOrganizationSelected(organization: OrganizationModel) {
    this.router.navigateByUrl('/view/' + organization.name)
  }

  onAddOrg() {
    alert();
  }
}
