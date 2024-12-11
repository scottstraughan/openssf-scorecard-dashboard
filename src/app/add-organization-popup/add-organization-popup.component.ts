import { ChangeDetectionStrategy, Component, Inject, signal, WritableSignal } from '@angular/core';
import { PopupReference } from '../shared/components/popup/popup.service';
import { SearchComponent } from '../shared/components/search/search.component';
import { ButtonComponent } from '../shared/components/button/button.component';
import { FormsModule } from '@angular/forms';
import { ServiceStoreService } from '../shared/services/service-store.service';
import { catchError, of, tap } from 'rxjs';
import { InvalidAccountError, RateLimitError } from '../shared/services/repository-services/github.service';

@Component({
  selector: 'osf-add-organization-popup',
  standalone: true,
  templateUrl: './add-organization-popup.component.html',
  imports: [
    SearchComponent,
    ButtonComponent,
    FormsModule
  ],
  styleUrls: [
    './add-organization-popup.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddOrganizationPopupComponent {
  readonly selectedService: WritableSignal<string> = signal('github');
  readonly accountName: WritableSignal<string> = signal('');
  readonly loading: WritableSignal<boolean> = signal(false);

  /**
   * Constructor.
   * @param popupReference
   * @param serviceStoreService
   */
  constructor(
    @Inject('POPUP_DATA') protected popupReference: PopupReference,
    protected serviceStoreService: ServiceStoreService
  ) { }

  /**
   * Determine if all the forms are valid.
   */
  isServiceFormsValid(): boolean {
    if (this.selectedService() == 'github') {
      if (this.accountName().length == 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Called when a user clicks to add a new account to inspect.
   */
  onAdd() {
    this.loading.set(true);

    this.serviceStoreService.add(this.selectedService(), this.accountName())
      .pipe(
        tap(() => {
          this.popupReference.close();
          this.loading.set(false);
        }),
        catchError((error) => {
          if (error instanceof RateLimitError) {
            alert('RATE LIMITED');
          } else  if (error instanceof InvalidAccountError) {
            alert('INVALID ACCOUNT');
          }

          this.loading.set(false);
          return of();
        })
      )
      .subscribe();
  }
}
