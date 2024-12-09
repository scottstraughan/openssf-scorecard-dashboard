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
import { Subscription, tap } from 'rxjs';
import { RepositoryModel } from '../shared/models/repository.model';

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
  readonly LoadingState = LoadingState;
  readonly organization: WritableSignal<OrganizationModel | undefined> = signal(undefined);
  readonly repositories: WritableSignal<RepositoryModel[]> = signal([]);
  readonly loadingOrganization: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly loadingRepositories: WritableSignal<LoadingState> = signal(LoadingState.LOADING);

  searchString: string = '';
  organizationSubscription: Subscription | undefined;
  repositorySubscription: Subscription | undefined;

  constructor(
    protected activatedRoute: ActivatedRoute,
    protected organizationService: OrganizationService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.params
      .pipe(
        tap((params) => {
          if (this.repositorySubscription) {
            this.repositorySubscription.unsubscribe();
          }

          if (this.organizationSubscription) {
            this.organizationSubscription.unsubscribe();
          }

          this.loadingOrganization.set(LoadingState.LOADING);
          this.loadingRepositories.set(LoadingState.LOADING);
          this.repositories.set([]);

          this.organizationSubscription = this.organizationService.getOrganizationByTag(params['organization'])
            .subscribe((organization) => {
              this.organization.set(organization);
              this.loadingOrganization.set(LoadingState.LOAD_SUCCESS);

              this.repositorySubscription = this.organizationService.getOrganizationRepositories(organization)
                .subscribe((repositories) => {
                  this.repositories.set(repositories);
                  this.loadingRepositories.set(LoadingState.LOAD_SUCCESS);
                });
            });
        })
      )
      .subscribe();
  }
}
