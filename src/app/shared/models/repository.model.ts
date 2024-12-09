export interface RepositoryModel {
  name: string
  url: string
  lastUpdated: Date
  stars: number
  description: string
}

export enum RepositoryType {
  USER,
  ORGANIZATION
}
