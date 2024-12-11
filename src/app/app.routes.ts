import { Routes } from '@angular/router';
import { OrgViewComponent } from './org-view/org-view.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'inspect/github/codeplaysoftware',
    pathMatch: 'full'
  },
  {
    path: 'inspect/:service/:account',
    component: OrgViewComponent
  },
];
