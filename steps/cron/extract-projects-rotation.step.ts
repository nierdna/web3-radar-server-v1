import { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  type: 'cron',
  name: 'ExtractProjectsRotationCron',
  description: 'Rotate between different project types every 8 hours (upcoming -> active -> all)',
  cron: '0 */8 * * *', // Every 8 hours
  emits: ['extraction.start'],
  flows: ['data-extraction', 'scheduled-extraction']
}

export const handler: Handlers['ExtractProjectsRotationCron'] = async ({ emit, logger, traceId }) => {
  try {
    // Calculate rotation based on hour of day
    const now = new Date()
    const hour = now.getHours()
    
    // Rotate every 8 hours: 0-7: upcoming, 8-15: active, 16-23: all
    let projectType: string
    let description: string
    
    if (hour >= 0 && hour < 8) {
      projectType = 'upcoming'
      description = 'upcoming ICO projects'
    } else if (hour >= 8 && hour < 16) {
      projectType = 'active-ico'
      description = 'active ICO projects'
    } else {
      projectType = 'all-ico'
      description = 'all ICO projects'
    }
    
    logger.info(`Starting scheduled extraction for ${description}`, { 
      projectType,
      hour,
      traceId 
    })
    
    // Trigger the micro-steps workflow
    await emit({
      topic: 'extraction.start',
      data: { 
        trigger: 'scheduled-rotation',
        projectType
      }
    })
    
    logger.info(`Scheduled extraction for ${description} triggered successfully`, { 
      projectType,
      traceId 
    })
    
  } catch (error: any) {
    logger.error('Scheduled rotation extraction failed', { 
      error: error.message,
      traceId 
    })
  }
}
