import { Inject, Injectable } from '@angular/core';
import { ServiceAccountModel } from '../models/service-account.model';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { GithubService } from './repository-services/github.service';
import { RepositoryModel } from '../models/repository.model';
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';

@Injectable({
  providedIn: 'root'
})
export class ServiceStoreService {
  static readonly STORAGE_KEY = 'osf-services';
  static readonly DEFAULT_ORGANIZATIONS: ServiceAccountModel[] = [
    {
      service: 'github',
      account: 'codeplaysoftware',
      url: 'https://github.com',
      name: '',
      description: '',
      icon: 'https://avatars.githubusercontent.com/u/7440916?s=48&v=4',
      totalRepositories: 0,
      followers: 0
    },
    {
      service: 'github',
      account: 'uxlfoundation',
      url: 'https://github.com',
      name: '',
      description: '',
      icon: 'https://avatars.githubusercontent.com/u/144704571?s=200&v=4',
      totalRepositories: 0,
      followers: 0
    }
  ];

  protected observable: BehaviorSubject<ServiceAccountModel[]> = new BehaviorSubject<ServiceAccountModel[]>([]);
  protected organizations: ServiceAccountModel[] = [];

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
      this.setServiceAccounts(this.storageService.get(ServiceStoreService.STORAGE_KEY));
    } else {
      this.setServiceAccounts(ServiceStoreService.DEFAULT_ORGANIZATIONS);
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
   */
  add(
    service: string,
    accountName: string,
    apiToken?: string
  ): Observable<ServiceAccountModel> {
    return this.getServiceAccountDetails(service, accountName, apiToken)
      .pipe(
        tap((service) => {
          this.addServiceAccount(service)
        })
      );
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
    serviceAccounts: ServiceAccountModel[]
  ) {
    this.organizations = serviceAccounts;
    this.observable.next(this.organizations);
    this.storageService.set(ServiceStoreService.STORAGE_KEY, this.organizations);
  }

  /**
   * Add a service account, notify observers.
   * @param account
   * @private
   */
  private addServiceAccount(
    account: ServiceAccountModel
  ) {
    this.organizations.push(account);
    this.setServiceAccounts(this.organizations);
  }
}

/**
 * The list of supported services.
 */
export enum SupportedService {
  GITHUB= 'github'
}