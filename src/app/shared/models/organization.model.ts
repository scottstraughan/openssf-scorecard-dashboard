import { RepositoryModel } from './repository.model';

/**
 * Organization model.
 */
export interface OrganizationModel {
  login: string
  name: string
  icon: string
  description: string
  averageScore: number
  totalRepositories: number
  repositoriesWithScorecards: number
  followers: number
  url: string
  repositories?: RepositoryModel[]
}
