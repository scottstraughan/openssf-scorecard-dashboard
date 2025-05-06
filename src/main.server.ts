import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './openssf-scorecard-dashboard/app.component';
import { config } from './openssf-scorecard-dashboard/app.config.server';

const bootstrap = () => bootstrapApplication(AppComponent, config);

export default bootstrap;
