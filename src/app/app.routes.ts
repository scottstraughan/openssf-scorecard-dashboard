import { Routes } from '@angular/router';
import { OrgViewComponent } from './org-view/org-view.component';

export const routes: Routes = [
  {
    path: '',
    component: OrgViewComponent,
    pathMatch: 'full'
  },
  {
    path: 'view',
    component: OrgViewComponent
  },
];
