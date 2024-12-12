import { Component, HostListener, input, output } from '@angular/core';
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
  disabled = input<boolean>(false);
  onClicked = output();

  @HostListener('click')
  onClick() {
    if (this.disabled()) {
      return ;
    }

    this.onClicked.emit();
  }
}
