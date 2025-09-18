export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface EventData {
  topic: string
  data: any
  timestamp?: string
  traceId?: string
}

export interface LogContext {
  traceId?: string
  userId?: string
  projectId?: string
  [key: string]: any
}

export interface ServiceConfig {
  name: string
  version: string
  environment: 'development' | 'staging' | 'production'
  debug: boolean
}
