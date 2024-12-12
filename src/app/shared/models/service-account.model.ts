export interface ServiceAccountModel {
  id: string
  service: string
  account: string
  name: string
  icon: string
  description: string
  totalRepositories: number
  followers: number
  url: string
  apiToken?: string
}
