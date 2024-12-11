import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, signal, WritableSignal } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { RepositoryComponent } from '../shared/components/repository/repository.component';
import { SearchComponent } from '../shared/components/search/search.component';
import { RingComponent } from '../shared/components/ring/ring.component';
import { ActivatedRoute } from '@angular/router';
import { ServiceAccountModel } from '../shared/models/service-account.model';
import { ServiceStoreService } from '../shared/services/service-store.service';
import { LoadingComponent } from '../shared/components/loading/loading.component';
import { LoadingState } from '../shared/LoadingState';
import { forkJoin, Observable, Subscription, tap } from 'rxjs';
import { RepositoryModel } from '../shared/models/repository.model';
import { ScorecardService } from '../shared/services/scorecard.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-org-view',
  standalone: true,
  imports: [
    ButtonComponent,
    RepositoryComponent,
    SearchComponent,
    RingComponent,
    LoadingComponent,
    NgClass
  ],
  templateUrl: './org-view.component.html',
  styleUrl: './org-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgViewComponent implements OnInit {
  static RESULTS_PER_PAGE = 40;

  readonly LoadingState = LoadingState;
  readonly organization: WritableSignal<ServiceAccountModel | undefined> = signal(undefined);

  readonly repositories: WritableSignal<RepositoryModel[]> = signal([]);
  filteredRepositoriesCount: number = 0;

  readonly loadingOrganization: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly loadingRepositories: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly scorecardLoadingState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);

  readonly totalRepositoriesWithScorecards: WritableSignal<number> = signal(0);
  readonly averageScorecardScore: WritableSignal<number> = signal(0);

  readonly layoutView: WritableSignal<LayoutView> = signal(LayoutView.GRID);
  readonly layoutShowReposWithoutScorecards: WritableSignal<boolean> = signal(true);
  readonly layoutSortMode: WritableSignal<LayoutSortMode> = signal(LayoutSortMode.NAME_ASC);
  readonly layoutVisibleResults: WritableSignal<number> = signal(OrgViewComponent.RESULTS_PER_PAGE);

  readonly searchString: WritableSignal<string> = signal('');
  organizationSubscription: Subscription | undefined;
  repositorySubscription: Subscription | undefined;

  constructor(
    protected activatedRoute: ActivatedRoute,
    protected serviceStoreService: ServiceStoreService,
    protected scorecardService: ScorecardService,
    protected changeDetectorRef: ChangeDetectorRef
  ) { }

  getFilteredRepositories(): RepositoryModel[] {
    let repositories: RepositoryModel[] = this.repositories().slice();

    const searchString = this.searchString();

    if (searchString.length > 0) {
      repositories = repositories.filter((repo) =>
        JSON.stringify(repo).toLowerCase().includes(searchString));
    }

    return repositories;
  }

  getVisibleRepositories(): RepositoryModel[] {
    let repositories: RepositoryModel[] = this.getFilteredRepositories();

    if (!this.layoutShowReposWithoutScorecards()) {
      repositories = repositories.filter(
        (repo) => repo.scorecard?.score !== undefined);
    }

    repositories.sort((a, b) => {
      const aScore = a.scorecard?.score !== undefined ? a.scorecard.score : 0;
      const bScore = b.scorecard?.score !== undefined ? b.scorecard.score : 0;

      if (this.layoutSortMode() == LayoutSortMode.NAME_ASC) {
        return a.name.localeCompare(b.name)
      } else if (this.layoutSortMode() == LayoutSortMode.NAME_DESC) {
        return b.name.localeCompare(a.name)
      } else if (this.layoutSortMode() == LayoutSortMode.SCORE_ASC) {
        return aScore > bScore ? -1 : 1;
      } else if (this.layoutSortMode() == LayoutSortMode.SCORE_DESC) {
        return bScore > aScore ? -1 : 1;
      }

      return 0;
    });

    this.filteredRepositoriesCount = repositories.length;
    return repositories.slice(0, this.layoutVisibleResults());
  }

  ngOnInit(): void {
    this.activatedRoute.params
      .pipe(
        tap((params) => {
          this.cleanup();

          this.loadingOrganization.set(LoadingState.LOADING);
          this.loadingRepositories.set(LoadingState.LOADING);

          this.repositories.set([]);

          this.organizationSubscription = this.serviceStoreService.getServiceAccountDetails(params['service'], params['account'])
            .subscribe((organization) => {
              this.organization.set(organization);
              this.loadingOrganization.set(LoadingState.LOAD_SUCCESS);

              this.repositorySubscription = this.serviceStoreService.getRepositories(params['service'], params['account'])
                .pipe(
                  tap((repositories) => {
                    this.repositories.set(repositories);
                    this.loadingRepositories.set(LoadingState.LOAD_SUCCESS);
                    this.reloadScorecardResults();
                  })
                )
                .subscribe();
            });
        })
      )
      .subscribe();
  }

  cleanup() {
    if (this.repositorySubscription) {
      this.repositorySubscription.unsubscribe();
    }

    if (this.organizationSubscription) {
      this.organizationSubscription.unsubscribe();
    }

    this.loadingOrganization.set(LoadingState.LOADING);
    this.loadingRepositories.set(LoadingState.LOADING);
    this.totalRepositoriesWithScorecards.set(0);
    this.averageScorecardScore.set(0);
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

    if (scorecardObservables.length > 0) {
      this.scorecardLoadingState.set(LoadingState.LOADING);

      forkJoin(scorecardObservables)
        .subscribe(() => {
          this.recalculateScorecards();
          this.scorecardLoadingState.set(LoadingState.LOAD_SUCCESS);
          this.changeDetectorRef.detectChanges();
        });
    } else {
      this.scorecardLoadingState.set(LoadingState.LOAD_SUCCESS);
    }
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
  }

  onSearchValueChanged() {
    //
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

  onToggleLayout() {
    if (this.layoutView() == LayoutView.GRID) {
      this.layoutView.set(LayoutView.LIST);
    } else {
      this.layoutView.set(LayoutView.GRID);
    }
  }

  getLayoutIcon() {
    switch(this.layoutView()) {
      case LayoutView.LIST: return 'view_list'
      case LayoutView.GRID: return 'grid_view'
    }
  }

  protected readonly LayoutView = LayoutView;

  onToggleRepoVisibility() {
    this.layoutShowReposWithoutScorecards.set(!this.layoutShowReposWithoutScorecards());
  }

  getVisibilityIcon() {
    return this.layoutShowReposWithoutScorecards() ? 'visibility' : 'visibility_off'
  }

  onToggleSortMode() {
    switch (this.layoutSortMode()) {
      case LayoutSortMode.NAME_ASC: {
        this.layoutSortMode.set(LayoutSortMode.NAME_DESC);
        break;
      }
      case LayoutSortMode.NAME_DESC: {
        this.layoutSortMode.set(LayoutSortMode.SCORE_ASC);
        break;
      }
      case LayoutSortMode.SCORE_ASC: {
        this.layoutSortMode.set(LayoutSortMode.SCORE_DESC);
        break;
      }
      case LayoutSortMode.SCORE_DESC: {
        this.layoutSortMode.set(LayoutSortMode.NAME_ASC);
        break;
      }
    }
  }

  getSortLabel() {
    switch (this.layoutSortMode()) {
      case LayoutSortMode.NAME_ASC:
      case LayoutSortMode.NAME_DESC:
        return 'Name';
      case LayoutSortMode.SCORE_ASC:
      case LayoutSortMode.SCORE_DESC:
        return 'Score';
    }
  }

  getSortIcon() {
    switch (this.layoutSortMode()) {
      case LayoutSortMode.NAME_ASC:
      case LayoutSortMode.SCORE_ASC:
        return 'arrow_downward';
      case LayoutSortMode.NAME_DESC:
      case LayoutSortMode.SCORE_DESC:
        return 'arrow_upward';
    }
  }

  onViewMore() {
    this.layoutVisibleResults.set(this.layoutVisibleResults() + OrgViewComponent.RESULTS_PER_PAGE);
  }
}

enum LayoutView {
  GRID,
  LIST
}

enum LayoutSortMode {
  NAME_ASC,
  NAME_DESC,
  SCORE_ASC,
  SCORE_DESC
}
