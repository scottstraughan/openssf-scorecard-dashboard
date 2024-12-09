import { Component } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { RepositoryComponent } from '../shared/components/repository/repository.component';
import { SearchComponent } from '../shared/components/search/search.component';
import { RingComponent } from '../shared/components/ring/ring.component';
import { tap } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { OrganizationModel } from '../shared/models/organization.model';
import { OrganizationService } from '../shared/services/organization.service';

@Component({
  selector: 'app-org-view',
  standalone: true,
  imports: [
    ButtonComponent,
    RepositoryComponent,
    SearchComponent,
    RingComponent
  ],
  templateUrl: './org-view.component.html',
  styleUrl: './org-view.component.scss'
})
export class OrgViewComponent {
  searchString: string = '';
  organization: OrganizationModel | undefined;

  constructor(
    protected activatedRoute: ActivatedRoute,
    protected organizationService: OrganizationService,
  ) {
    this.activatedRoute.params
      .pipe(
        tap((params) => {
          this.organizationService.getOrganizationByTag(params['organization'])
            .subscribe((organization) => {
              this.organizationService.getOrganizationRepositories(organization)
                .subscribe(organization => this.organization = organization);
            });
        })
      )
      .subscribe();
  }
}
