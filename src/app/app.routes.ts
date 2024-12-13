import { Routes } from '@angular/router';
import { RepositoryViewComponent } from './repository-view/repository-view.component';
import { HomeViewComponent } from './home/home-view.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeViewComponent
  },
  {
    path: ':service/:account',
    component: RepositoryViewComponent
  }
];
