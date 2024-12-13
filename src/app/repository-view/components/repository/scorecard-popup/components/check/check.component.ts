import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ScoreRingComponent } from '../../../../../../shared/components/score-ring/score-ring.component';
import { DatePipe, JsonPipe, NgClass } from '@angular/common';
import { LoadingComponent } from '../../../../../../shared/components/loading/loading.component';
import { ScorecardCheck } from '../../../../../../shared/models/scorecard.model';

@Component({
  selector: 'osf-check',
  standalone: true,
  imports: [
    ScoreRingComponent,
    DatePipe,
    LoadingComponent,
    JsonPipe,
    NgClass
  ],
  templateUrl: './check.component.html',
  styleUrl: './check.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckComponent {
  readonly check = input.required<ScorecardCheck>();
}
