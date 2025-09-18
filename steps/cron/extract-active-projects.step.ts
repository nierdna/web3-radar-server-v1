import { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  type: 'cron',
  name: 'ExtractActiveProjectsCron',
  description: 'Automatically extract active ICO projects every 8 hours',
  cron: '0 */8 * * *', // Every 8 hours
  emits: ['extraction.start'],
  flows: ['data-extraction', 'scheduled-extraction']
}

export const handler: Handlers['ExtractActiveProjectsCron'] = async ({ emit, logger, traceId }) => {
  try {
    logger.info('Starting scheduled extraction for active ICO projects', { traceId })
    
    // Trigger the micro-steps workflow for active projects
    await emit({
      topic: 'extraction.start',
      data: { 
        trigger: 'scheduled',
        projectType: 'active-ico'
      }
    })
    
    logger.info('Scheduled extraction for active ICO projects triggered successfully', { traceId })
    
  } catch (error: any) {
    logger.error('Scheduled extraction for active ICO projects failed', { 
      error: error.message,
      traceId 
    })
  }
}
