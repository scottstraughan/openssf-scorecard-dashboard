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
  effect,
  OnDestroy,
  OnInit,
  signal,
  WritableSignal
} from '@angular/core';
import { LinkButtonComponent } from '../../../shared/components/link-button/link-button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { RepositoryWidgetComponent } from '../../components/repository-widget/repository-widget.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { AccountModel } from '../../../shared/models/account.model';
import { RepositoryModel } from '../../../shared/models/repository.model';
import { LoadingState } from '../../../shared/loading-state';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { AccountViewModelService } from '../../../shared/services/account-view-model.service';
import { KeyValueStore } from '../../../shared/services/storage/key-value.service';
import {
  MultiToggleButtonComponent,
  ToggleButtonItem
} from '../../../shared/components/multi-toggle-button/multi-toggle-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RepositoryCollection } from '../../../shared/services/api/base-api-service';
import { ErrorService } from '../../../shared/services/error.service';

@Component({
  selector: 'ossfd-repository-list-view',
  standalone: true,
  imports: [
    LinkButtonComponent,
    RepositoryWidgetComponent,
    InputComponent,
    LoadingComponent,
    MultiToggleButtonComponent,
    IconComponent
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

  readonly LayoutView = LayoutView;
  readonly LayoutVisibility = LayoutVisibility;

  readonly selectedAccount: WritableSignal<AccountModel | undefined> = signal(undefined);
  readonly repositories: WritableSignal<RepositoryCollection> = signal(new RepositoryCollection());
  readonly loadingPercentage: WritableSignal<number> = signal(0);

  readonly layoutView: WritableSignal<LayoutView> = signal(LayoutView.GRID);
  readonly layoutSortMode: WritableSignal<LayoutSortMode> = signal(LayoutSortMode.NAME_ASC);
  readonly layoutVisibleResults: WritableSignal<number> = signal(RepositoryListViewComponent.RESULTS_PER_PAGE);
  readonly searchString: WritableSignal<string> = signal('');

  readonly hideNoScorecardRepos: WritableSignal<boolean> = signal(false);
  readonly hideArchivedRepos: WritableSignal<boolean> = signal(false);

  public filteredRepositoriesCount: number = 0;
  private cleanup = new Subject<void>();

  /**
   * Constructor
   */
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef,
    private selectedAccountService: AccountViewModelService,
    private transientStorage: KeyValueStore,
    private errorService: ErrorService
  ) {
    effect(() => {
      // Save changes to the ui settings to the storage
      this.setStorageValue('layout', this.layoutView());
      this.setStorageValue('sort', this.layoutSortMode());
      this.setStorageValue('hide-nsr', this.hideNoScorecardRepos());
      this.setStorageValue('hide-ar', this.hideArchivedRepos());
    });
  }

  /**
   * @inheritdoc
   */
  ngOnInit(): void {
    this.selectedAccountService.observeAccount()
      .pipe(
        // When the account changes, reset the view
        tap(() =>
          this.reset()),

        // Set the selected account
        tap(account =>
          this.selectedAccount.set(account)),

        // Take until cleanup
        takeUntil(this.cleanup)
      )
      .subscribe();

    this.selectedAccountService.observeRepositories()
      .pipe(
        // Update repositories signal
        tap(repositories =>
          this.repositories.set(repositories)),

        // Update progress signal
        tap(repositoryLoadState =>
          this.loadingPercentage.set(repositoryLoadState.loadPercentage())),

        // Handle any errors
        catchError(error => {
          this.errorService.handleError(error);
          return of(error);
        }),

        // Close on cleanup
        takeUntil(this.cleanup),
      )
      .subscribe();

    this.selectedAccountService.observeScorecardsLoading()
      .pipe(
        // Detect any new changes on LOAD_SUCCESS
        tap(loaded =>
          loaded == LoadingState.LOAD_SUCCESS && this.changeDetectorRef.detectChanges()),

        // Close on cleanup
        takeUntil(this.cleanup)
      )
      .subscribe();

    this.activatedRoute.queryParams.subscribe(params => {
      if (Object.keys(params).length == 0) {
        this.navigateWithQueryParams({
          'layout': this.getStorageValue('layout'),
          'sort': this.getStorageValue('sort'),
          'hide-nsr': this.getStorageValue('hide-nsr') === true || undefined,
          'hide-ar': this.getStorageValue('hide-ar') === true || undefined,
        });
      }

      this.layoutView.set(this.getParamValue(params, 'layout') || this.layoutView());
      this.layoutSortMode.set(this.getParamValue(params, 'sort') || this.layoutSortMode());
      this.hideNoScorecardRepos.set(this.getParamValue(params, 'hide-nsr') || this.hideNoScorecardRepos());
      this.hideArchivedRepos.set(this.getParamValue(params, 'hide-ar') || this.hideArchivedRepos());

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
   * Get a param value, casting some value to a proper type (all params are strings or arrays).
   */
  getParamValue(
    params: Params,
    key: string
  ) {
    const value = params[key];

    if (value === 'true') {
      return true;
    } else if (value === 'false') {
      return false;
    }

    return value;
  }

  /**
   * Get a list of repositories after the results have had the sort filters applied.
   */
  getVisibleRepositories(): RepositoryModel[] {
    let repositories: RepositoryModel[] = this.getFilteredRepositories();

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
   * Called when the view filters have changed.
   */
  onVisibleItemsChanged(
    changedItem: ToggleButtonItem
  ) {
    if (changedItem.id == LayoutVisibility.HIDE_NO_SCORECARD_REPOS) {
      this.hideNoScorecardRepos.set(changedItem.active);

      this.navigateWithQueryParams({
        'hide-nsr': changedItem.active ? true : undefined
      });
    } else if (changedItem.id == LayoutVisibility.HIDE_ARCHIVED_REPOS) {
      this.hideArchivedRepos.set(changedItem.active);

      this.navigateWithQueryParams({
        'hide-ar': changedItem.active ? true : undefined
      });
    }
  }

  /**
   * Get a UI icon for a give element.
   */
  getIcon(
    element: string
  ) {
    if (element == 'sort') {
      switch (this.layoutSortMode()) {
        case LayoutSortMode.NAME_DESC:
        case LayoutSortMode.SCORE_ASC:
          return 'arrow';
        case LayoutSortMode.NAME_ASC:
        case LayoutSortMode.SCORE_DESC:
          return 'arrow-down';
      }
    } else if (element == 'layout') {
      if (this.layoutView() == LayoutView.GRID) {
        return 'grid';
      } else if (this.layoutView() == LayoutView.LIST) {
        return 'list';
      }
    }

    return 'mood';
  }

  /**
   * Set the sort mode.
   */
  private setSortMode(
    sortMode: LayoutSortMode,
    redirect: boolean = true
  ) {
    this.layoutSortMode.set(sortMode);

    if (redirect) {
      this.navigateWithQueryParams({
        'sort': sortMode
      });
    }
  }

  /**
   * Set a storage value to the transient storage for the UI.
   */
  private setStorageValue(
    key: string,
    value: any
  ) {
    this.transientStorage.set(`ui-${key}`, value);
  }

  /**
   * Get a storage value, falling back.
   */
  private getStorageValue<T>(
    key: string
  ) {
    return this.transientStorage.get<T>(`ui-${key}`);
  }

  /**
   * Get a list of repositories after the results have been filtered.
   */
  private getFilteredRepositories(): RepositoryModel[] {
    let repositories: RepositoryModel[] = this.repositories()?.repositories.slice();

    if (this.hideNoScorecardRepos()) {
      repositories = repositories.filter((repo) =>
        repo.scorecard?.score !== undefined);
    }

    if (this.hideArchivedRepos()) {
      repositories = repositories.filter((repo) =>
        !repo.archived);
    }

    const searchString = this.searchString();

    if (searchString.length > 0) {
      repositories = repositories.filter((repo) =>
        JSON.stringify(repo).toLowerCase().includes(searchString));
    }

    return repositories;
  }

  /**
   * Updates the query params, merging values and ensuring the page doesn't reload.
   * @private
   */
  private navigateWithQueryParams(
    queryParams: {}
  ) {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    }).then();
  }

  /**
   * Reset the UI.
   * @private
   */
  private reset() {
    this.loadingPercentage.set(0);
    this.selectedAccount.set(undefined);
    this.repositories.set(new RepositoryCollection());
  }
}

/**
 * Enum for layout views.
 */
export enum LayoutView {
  GRID = 'grid',
  LIST = 'list'
}

/**
 * Enum for layout sort modes.
 */
enum LayoutSortMode {
  NAME_ASC = 'name-asc',
  NAME_DESC = 'name-desc',
  SCORE_ASC = 'score-asc',
  SCORE_DESC = 'score-desc',
}

/**
 * Visibility of the repos.
 */
enum LayoutVisibility {
  HIDE_NO_SCORECARD_REPOS,
  HIDE_ARCHIVED_REPOS
}
