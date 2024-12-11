import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, signal, WritableSignal } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { RepositoryComponent } from '../shared/components/repository/repository.component';
import { SearchComponent } from '../shared/components/search/search.component';
import { RingComponent } from '../shared/components/ring/ring.component';
import { ActivatedRoute } from '@angular/router';
import { OrganizationModel } from '../shared/models/organization.model';
import { OrganizationService } from '../shared/services/organization.service';
import { LoadingComponent } from '../shared/components/loading/loading.component';
import { LoadingState } from '../shared/LoadingState';
import { forkJoin, Observable, Subscription, tap } from 'rxjs';
import { RepositoryModel } from '../shared/models/repository.model';
import { ScorecardService } from '../shared/services/scorecard.service';

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
  styleUrl: './org-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgViewComponent implements OnInit {
  readonly LoadingState = LoadingState;
  readonly organization: WritableSignal<OrganizationModel | undefined> = signal(undefined);
  readonly repositories: WritableSignal<RepositoryModel[]> = signal([]);
  readonly filteredRepositories: WritableSignal<RepositoryModel[]> = signal([]);
  readonly visibleRepositories: WritableSignal<RepositoryModel[]> = signal([]);

  readonly loadingOrganization: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly loadingRepositories: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly scorecardLoadingState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);

  readonly totalRepositoriesWithScorecards: WritableSignal<number> = signal(0);
  readonly averageScorecardScore: WritableSignal<number> = signal(0);

  searchString: WritableSignal<string> = signal('');
  organizationSubscription: Subscription | undefined;
  repositorySubscription: Subscription | undefined;

  constructor(
    protected activatedRoute: ActivatedRoute,
    protected organizationService: OrganizationService,
    protected scorecardService: ScorecardService,
    protected changeDetectorRef: ChangeDetectorRef
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
          this.filteredRepositories.set([]);
          this.visibleRepositories.set([]);

          this.organizationSubscription = this.organizationService.getOrganizationByTag(params['organization'])
            .subscribe((organization) => {
              this.organization.set(organization);
              this.loadingOrganization.set(LoadingState.LOAD_SUCCESS);

              this.repositorySubscription = this.organizationService.getOrganizationRepositories(organization)
                .subscribe((repositories) => {
                  this.repositories.set(repositories);
                  this.filteredRepositories.set(repositories);
                  this.visibleRepositories.set(repositories);

                  this.reloadScorecardResults();

                  this.loadingRepositories.set(LoadingState.LOAD_SUCCESS);
                });
            });
        })
      )
      .subscribe();
  }

  reloadScorecardResults() {
    const organization = this.organization();

    if (!organization) {
      return ;
    }

    const scorecardObservables: Observable<number | undefined>[] = [];

    for (const repository of this.repositories()) {
      repository.scorecard = undefined;

      scorecardObservables.push(
        this.scorecardService.getScore(organization, repository)
          .pipe(
            tap((score) => repository.scorecard = {
              score: score
            })
          )
      );
    }

    this.scorecardLoadingState.set(LoadingState.LOADING);

    forkJoin(scorecardObservables)
      .subscribe(() => {
        this.recalculateScorecards();
        this.scorecardLoadingState.set(LoadingState.LOAD_SUCCESS);
        this.changeDetectorRef.detectChanges();
      });
  }

  /**
   * Recalculate the average score for all repositories.
   */
  recalculateScorecards() {
    let totalScore = 0;
    let scoreCount = 0;

    for (const repository of this.repositories()) {
      if (repository.scorecard?.score) {
        totalScore += repository.scorecard.score;
        scoreCount += 1;
      }
    }

    this.totalRepositoriesWithScorecards.set(scoreCount);
    this.averageScorecardScore.set(Number(Math.round(totalScore / scoreCount).toFixed(2)));

    this.organizationService.getOrganizations()
  }

  onSearchValueChanged() {
    const matchedRepos = [];
    const searchString = this.searchString().toLowerCase();

    if (searchString.length > 0) {
      for (const repo of this.repositories()) {
        if (repo.name.toLowerCase().includes(searchString)) {
          matchedRepos.push(repo);
        }
      }

      this.filteredRepositories.set(matchedRepos);
    } else {
      this.filteredRepositories.set(this.repositories());
    }
  }

  onReloadScorecard(repository: RepositoryModel) {
    const organization = this.organization();

    if (!organization) {
      return ;
    }

    repository.scorecard = undefined;

    this.scorecardService.getScore(organization, repository)
      .subscribe((score) => {
        repository.scorecard = {
          score: score
        };

        this.recalculateScorecards();
        this.changeDetectorRef.detectChanges();
      });
  }
}
