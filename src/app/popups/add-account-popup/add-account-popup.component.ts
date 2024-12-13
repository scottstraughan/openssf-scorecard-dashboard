import { ChangeDetectionStrategy, Component, Inject, signal, WritableSignal } from '@angular/core';
import { PopupReference, PopupService } from '../../shared/components/popup/popup.service';
import { SearchComponent } from '../../shared/components/search/search.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FormsModule } from '@angular/forms';
import { ServiceStoreService } from '../../shared/services/service-store.service';
import { catchError, of, tap } from 'rxjs';
import { ErrorPopupComponent } from '../../shared/popups/error-popup/error-popup.component';
import { RepositoryViewComponent } from '../../repository-view/repository-view.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

@Component({
  selector: 'osf-add-account-popup',
  standalone: true,
  templateUrl: './add-account-popup.component.html',
  imports: [
    SearchComponent,
    ButtonComponent,
    FormsModule,
    LoadingComponent
  ],
  styleUrls: [
    './add-account-popup.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddAccountPopupComponent {
  readonly selectedService: WritableSignal<string> = signal('github');
  readonly accountName: WritableSignal<string> = signal('');
  readonly apiToken: WritableSignal<string | undefined> = signal(undefined);
  readonly loading: WritableSignal<boolean> = signal(false);

  /**
   * Constructor.
   * @param popupReference
   * @param serviceStoreService
   * @param popupService
   */
  constructor(
    @Inject('POPUP_DATA') protected popupReference: PopupReference,
    protected serviceStoreService: ServiceStoreService,
    protected popupService: PopupService
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

    this.serviceStoreService.add(this.selectedService(), this.accountName(), this.apiToken())
      .pipe(
        tap(() => {
          this.popupReference.close();
          this.loading.set(false);
        }),
        catchError((error) => {
          this.popupService.create(
            ErrorPopupComponent, ErrorPopupComponent.handleErrorThrown(error), true);

          this.loading.set(false);
          return of();
        })
      )
      .subscribe();
  }

  /**
   * Called when the user clicks to close the popup.
   */
  onCloseClicked() {
    this.popupReference.close();
  }
}
