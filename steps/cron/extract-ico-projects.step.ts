import { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  type: 'cron',
  name: 'ExtractAllProjectsCron',
  description: 'Automatically extract all ICO projects every 8 hours',
  cron: '0 */8 * * *', // Every 8 hours
  emits: ['extraction.start'],
  flows: ['data-extraction', 'scheduled-extraction']
}

export const handler: Handlers['ExtractAllProjectsCron'] = async ({ emit, logger, traceId }) => {
  try {
    logger.info('Starting scheduled extraction for all ICO projects', { traceId })
    
    // Trigger the micro-steps workflow for all projects
    await emit({
      topic: 'extraction.start',
      data: { 
        trigger: 'scheduled',
        projectType: 'all-ico'
      }
    })
    
    logger.info('Scheduled extraction for all ICO projects triggered successfully', { traceId })
    
  } catch (error: any) {
    logger.error('Scheduled extraction for all ICO projects failed', { 
      error: error.message,
      traceId 
    })
  }
}
