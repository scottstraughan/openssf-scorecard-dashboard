import { Component, input } from '@angular/core';
import { RepositoryModel } from '../../models/repository.model';

@Component({
  selector: 'osf-repository',
  standalone: true,
  imports: [],
  templateUrl: './repository.component.html',
  styleUrl: './repository.component.scss'
})
export class RepositoryComponent {
  repository = input.required<RepositoryModel>();
}
