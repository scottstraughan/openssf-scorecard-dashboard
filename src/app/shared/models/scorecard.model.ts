import { ResultPriority } from '../services/scorecard.service';

export interface ScorecardModel {
  score?: number
  checks: ScorecardCheck[]
  url: string
}

export interface ScorecardCheck {
  name: string
  score: number
  reason: string
  details: string | undefined
  priority: ResultPriority
  documentation: {
    url: string
  }
}
