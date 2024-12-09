import { Component } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { RepositoryComponent } from '../shared/components/repository/repository.component';
import { RepositoryModel } from '../shared/models/repository.model';
import { readableStreamLikeToAsyncGenerator } from 'rxjs/internal/util/isReadableStreamLike';
import { SearchComponent } from '../shared/components/search/search.component';
import { RingComponent } from '../shared/components/ring/ring.component';
import { tap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
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
    protected router: Router,
    protected organizationService: OrganizationService,
  ) {
    this.activatedRoute.params
      .pipe(
        tap((params) => {
          for (const o of this.organizationService.getOrganizations()) {
            if (o.name == params['organization']) {
              this.organization = o;
            }
          }
        })
      )
      .subscribe();
  }


  repositories: RepositoryModel[] = [
    {
      name: 'repo1'
    },
    {
      name: 'repo2'
    },
    {
      name: 'repo3'
    },
    {
      name: 'repo4'
    },
    {
      name: 'repo5'
    },
    {
      name: 'repo6'
    }
  ];
}
