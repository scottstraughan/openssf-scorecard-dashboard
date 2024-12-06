import { Component, input } from '@angular/core';
import { RepositoryModel } from '../../models/repository.model';
import { RingComponent } from '../ring/ring.component';

@Component({
  selector: 'osf-repository',
  standalone: true,
  imports: [
    RingComponent
  ],
  templateUrl: './repository.component.html',
  styleUrl: './repository.component.scss'
})
export class RepositoryComponent {
  repository = input.required<RepositoryModel>();
}
