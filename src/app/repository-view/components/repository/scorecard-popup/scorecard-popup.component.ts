import { ChangeDetectionStrategy, Component, Inject, signal, WritableSignal } from '@angular/core';
import { ScoreRingComponent } from '../../../../shared/components/score-ring/score-ring.component';
import { CheckComponent } from './components/check/check.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { NgClass } from '@angular/common';
import { RepositoryModel } from '../../../../shared/models/repository.model';
import { PopupReference } from '../../../../shared/components/popup/popup.service';
import { ScorecardCheck } from '../../../../shared/models/scorecard.model';

@Component({
  selector: 'app-scorecard-view',
  standalone: true,
  imports: [
    ScoreRingComponent,
    CheckComponent,
    ButtonComponent,
    NgClass
  ],
  templateUrl: './scorecard-popup.component.html',
  styleUrl: './scorecard-popup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScorecardPopupComponent {
  /**
   * The repository this scorecard is for.
   */
  repository: WritableSignal<RepositoryModel | undefined> = signal(undefined);

  /**
   * Constructor
   * @param popupReference
   */
  constructor(
    @Inject('POPUP_DATA') protected popupReference: PopupReference
  ) {
    this.repository = popupReference.data;
  }

  /**
   * Get the background color, based on the result score, for the UI.
   */
  getScoreBackgroundColor() {
    const repository = this.repository();

    if (!repository || !repository.scorecard) {
      return '';
    }

    return ScoreRingComponent.getColorVariableForScore(repository.scorecard.score);
  }
}