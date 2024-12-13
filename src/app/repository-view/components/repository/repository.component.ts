import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RepositoryModel } from '../../../shared/models/repository.model';
import { ScoreRingComponent } from '../../../shared/components/score-ring/score-ring.component';
import { DatePipe, JsonPipe } from '@angular/common';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { AccountModel } from '../../../shared/models/account.model';
import { ScorecardModel } from '../../../shared/models/scorecard.model';
import { PopupService } from '../../../shared/components/popup/popup.service';
import { ScorecardPopupComponent } from './scorecard-popup/scorecard-popup.component';
import { ErrorPopupComponent } from '../../../shared/popups/error-popup/error-popup.component';

@Component({
  selector: 'osf-repository',
  standalone: true,
  imports: [
    ScoreRingComponent,
    DatePipe,
    LoadingComponent,
    JsonPipe
  ],
  templateUrl: './repository.component.html',
  styleUrl: './repository.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RepositoryComponent {
  readonly account = input.required<AccountModel>();
  readonly repository = input.required<RepositoryModel>();
  readonly scorecard = input<ScorecardModel>();
  readonly onReloadScorecard = output();

  /**
   * Constructor.
   * @param popupService
   */
  constructor(
    protected popupService: PopupService
  ) { }

  /**
   * Called when a user clicks on the main body of the repository view.
   */
  onClick() {
    if (this.scorecard()?.score) {
      this.popupService.create(
        ScorecardPopupComponent, this.repository, true);
    } else {
      this.popupService.create(
        ErrorPopupComponent, {
          title: 'No Scorecard',
          message: 'This repository does not have any associated scorecard available.',
        }, true);
    }
  }
}
