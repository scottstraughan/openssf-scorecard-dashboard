import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ServiceAccountModel } from '../../models/service-account.model';
import { RepositoryModel } from '../../models/repository.model';

/**
 * Base repository service.
 */
export abstract class BaseRepositoryService {
  /**
   * The number of results to return per API request. Max is 100. Higher value means less requests.
   */
  static readonly RESULTS_PER_PAGE = 100;

  /**
   * Injected HttpClient, used for making API requests.
   * @protected
   */
  protected httpClient: HttpClient = inject(HttpClient);

  /**
   * Get the service details from the API backend.
   * @param accountName
   * @param apiToken
   */
  abstract getServiceDetails(
    accountName: string,
    apiToken?: string
  ): Observable<ServiceAccountModel>;

  /**
   * Get the repositories fromm the service backend.
   * @param accountName
   * @param apiToken
   */
  abstract getRepositories(
    accountName: string,
    apiToken?: string
  ): Observable<RepositoryModel[]>;
}

/**
 * Error that is thrown when the backend has rate limited the user.
 */
export class RateLimitError extends Error {}

/**
 * Error that is thrown when the backend has reported an invalid account.
 */
export class InvalidAccountError extends Error {}
