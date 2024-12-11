import { ScorecardModel } from './scorecard.model';

export interface RepositoryModel {
  name: string
  url: string
  lastUpdated: Date
  stars: number
  description: string
  scorecard?: ScorecardModel
}

export enum RepositoryType {
  USER,
  ORGANIZATION
}
