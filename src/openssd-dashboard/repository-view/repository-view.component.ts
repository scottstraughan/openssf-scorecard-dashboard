/*---------------------------------------------------------------------------------------------
 *
 *  Copyright (C) Codeplay Software Ltd.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *--------------------------------------------------------------------------------------------*/

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  signal,
  WritableSignal
} from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { RepositoryWidgetComponent } from './components/repository/repository-widget.component';
import { InputComponent } from '../shared/components/input/input.component';
import { ScoreRingComponent } from '../shared/components/score-ring/score-ring.component';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountModel } from '../shared/models/account.model';
import { LoadingComponent } from '../shared/components/loading/loading.component';
import { LoadingState } from '../shared/LoadingState';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import { RepositoryModel } from '../shared/models/repository.model';
import { NgClass } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ErrorPopupComponent } from '../shared/popups/error-popup/error-popup.component';
import { PopupService } from '../shared/components/popup/popup.service';
import { SelectedAccountService } from '../shared/services/selected-account.service';
import { AccountService } from '../shared/services/account.service';

@Component({
  selector: 'osd-repository-view',
  standalone: true,
  imports: [
    ButtonComponent,
    RepositoryWidgetComponent,
    InputComponent,
    ScoreRingComponent,
    LoadingComponent,
    NgClass
  ],
  templateUrl: './repository-view.component.html',
  styleUrl: './repository-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RepositoryViewComponent implements OnInit, OnDestroy {
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

  readonly selectedAccount: WritableSignal<AccountModel | undefined> = signal(undefined);
  readonly selectedAccountRepositories: WritableSignal<RepositoryModel[]> = signal([]);
  readonly fatalError: WritableSignal<boolean> = signal(false);

  readonly accountLoadState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly repositoryLoadState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly scorecardLoadState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);

  readonly totalRepositoriesWithScorecards: WritableSignal<number> = signal(0);
  readonly averageScorecardScore: WritableSignal<number> = signal(0);
  readonly layoutView: WritableSignal<LayoutView> = signal(LayoutView.GRID);
  readonly layoutVisibility: WritableSignal<LayoutVisibility> = signal(LayoutVisibility.ALL);
  readonly layoutSortMode: WritableSignal<LayoutSortMode> = signal(LayoutSortMode.NAME_ASC);
  readonly layoutVisibleResults: WritableSignal<number> = signal(RepositoryViewComponent.RESULTS_PER_PAGE);
  readonly searchString: WritableSignal<string> = signal('');

  public filteredRepositoriesCount: number = 0;
  private cleanup = new Subject<void>();

  /**
   * Constructor
   * @param activatedRoute
   * @param changeDetectorRef
   * @param router
   * @param title
   * @param popupService
   * @param selectedAccountService
   * @param accountService
   */
  constructor(
    protected activatedRoute: ActivatedRoute,
    protected changeDetectorRef: ChangeDetectorRef,
    protected router: Router,
    protected title: Title,
    protected popupService: PopupService,
    protected selectedAccountService: SelectedAccountService,
    protected accountService: AccountService
  ) { }

  /**
   * @inheritdoc
   */
  ngOnInit(): void {
    this.selectedAccountService.repositoriesLoadState$
      .pipe(
        tap(loadState => this.repositoryLoadState.set(loadState)),
        takeUntil(this.cleanup)
      )
      .subscribe();

    this.selectedAccountService.scorecardsLoading$
      .pipe(
        tap(loadState => {
          this.scorecardLoadState.set(loadState);

          if (loadState == LoadingState.LOAD_SUCCESS) {
            this.averageScorecardScore.set(this.selectedAccountService.calculateAverageScore());
            this.totalRepositoriesWithScorecards.set(this.selectedAccountService.countValidScorecards());
          }
        }),
        takeUntil(this.cleanup)
      )
      .subscribe();

    this.selectedAccountService.repositories$
      .pipe(
        tap(repositories => {
          this.selectedAccountRepositories.set(repositories);
        }),
        takeUntil(this.cleanup)
      )
      .subscribe()

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
          this.reset();

          this.selectedAccountService.setAccount(params['service'], params['account'])
            .pipe(
              tap(account => {
                this.title.setTitle(account.name + ' - ' + this.title.getTitle());
                this.selectedAccount.set(account);
                this.accountLoadState.set(LoadingState.LOAD_SUCCESS);
              }),
              catchError((error) => {
                this.handleErrorThrown(error);
                this.fatalError.set(true);
                return of(error);
              }),
              takeUntil(this.cleanup)
            )
            .subscribe();
        }),
      )
      .subscribe();
  }

  /**
   * @inheritdoc
   */
  ngOnDestroy() {
    this.cleanup.next();
    this.cleanup.complete();
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
    const account = this.selectedAccount();

    if (!account) {
      return ;
    }

    this.selectedAccountService.reloadScorecards(account);
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
      if (this.layoutVisibility() == LayoutVisibility.ALL) {
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
      this.layoutVisibleResults() + RepositoryViewComponent.RESULTS_PER_PAGE);
  }

  /**
   * Called when a user presses the delete service account button.
   */
  onDeleteServiceAccount() {
    const serviceAccount = this.selectedAccount();

    if (!serviceAccount) {
      return  ;
    }

    try {
      // Delete the account
      this.accountService.delete(serviceAccount);

      // On success, navigate to the root where we will redirect to the correct place
      this.router.navigate(['/']).then();
    } catch (e) {
      this.handleErrorThrown(e);
    }
  }

  /**
   * Show an error popup.
   */
  private handleErrorThrown(
    error: any
  ) {
    setTimeout(() => {
      this.popupService.create(
        ErrorPopupComponent, ErrorPopupComponent.handleErrorThrown(error), true);

      console.error(error);
    });
  }

  /**
   * Get a list of repositories after the results have been filtered.
   */
  private getFilteredRepositories(): RepositoryModel[] {
    let repositories: RepositoryModel[] = this.selectedAccountRepositories().slice();

    const searchString = this.searchString();

    if (searchString.length > 0) {
      repositories = repositories.filter((repo) =>
        JSON.stringify(repo).toLowerCase().includes(searchString));
    }

    return repositories;
  }

  /**
   * Reset the UI.
   */
  private reset() {
    this.fatalError.set(false);
    this.selectedAccount.set(undefined);
    this.selectedAccountRepositories.set([]);

    this.accountLoadState.set(LoadingState.LOADING);
    this.repositoryLoadState.set(LoadingState.LOADING);
    this.scorecardLoadState.set(LoadingState.LOADING);

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
