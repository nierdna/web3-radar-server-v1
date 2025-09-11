export class ErrorHandler {
  /**
   * Handle crawl errors with consistent logging and error message extraction
   */
  static handleCrawlError(
    error: unknown, 
    logger: any, 
    traceId: string, 
    context: string,
    additionalData?: Record<string, any>
  ): string {
    const errorMessage = this.getErrorMessage(error)
    
    logger.error(`${context} failed`, { 
      error: errorMessage, 
      traceId,
      ...additionalData
    })
    
    return errorMessage
  }

  /**
   * Handle step errors with consistent response format
   */
  static handleStepError(
    error: unknown,
    logger: any,
    traceId: string,
    context: string,
    statusCode: number = 500
  ) {
    const errorMessage = this.getErrorMessage(error)
    
    logger.error(`${context} failed`, { 
      error: errorMessage, 
      traceId 
    })
    
    return {
      status: statusCode,
      body: {
        success: false,
        error: `${context} failed: ${errorMessage}`,
      },
    }
  }

  /**
   * Handle API errors with consistent response format
   */
  static handleApiError(
    error: unknown,
    logger: any,
    traceId: string,
    context: string
  ) {
    const errorMessage = this.getErrorMessage(error)
    
    logger.error(`${context} failed`, { 
      error: errorMessage, 
      traceId 
    })
    
    return {
      status: 500,
      body: {
        success: false,
        error: `${context} failed: ${errorMessage}`,
      },
    }
  }

  /**
   * Extract error message from unknown error type
   */
  private static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return 'Unknown error'
  }

  /**
   * Create error event data for emission
   */
  static createErrorEventData(
    error: unknown,
    context: string,
    additionalData?: Record<string, any>
  ) {
    return {
      topic: `${context}.failed`,
      data: {
        error: this.getErrorMessage(error),
        ...additionalData
      }
    }
  }
}
