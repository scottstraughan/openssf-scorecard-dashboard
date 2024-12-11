import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  HostBinding,
  input,
  SkipSelf
} from '@angular/core';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { NgClass } from '@angular/common';

@Component({
  selector: 'osf-ring',
  standalone: true,
  templateUrl: './ring.component.html',
  imports: [
    NgCircleProgressModule,
    NgClass
  ],
  styleUrl: './ring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RingComponent {
  readonly score = input.required<number>();
  readonly thickness = input<string>('5px');
  readonly fontSize = input<string>('1.5rem');

  @HostBinding('style.--progress')
  percentage: string = '0%';

  @HostBinding('style.--thickness')
  thicknessBinding: string = '5px';

  @HostBinding('style.--font-size')
  fontSizeBinding: string = this.fontSize();

  /**
   * Constructor.
   */
  constructor(
    @SkipSelf() protected cdRef: ChangeDetectorRef
  ) {
    effect(() => {
      this.percentage = Math.round(this.score() * 10) + '%';
      this.thicknessBinding = this.thickness();
      this.fontSizeBinding = this.fontSize();

      this.cdRef.detectChanges();
    });
  }

  /**
   * Get the color grade of the repository based on its score.
   * @param score
   */
  public getColorVariableForScore(
    score?: number
  ): string {
    if (!score) {
      return '';
    }

    if (score >= 0 && score < 2.5) {
      return 'var(--color-shocking)';
    } else if (score >= 2.5 && score < 5) {
      return 'var(--color-poor)';
    } else if (score >= 5 && score < 7) {
      return 'var(--color-good)';
    } else if (score >= 7 && score < 7.5) {
      return 'var(--color-verygood)';
    } else {
      return 'var(--color-excellent)';
    }
  }
}
