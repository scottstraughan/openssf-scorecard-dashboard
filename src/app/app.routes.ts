import { Routes } from '@angular/router';
import { OrgViewComponent } from './org-view/org-view.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'view/codeplaysoftware',
    pathMatch: 'full'
  },
  {
    path: 'view/:organization',
    component: OrgViewComponent
  },
];
