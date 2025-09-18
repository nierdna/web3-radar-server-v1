import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ExtractICOActiveProjectsSteps',
  description: 'Trigger micro-steps extraction workflow for all active ICO projects from CryptoRank',
  method: 'GET',
  path: '/api/extract-ico-active-projects',
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
    logger.info('Starting micro-steps extraction workflow for active ICO projects', { traceId })
    
    // Trigger the micro-steps workflow
    await emit({
      topic: 'extraction.start',
      data: { trigger: 'manual', projectType: 'active-ico' }
    })
    
    logger.info('Micro-steps workflow for active ICO projects triggered successfully', { traceId })
    
    return {
      status: 200,
      body: {
        success: true,
        message: 'Micro-steps extraction workflow for active ICO projects started successfully',
        workflow: 'extraction.start -> extract-coin-keys -> extract-basic-info -> extract-team-data -> extract-finance-data -> save-project'
      }
    }
    
  } catch (error: any) {
    const processingTime = `${Date.now() - startTime}ms`
    
    logger.error('Micro-steps workflow trigger for active ICO projects failed', { 
      error: error.message, 
      processingTime,
      traceId 
    })
    
    return {
      status: 500,
      body: {
        success: false,
        error: `Micro-steps workflow trigger for active ICO projects failed: ${error.message}`
      }
    }
  }
}
