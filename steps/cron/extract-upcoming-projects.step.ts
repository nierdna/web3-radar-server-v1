import { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  type: 'cron',
  name: 'ExtractUpcomingProjectsCron',
  description: 'Automatically extract upcoming ICO projects every 8 hours',
  cron: '0 */8 * * *', // Every 8 hours
  emits: ['extraction.start'],
  flows: ['data-extraction', 'scheduled-extraction']
}

export const handler: Handlers['ExtractUpcomingProjectsCron'] = async ({ emit, logger, traceId }) => {
  try {
    logger.info('Starting scheduled extraction for upcoming ICO projects', { traceId })
    
    // Trigger the micro-steps workflow for upcoming projects
    await emit({
      topic: 'extraction.start',
      data: { 
        trigger: 'scheduled',
        projectType: 'upcoming'
      }
    })
    
    logger.info('Scheduled extraction for upcoming ICO projects triggered successfully', { traceId })
    
  } catch (error: any) {
    logger.error('Scheduled extraction for upcoming ICO projects failed', { 
      error: error.message,
      traceId 
    })
  }
}
