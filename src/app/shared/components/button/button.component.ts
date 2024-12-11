import { Component, HostListener, input, model } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'osf-button',
  standalone: true,
  imports: [
    NgClass
  ],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  icon = input<string | undefined>(undefined);
  label = input<string | undefined>(undefined);
  selected = model<boolean>(false);

  @HostListener('click')
  onClick() {
    this.selected.set(!this.selected());
  }
}
