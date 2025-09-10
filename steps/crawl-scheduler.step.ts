import { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  type: 'cron',
  name: 'CrawlScheduler',
  description: 'Schedule automatic ICO crawling every 6 hours',
  cron: '0 */6 * * *', // Every 6 hours
  emits: ['crawl.scheduled'],
  flows: ['crypto-crawler'],
}

export const handler: Handlers['CrawlScheduler'] = async ({ emit, logger, state }) => {
  try {
    logger.info('Scheduled crawl triggered')
    
    // Check if last crawl was recent (within 4 hours)
    const lastCrawl = await state.get('crawl', 'lastRun') as string | undefined
    const now = new Date()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    
    if (lastCrawl && new Date(lastCrawl) > fourHoursAgo) {
      logger.info('Skipping scheduled crawl - too recent', { 
        lastCrawl,
        nextRun: new Date(now.getTime() + 6 * 60 * 60 * 1000)
      })
      return
    }
    
    // Update last run time
    await state.set('crawl', 'lastRun', now.toISOString())
    
    // Emit crawl event
    await emit({
      topic: 'crawl.scheduled',
      data: {
        scheduledAt: now.toISOString(),
        trigger: 'cron',
        maxProjects: 100, // Default limit for scheduled crawls
        delay: 3000, // 3 second delay between requests
      },
    })
    
    logger.info('Crawl scheduled successfully', { 
      scheduledAt: now.toISOString() 
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Scheduled crawl failed', { 
      error: errorMessage 
    })
  }
}
