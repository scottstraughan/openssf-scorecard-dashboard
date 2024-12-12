import { Routes } from '@angular/router';
import { InspectViewComponent } from './inspect/inspect-view.component';
import { HomeViewComponent } from './home/home-view.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeViewComponent
  },
  {
    path: 'inspect/:service/:account',
    component: InspectViewComponent
  },
];
