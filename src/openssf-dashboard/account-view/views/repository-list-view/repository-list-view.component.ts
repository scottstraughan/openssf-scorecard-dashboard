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
  WritableSignal } from '@angular/core';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { RepositoryWidgetComponent } from '../../components/repository-widget/repository-widget.component';
import { ScoreRingComponent } from '../../../shared/components/score-ring/score-ring.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { NgClass } from '@angular/common';
import { AccountModel } from '../../../shared/models/account.model';
import { RepositoryModel } from '../../../shared/models/repository.model';
import { LoadingState } from '../../../shared/LoadingState';
import { Subject, takeUntil, tap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { SelectedAccountService } from '../../../shared/services/selected-account.service';

@Component({
  selector: 'osd-repository-list-view',
  standalone: true,
  imports: [
    ButtonComponent,
    RepositoryWidgetComponent,
    InputComponent,
    ScoreRingComponent,
    LoadingComponent,
    NgClass
  ],
  templateUrl: './repository-list-view.component.html',
  styleUrl: './repository-list-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RepositoryListViewComponent implements OnInit, OnDestroy {
  /**
   * The max number of repositories to show per "page".
   */
  static readonly RESULTS_PER_PAGE = 30;

  readonly LoadingState = LoadingState;
  readonly LayoutView = LayoutView;

  readonly selectedAccount: WritableSignal<AccountModel | undefined> = signal(undefined);
  readonly selectedAccountRepositories: WritableSignal<RepositoryModel[]> = signal([]);
  readonly fatalError: WritableSignal<boolean> = signal(false);

  readonly repositoryLoadState: WritableSignal<LoadingState> = signal(LoadingState.LOADING);

  readonly layoutView: WritableSignal<LayoutView> = signal(LayoutView.GRID);
  readonly layoutVisibility: WritableSignal<LayoutVisibility> = signal(LayoutVisibility.ALL);
  readonly layoutSortMode: WritableSignal<LayoutSortMode> = signal(LayoutSortMode.NAME_ASC);
  readonly layoutVisibleResults: WritableSignal<number> = signal(RepositoryListViewComponent.RESULTS_PER_PAGE);
  readonly searchString: WritableSignal<string> = signal('');

  public filteredRepositoriesCount: number = 0;
  private cleanup = new Subject<void>();

  /**
   * Constructor
   * @param router
   * @param activatedRoute
   * @param changeDetectorRef
   * @param selectedAccountService
   */
  constructor(
    protected router: Router,
    protected activatedRoute: ActivatedRoute,
    protected changeDetectorRef: ChangeDetectorRef,
    protected selectedAccountService: SelectedAccountService,
  ) { }

  /**
   * @inheritdoc
   */
  ngOnInit(): void {
    this.selectedAccountService.account$
      .pipe(
        tap(account => this.selectedAccount.set(account)),
        takeUntil(this.cleanup)
      )
      .subscribe();

    this.selectedAccountService.repositoriesLoadState$
      .pipe(
        tap(loadState => this.repositoryLoadState.set(loadState)),
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
      .subscribe();

    this.selectedAccountService.scorecardsLoading$
      .pipe(
        tap(loaded => {
          if (loaded == LoadingState.LOAD_SUCCESS) {
            this.changeDetectorRef.detectChanges();
          }
        }),
        takeUntil(this.cleanup)
      )
      .subscribe();

    this.activatedRoute.queryParams.subscribe(params => {
      this.layoutVisibility.set(params['visible'] ? params['visible'] : LayoutVisibility.ALL);
      this.layoutView.set(params['layout'] ? params['layout'] : LayoutView.GRID);
      this.setSortMode(params['sort'] ? params['sort'] : LayoutSortMode.NAME_ASC);

      this.changeDetectorRef.detectChanges();
    });
  }

  /**
   * @inheritdoc
   */
  ngOnDestroy() {
    this.reset();
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
      this.layoutVisibleResults() + RepositoryListViewComponent.RESULTS_PER_PAGE);
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
    this.cleanup.next();
    this.cleanup.complete();

    this.fatalError.set(false);
    this.selectedAccount.set(undefined);
    this.selectedAccountRepositories.set([]);

    this.repositoryLoadState.set(LoadingState.LOADING);

    /**
     * this.layoutView.set(LayoutView.GRID);
     *     this.layoutVisibility.set(LayoutVisibility.ALL);
     *     this.layoutSortMode.set(LayoutSortMode.NAME_ASC);
     *     this.layoutVisibleResults.set(RepositoryListViewComponent.RESULTS_PER_PAGE);
     */
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
