import { Inject, Injectable } from '@angular/core';
import { AccountModel } from '../models/account.model';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { GithubService } from './repository-services/github.service';
import { RepositoryModel } from '../models/repository.model';
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';

@Injectable({
  providedIn: 'root'
})
export class ServiceStoreService {
  /**
   * The tag used in the local storage to store the account list.
   */
  static readonly STORAGE_ACCOUNT_LIST = 'osf-account-list';

  /**
   * Default accounts if the user is visiting for the first time.
   */
  static readonly DEFAULT_ACCOUNTS: any[] = [
    {
      service: 'github',
      account: 'uxlfoundation'
    }
  ];

  /**
   * Observable used to allow observers to track changes.
   * @protected
   */
  protected observable: BehaviorSubject<AccountModel[]> = new BehaviorSubject<AccountModel[]>([]);

  /**
   * Internal account list.
   * @protected
   */
  private accounts: Map<string, AccountModel> = new Map();

  /**
   * Constructor
   * @param storageService
   * @param githubService
   */
  constructor(
    @Inject(LOCAL_STORAGE) protected storageService: StorageService,
    protected githubService: GithubService,
  ) {
    if (this.storageService.has(ServiceStoreService.STORAGE_ACCOUNT_LIST)) {
     try {
       const parsed: Map<string, AccountModel> = new Map(
         JSON.parse(this.storageService.get(ServiceStoreService.STORAGE_ACCOUNT_LIST)));

       this.setAccounts(parsed);
     } catch (error) { }
    }

    if (this.accounts.size == 0) {
      for (const defaultAccount of ServiceStoreService.DEFAULT_ACCOUNTS) {
        this.add(defaultAccount.service, defaultAccount.account)
          .subscribe();
      }
    }
  }

  /**
   * Get the account details.
   * @param service
   * @param accountName
   * @param apiToken
   */
  getAccountDetails(
    service: string,
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel> {
    const accountId = ServiceStoreService.generateUniqueId(service, accountName);

    if (this.accounts.has(accountId)) {
      const account = this.accounts.get(accountId);

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
   * Get repositories for a specific account.
   * @param service
   * @param accountName
   * @param apiToken
   */
  getRepositories(
    service: string,
    accountName: string,
    apiToken?: string
  ): Observable<RepositoryModel[]> {
    const identifier = 'osf-' + ServiceStoreService.generateUniqueId(service, accountName);

    if (this.storageService.has(identifier)) {
      return of(this.storageService.get(identifier));
    }

    switch(service) {
      case SupportedService.GITHUB: {
        return this.githubService.getRepositories(accountName, apiToken)
          .pipe(
            tap((repositories) => {
              this.storageService.set(identifier, repositories);
            })
          );
      }
    }

    throw Error(`The service "${service}" is not supported.`);
  }

  /**
   * Add a new service account to track.
   * @param service
   * @param accountName
   * @param apiToken
   * @throws DuplicateAccountError
   */
  add(
    service: string,
    accountName: string,
    apiToken?: string
  ): Observable<AccountModel> {
    return this.getAccountDetails(service, accountName, apiToken)
      .pipe(
        tap((service) => {
          this.addAccount(service);
        })
      );
  }

  /**
   * Delete an account from being tracked.
   * @param accountModel
   */
  delete(
    accountModel: AccountModel
  ) {
    // Ensure we have at least one account to track
    if (this.accounts.size == 1) {
      throw new MinimumAccountError();
    }

    // Delete any account repository cache
    this.deleteAccountRepositoryCache(accountModel);

    if (this.accounts.has(accountModel.id)) {
      this.accounts.delete(accountModel.id);
      this.notifyObservers();
    }
  }

  /**
   * Get the accounts that are being tracked.
   */
  getAccounts(): Observable<AccountModel[]> {
    return this.observable;
  }

  /**
   * Delete any repository cache.
   * @param accountModel
   */
  private deleteAccountRepositoryCache(
    accountModel: AccountModel
  ) {
    const key = accountModel.id + '-repos';

    if (this.storageService.has(key)) {
      this.storageService.remove(key);
    }
  }

  /**
   * Set the accounts, notify observers.
   * @param accounts
   * @private
   */
  private setAccounts(
    accounts: Map<string, AccountModel>
  ) {
    this.accounts = accounts;
    this.notifyObservers();
  }

  /**
   * Notify any observers.
   * @private
   */
  private notifyObservers() {
    this.observable.next(Array.from(this.accounts.values()));
    this.storageService.set(
      ServiceStoreService.STORAGE_ACCOUNT_LIST, JSON.stringify(Array.from(this.accounts.entries())));
  }

  /**
   * Add an account, notify observers.
   * @param account
   * @throws DuplicateAccountError
   * @private
   */
  private addAccount(
    account: AccountModel
  ) {
    if (this.accounts.has(account.id)) {
      throw new DuplicateAccountError();
    }

    this.accounts.set(account.id, account);
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
    return service.toLowerCase() + '-' + account.toLowerCase();
  }
}

/**
 * The list of supported services.
 */
export enum SupportedService {
  GITHUB = 'github'
}

/**
 * Error thrown if the account already exists.
 */
export class DuplicateAccountError extends Error {}

/**
 * Error thrown if a user is trying to delete the last account.
 */
export class MinimumAccountError extends Error {}
