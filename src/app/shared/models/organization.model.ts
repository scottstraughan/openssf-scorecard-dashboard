import { RepositoryModel } from './repository.model';

/**
 * Organization model.
 */
export interface OrganizationModel {
  name: string
  icon: string
  averageScore: number
  totalRepositories: number
  repositoriesWithScorecards: number
  followers: number
  url: string
  repositories?: RepositoryModel[]
}
