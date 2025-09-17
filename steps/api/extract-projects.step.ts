import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ExtractProjectsSteps',
  description: 'Trigger micro-steps extraction workflow for all upcoming ICO projects',
  method: 'GET',
  path: '/api/extract-projects',
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      workflow: z.string(),
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
  emits: ['extraction.start'],
  flows: ['data-extraction']
}

export const handler = async (req: any, { emit, logger, traceId }: any) => {
  const startTime = Date.now()
  
  try {
    logger.info('Starting micro-steps extraction workflow', { traceId })
    
    // Trigger the micro-steps workflow
    await emit({
      topic: 'extraction.start',
      data: { trigger: 'manual' }
    })
    
    logger.info('Micro-steps workflow triggered successfully', { traceId })
    
    return {
      status: 200,
      body: {
        success: true,
        message: 'Micro-steps extraction workflow started successfully',
        workflow: 'extraction.start -> extract-coin-keys -> extract-basic-info -> extract-team-data -> extract-finance-data -> save-project'
      }
    }
    
  } catch (error: any) {
    const processingTime = `${Date.now() - startTime}ms`
    
    logger.error('Micro-steps workflow trigger failed', { 
      error: error.message, 
      processingTime,
      traceId 
    })
    
    return {
      status: 500,
      body: {
        success: false,
        error: `Micro-steps workflow trigger failed: ${error.message}`
      }
    }
  }
}
