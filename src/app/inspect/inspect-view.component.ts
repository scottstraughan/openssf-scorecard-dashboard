import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, signal, WritableSignal } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { RepositoryComponent } from '../shared/components/repository/repository.component';
import { SearchComponent } from '../shared/components/search/search.component';
import { RingComponent } from '../shared/components/ring/ring.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiceAccountModel } from '../shared/models/service-account.model';
import { ServiceStoreService } from '../shared/services/service-store.service';
import { LoadingComponent } from '../shared/components/loading/loading.component';
import { LoadingState } from '../shared/LoadingState';
import { catchError, forkJoin, Observable, of, Subscription, tap } from 'rxjs';
import { RepositoryModel } from '../shared/models/repository.model';
import { ScorecardService } from '../shared/services/scorecard.service';
import { NgClass } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ErrorPopupComponent } from '../popups/error-popup/error-popup.component';
import { PopupService } from '../shared/components/popup/popup.service';

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
  templateUrl: './inspect-view.component.html',
  styleUrl: './inspect-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InspectViewComponent implements OnInit {
  /**
   * The max number of repositories to show per "page".
   */
  static readonly RESULTS_PER_PAGE = 40;

  /**
   * For the UI, a reference to LoadingState.
   */
  readonly LoadingState = LoadingState;

  /**
   * For the UI, a reference to LayoutView.
   */
  readonly LayoutView = LayoutView;

  readonly serviceAccount: WritableSignal<ServiceAccountModel | undefined> = signal(undefined);
  readonly serviceAccountRepositories: WritableSignal<RepositoryModel[]> = signal([]);
  readonly loadingServiceAccounts: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly loadingServiceAccountRepositories: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly scorecardLoadingState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly totalRepositoriesWithScorecards: WritableSignal<number> = signal(0);
  readonly averageScorecardScore: WritableSignal<number> = signal(0);
  readonly layoutView: WritableSignal<LayoutView> = signal(LayoutView.GRID);
  readonly layoutVisibility: WritableSignal<LayoutVisibility> = signal(LayoutVisibility.ALL);
  readonly layoutSortMode: WritableSignal<LayoutSortMode> = signal(LayoutSortMode.NAME_ASC);
  readonly layoutVisibleResults: WritableSignal<number> = signal(InspectViewComponent.RESULTS_PER_PAGE);
  readonly searchString: WritableSignal<string> = signal('');

  public filteredRepositoriesCount: number = 0;
  private organizationSubscription: Subscription | undefined;
  private repositorySubscription: Subscription | undefined;

  /**
   * Constructor
   * @param activatedRoute
   * @param serviceStoreService
   * @param scorecardService
   * @param changeDetectorRef
   * @param router
   * @param title
   * @param popupService
   */
  constructor(
    protected activatedRoute: ActivatedRoute,
    protected serviceStoreService: ServiceStoreService,
    protected scorecardService: ScorecardService,
    protected changeDetectorRef: ChangeDetectorRef,
    protected router: Router,
    protected title: Title,
    protected popupService: PopupService
  ) { }

  /**
   * @inheritdoc
   */
  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      if (params['visible']) {
        this.layoutVisibility.set(params['visible']);
      }

      if (params['layout']) {
        this.layoutView.set(params['layout']);
      }

      if (params['sort']) {
        this.setSortMode(params['sort']);
      }
    });

    this.activatedRoute.params
      .pipe(
        tap((params) => {
          this.cleanup();

          this.loadingServiceAccounts.set(LoadingState.LOADING);
          this.loadingServiceAccountRepositories.set(LoadingState.LOADING);

          this.serviceAccountRepositories.set([]);

          this.organizationSubscription = this.serviceStoreService.getServiceAccountDetails(params['service'], params['account'])
            .pipe(
              tap((serviceAccount: ServiceAccountModel) => {
                this.serviceAccount.set(serviceAccount);
                this.loadingServiceAccounts.set(LoadingState.LOAD_SUCCESS);

                this.title.setTitle(serviceAccount.name + ' - ' + this.title.getTitle())

                this.repositorySubscription = this.serviceStoreService.getRepositories(
                  params['service'], params['account'], serviceAccount.apiToken)
                  .pipe(
                    tap((repositories) => {
                      this.serviceAccountRepositories.set(repositories);
                      this.loadingServiceAccountRepositories.set(LoadingState.LOAD_SUCCESS);
                      this.reloadScorecardResults();
                    }),
                    catchError((error) => {
                      this.handleErrorThrown(error);
                      return of(error);
                    })
                  )
                  .subscribe();
              }),
              catchError((error) => {
                this.handleErrorThrown(error);
                return of(error);
              })
            )
            .subscribe();
        })
      )
      .subscribe();
  }

  /**
   * Get a list of repositories after the results have had the sort filters applied.
   */
  getVisibleRepositories(): RepositoryModel[] {
    let repositories: RepositoryModel[] = this.getFilteredRepositories();

    if (this.layoutVisibility() == LayoutVisibility.SCORECARDS) {
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
        return aScore > bScore ? 1 : -1;
      } else if (this.layoutSortMode() == LayoutSortMode.SCORE_DESC) {
        return bScore > aScore ? 1 : -1;
      }

      return 0;
    });

    this.filteredRepositoriesCount = repositories.length;
    return repositories.slice(0, this.layoutVisibleResults());
  }

  /**
   * Reload all the scorecard results.
   */
  reloadScorecardResults() {
    const organization = this.serviceAccount();

    if (!organization) {
      return ;
    }

    const scorecardObservables: Observable<number | undefined>[] = [];

    for (const repository of this.serviceAccountRepositories()) {
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
   * Reload a specific repository scorecard.
   * @param repository
   */
  onReloadScorecard(
    repository: RepositoryModel
  ) {
    const organization = this.serviceAccount();

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

  /**
   * Called when a user presses the toggle layout button.
   */
  onToggleLayout() {
    if (this.layoutView() == LayoutView.GRID) {
      this.layoutView.set(LayoutView.LIST);
    } else {
      this.layoutView.set(LayoutView.GRID);
    }

    this.navigateWithQueryParams({
      'layout': this.layoutView()
    });
  }

  /**
   * Called when a user presses the toggle visibility button.
   */
  onToggleVisibility() {
    switch (this.layoutVisibility()) {
      case LayoutVisibility.ALL:
        this.layoutVisibility.set(LayoutVisibility.SCORECARDS);
        break;
      case LayoutVisibility.SCORECARDS:
        this.layoutVisibility.set(LayoutVisibility.ALL);
        break;
    }

    this.navigateWithQueryParams({
      'visible': this.layoutVisibility()
    });
  }

  /**
   * Set the sort mode.
   * @param sortMode
   */
  setSortMode(
    sortMode: LayoutSortMode
  ) {
    this.layoutSortMode.set(sortMode);

    this.navigateWithQueryParams({
      'sort': sortMode
    });
  }

  /**
   * Get a UI icon for a give element.
   * @param element
   */
  getIcon(
    element: string
  ) {
    if (element == 'sort') {
      switch (this.layoutSortMode()) {
        case LayoutSortMode.NAME_DESC:
        case LayoutSortMode.SCORE_ASC:
          return 'arrow_upward';
        case LayoutSortMode.NAME_ASC:
        case LayoutSortMode.SCORE_DESC:
          return 'arrow_downward';
      }
    } else if (element == 'layout') {
      if (this.layoutView() == LayoutView.GRID) {
        return 'grid_view';
      } else if (this.layoutView() == LayoutView.LIST) {
        return 'view_list';
      }
    } else if (element == 'visibility') {
      if (this.layoutVisibility()) {
        return 'visibility';
      } else {
        return 'visibility_off';
      }
    }

    return 'mood';
  }

  /**
   * Called when a user presses the sort toggle button.
   */
  onToggleSortMode() {
    switch (this.layoutSortMode()) {
      case LayoutSortMode.NAME_ASC: {
        this.setSortMode(LayoutSortMode.NAME_DESC);
        break;
      }
      case LayoutSortMode.NAME_DESC: {
        this.setSortMode(LayoutSortMode.SCORE_ASC);
        break;
      }
      case LayoutSortMode.SCORE_ASC: {
        this.setSortMode(LayoutSortMode.SCORE_DESC);
        break;
      }
      case LayoutSortMode.SCORE_DESC: {
        this.setSortMode(LayoutSortMode.NAME_ASC);
        break;
      }
    }
  }

  /**
   * Get the sort label for the UI toggle button.
   */
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

  /**
   * Called when a user clicks the "view more" button in the UI.
   */
  onViewMore() {
    this.layoutVisibleResults.set(
      this.layoutVisibleResults() + InspectViewComponent.RESULTS_PER_PAGE);
  }

  /**
   * Called when a user presses the delete service account button.
   */
  onDeleteServiceAccount() {
    const serviceAccount = this.serviceAccount();

    if (!serviceAccount) {
      return  ;
    }

    try {
      // Delete the account
      this.serviceStoreService.delete(serviceAccount);

      // On success, navigate to the root where we will redirect to the correct place
      this.router.navigate(['/']).then();
    } catch (e) {
      this.handleErrorThrown(e);
    }
  }

  /**
   * Show an error popup.
   */
  handleErrorThrown(
    error: any
  ) {
    this.popupService.create(
      ErrorPopupComponent, ErrorPopupComponent.handleErrorThrown(error), true);
  }

  /**
   * Recalculate the average score for all repositories.
   */
  private recalculateScorecards() {
    let totalScore = 0;
    let scoreCount = 0;

    for (const repository of this.serviceAccountRepositories()) {
      if (repository.scorecard?.score) {
        totalScore += repository.scorecard.score;
        scoreCount += 1;
      }
    }

    this.totalRepositoriesWithScorecards.set(scoreCount);
    this.averageScorecardScore.set(Number(Math.round(totalScore / scoreCount).toFixed(2)));
  }

  /**
   * Get a list of repositories after the results have been filtered.
   */
  private getFilteredRepositories(): RepositoryModel[] {
    let repositories: RepositoryModel[] = this.serviceAccountRepositories().slice();

    const searchString = this.searchString();

    if (searchString.length > 0) {
      repositories = repositories.filter((repo) =>
        JSON.stringify(repo).toLowerCase().includes(searchString));
    }

    return repositories;
  }

  /**
   * Cleanup the UI.
   */
  private cleanup() {
    if (this.repositorySubscription) {
      this.repositorySubscription.unsubscribe();
    }

    if (this.organizationSubscription) {
      this.organizationSubscription.unsubscribe();
    }

    this.scorecardLoadingState.set(LoadingState.LOADING);
    this.loadingServiceAccounts.set(LoadingState.LOADING);
    this.loadingServiceAccountRepositories.set(LoadingState.LOADING);
    this.totalRepositoriesWithScorecards.set(0);
    this.averageScorecardScore.set(0);
  }

  /**
   * Updates the query params, merging values and ensuring the page doesn't reload.
   * @param queryParams
   * @private
   */
  private navigateWithQueryParams(
    queryParams: {}
  ) {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams,
      queryParamsHandling: 'merge'
    }).then();
  }
}

/**
 * Enum for layout views.
 */
enum LayoutView {
  GRID = 'GRID',
  LIST = 'LIST'
}

/**
 * Enum for layout sort modes.
 */
enum LayoutSortMode {
  NAME_ASC = 'NAME_ASC',
  NAME_DESC = 'NAME_DESC',
  SCORE_ASC = 'SCORE_ASC',
  SCORE_DESC = 'SCORE_DESC',
}

/**
 * Enum for layout visibility.
 */
enum LayoutVisibility {
  ALL = 'ALL',
  SCORECARDS = 'WITH_SCORECARDS'
}
