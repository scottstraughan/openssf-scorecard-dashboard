import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { RepositoryComponent } from '../shared/components/repository/repository.component';
import { SearchComponent } from '../shared/components/search/search.component';
import { RingComponent } from '../shared/components/ring/ring.component';
import { ActivatedRoute } from '@angular/router';
import { OrganizationModel } from '../shared/models/organization.model';
import { OrganizationService } from '../shared/services/organization.service';
import { LoadingComponent } from '../shared/components/loading/loading.component';
import { LoadingState } from '../shared/LoadingState';
import { tap } from 'rxjs';

@Component({
  selector: 'app-org-view',
  standalone: true,
  imports: [
    ButtonComponent,
    RepositoryComponent,
    SearchComponent,
    RingComponent,
    LoadingComponent
  ],
  templateUrl: './org-view.component.html',
  styleUrl: './org-view.component.scss'
})
export class OrgViewComponent implements OnInit {
  searchString: string = '';
  organization: OrganizationModel | undefined;
  loading: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  protected readonly LoadingState = LoadingState;

  constructor(
    protected activatedRoute: ActivatedRoute,
    protected organizationService: OrganizationService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.params
      .pipe(
        tap((params) => {
          this.loading.set(LoadingState.LOADING);

          this.organizationService.getOrganizationByTag(params['organization'])
            .subscribe((organization) => {
              this.organizationService.getOrganizationRepositories(organization)
                .subscribe(organization => this.organization = organization);

              this.loading.set(LoadingState.LOAD_SUCCESS);
            });
        })
      )
      .subscribe();
  }
}
