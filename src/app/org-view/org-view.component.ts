import { Component } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { RepositoryComponent } from '../shared/components/repository/repository.component';
import { RepositoryModel } from '../shared/models/repository.model';
import { readableStreamLikeToAsyncGenerator } from 'rxjs/internal/util/isReadableStreamLike';
import { SearchComponent } from '../shared/components/search/search.component';
import { RingComponent } from '../shared/components/ring/ring.component';

@Component({
  selector: 'app-org-view',
  standalone: true,
  imports: [
    ButtonComponent,
    RepositoryComponent,
    SearchComponent,
    RingComponent
  ],
  templateUrl: './org-view.component.html',
  styleUrl: './org-view.component.scss'
})
export class OrgViewComponent {
  searchString: string = '';

  repositories: RepositoryModel[] = [
    {
      name: 'repo1'
    },
    {
      name: 'repo2'
    },
    {
      name: 'repo3'
    },
    {
      name: 'repo4'
    },
    {
      name: 'repo5'
    },
    {
      name: 'repo6'
    }
  ];
  protected readonly readableStreamLikeToAsyncGenerator = readableStreamLikeToAsyncGenerator;
}
