import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'osf-search',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent {
  value = model<string>('');
  placeholder = model<string>('');
}
