export interface DatabaseConfig {
  url: string
  host?: string
  port?: number
  username?: string
  password?: string
  database?: string
}

export interface QueryResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface FilterParams {
  search?: string
  category?: string
  status?: string
  chain?: string
  dateFrom?: string
  dateTo?: string
}
