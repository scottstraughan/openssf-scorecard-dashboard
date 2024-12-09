/**
 * Repository model.
 */
export interface RepositoryModel {
  name: string
  url: string
}

export enum RepositoryType {
  USER,
  ORGANIZATION
}
