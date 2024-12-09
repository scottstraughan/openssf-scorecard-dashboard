import { ChangeDetectionStrategy, Component, input, OnInit, signal, WritableSignal } from '@angular/core';
import { RepositoryModel } from '../../models/repository.model';
import { RingComponent } from '../ring/ring.component';
import { DatePipe } from '@angular/common';
import { LoadingComponent } from '../loading/loading.component';
import { ScorecardModel } from '../../models/scorecard.model';
import { tap } from 'rxjs';
import { LoadingState } from '../../LoadingState';
import { ScorecardService } from '../../services/scorecard.service';
import { OrganizationModel } from '../../models/organization.model';

@Component({
  selector: 'osf-repository',
  standalone: true,
  imports: [
    RingComponent,
    DatePipe,
    LoadingComponent
  ],
  templateUrl: './repository.component.html',
  styleUrl: './repository.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RepositoryComponent implements OnInit {
  readonly organization = input.required<OrganizationModel>();
  readonly repository = input.required<RepositoryModel>();
  readonly scorecard: WritableSignal<ScorecardModel | undefined> = signal(undefined);
  readonly loading: WritableSignal<LoadingState> = signal(LoadingState.LOADING);
  readonly LoadingState = LoadingState;

  /**
   * Constructor.
   * @param scorecardService
   */
  constructor(
    private scorecardService: ScorecardService
  ) { }

  /**
   * @inheritdoc
   */
  ngOnInit(): void {
    this.loadScorecard();
  }

  /**
   * Called when a user clicks to reload the scorecard.
   */
  onReloadScore() {
    this.loadScorecard();
  }

  /**
   * Load the scorecard from the scorecard service.
   */
  loadScorecard() {
    this.loading.set(LoadingState.LOADING);

    this.scorecardService.getScorecard(this.organization(), this.repository())
      .pipe(
        tap((scorecard) => {
          this.loading.set(LoadingState.LOAD_SUCCESS);
          this.scorecard.set(scorecard);
        })
      )
      .subscribe();
  }
}
