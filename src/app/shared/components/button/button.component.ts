import { Component, input } from '@angular/core';

@Component({
  selector: 'osf-button',
  standalone: true,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  icon = input<string | undefined>(undefined);
}
