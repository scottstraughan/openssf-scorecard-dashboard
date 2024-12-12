import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ServiceStoreService } from '../shared/services/service-store.service';
import { Router } from '@angular/router';
import { LoadingComponent } from '../shared/components/loading/loading.component';

@Component({
  selector: 'app-home-view',
  standalone: true,
  templateUrl: 'home-view.component.html',
  styleUrls: ['./home-view.component.scss'],
  imports: [
    LoadingComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeViewComponent {
  /**
   * Constructor.
   * @param serviceStoreService
   * @param router
   */
  constructor(
    protected serviceStoreService: ServiceStoreService,
    protected router: Router
  ) {
    this.serviceStoreService.getAccounts()
      .subscribe((accounts) => {
        const firstAccount = accounts[0];

        this.router.navigate([`/inspect/${firstAccount.service}/${firstAccount.account}`])
          .then();
      });
  }
}
