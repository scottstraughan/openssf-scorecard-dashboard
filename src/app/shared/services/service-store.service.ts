import { Inject, Injectable } from '@angular/core';
import { ServiceAccountModel } from '../models/service-account.model';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { GithubService } from './repository-services/github.service';
import { RepositoryModel } from '../models/repository.model';
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';

@Injectable({
  providedIn: 'root'
})
export class ServiceStoreService {
  static readonly STORAGE_KEY = 'osf-services';
  static readonly DEFAULT_ORGANIZATIONS: any[] = [
    {
      service: 'github',
      account: 'codeplaysoftware'
    },
    {
      service: 'github',
      account: 'uxlfoundation'
    }
  ];

  protected observable: BehaviorSubject<ServiceAccountModel[]> = new BehaviorSubject<ServiceAccountModel[]>([]);
  protected organizations: Map<string, ServiceAccountModel> = new Map();

  /**
   * Constructor
   * @param storageService
   * @param githubService
   */
  constructor(
    @Inject(LOCAL_STORAGE) protected storageService: StorageService,
    protected githubService: GithubService,
  ) {
    if (this.storageService.has(ServiceStoreService.STORAGE_KEY)) {
     try {
       const parsed: Map<string, ServiceAccountModel> = new Map(
         JSON.parse(this.storageService.get(ServiceStoreService.STORAGE_KEY)));

       this.setServiceAccounts(parsed);
     } catch (error) { }
    }

    if (this.organizations.size == 0) {
      for (const defaultServiceAccount of ServiceStoreService.DEFAULT_ORGANIZATIONS) {
        this.add(
          defaultServiceAccount.service, defaultServiceAccount.account, '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')
          .subscribe();
      }
    }
  }

  /**
   * Get the service account details.
   * @param service
   * @param accountName
   * @param apiToken
   */
  getServiceAccountDetails(
    service: string,
    accountName: string,
    apiToken?: string
  ): Observable<ServiceAccountModel> {
    const accountId = ServiceStoreService.generateUniqueId(service, accountName);

    if (this.organizations.has(accountId)) {
      const account = this.organizations.get(accountId);

      if (account) {
        return of(account);
      }
    }

    switch(service) {
      case SupportedService.GITHUB: {
        return this.githubService.getServiceDetails(accountName, apiToken)
      }
    }

    throw Error('Cannot load from an unsupported service.');
  }

  /**
   * Get repositories for a specific service account.
   * @param service
   * @param accountName
   * @param apiToken
   */
  getRepositories(
    service: string,
    accountName: string,
    apiToken?: string
  ): Observable<RepositoryModel[]> {
    switch(service) {
      case SupportedService.GITHUB: {
        return this.githubService.getRepositories(accountName, apiToken)
      }
    }

    throw Error('Cannot load from an unsupported service.');
  }

  /**
   * Add a new service account to track.
   * @param service
   * @param accountName
   * @param apiToken
   * @throws DuplicateServiceAccountError
   */
  add(
    service: string,
    accountName: string,
    apiToken?: string
  ): Observable<ServiceAccountModel> {
    return this.getServiceAccountDetails(service, accountName, apiToken)
      .pipe(
        tap((service) => {
          this.addServiceAccount(service);
        })
      );
  }

  /**
   * Delete an account from being tracked.
   * @param serviceAccountModel
   */
  delete(
    serviceAccountModel: ServiceAccountModel
  ) {
    // Ensure we have at least one account to track
    if (this.organizations.size == 1) {
      throw new MinimumServiceAccountError();
    }

    if (this.organizations.has(serviceAccountModel.id)) {
      this.organizations.delete(serviceAccountModel.id);
      this.notifyObservers();
    }
  }

  /**
   * Get the service accounts that are being tracked.
   */
  getServiceAccounts(): Observable<ServiceAccountModel[]> {
    return this.observable;
  }

  /**
   * Set the service accounts, notify observers.
   * @param serviceAccounts
   * @private
   */
  private setServiceAccounts(
    serviceAccounts: Map<string, ServiceAccountModel>
  ) {
    this.organizations = serviceAccounts;
    this.notifyObservers();
  }

  private notifyObservers() {
    this.observable.next(Array.from(this.organizations.values()));
    this.storageService.set(
      ServiceStoreService.STORAGE_KEY, JSON.stringify(Array.from(this.organizations.entries())));
  }

  /**
   * Add a service account, notify observers.
   * @param account
   * @throws DuplicateServiceAccountError
   * @private
   */
  private addServiceAccount(
    account: ServiceAccountModel
  ) {
    if (this.organizations.has(account.id)) {
      throw new DuplicateServiceAccountError();
    }

    this.organizations.set(account.id, account);
    this.notifyObservers();
  }

  /**
   * Generate a unique identifier.
   * @param service
   * @param account
   */
  static generateUniqueId(
    service: string,
    account: string
  ): string {
    return service + '-' + account;
  }
}

/**
 * The list of supported services.
 */
export enum SupportedService {
  GITHUB = 'github'
}

export class DuplicateServiceAccountError extends Error {}
export class MinimumServiceAccountError extends Error {}
