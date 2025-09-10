import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'CrawlManualTrigger',
  description: 'Trigger manual crawl from scheduled event',
  subscribes: ['crawl.scheduled'],
  emits: ['ico.list.crawled'],
  input: z.object({
    scheduledAt: z.string(),
    trigger: z.string(),
    maxProjects: z.number(),
    delay: z.number(),
  }),
  flows: ['crypto-crawler'],
}

export const handler: Handlers['CrawlManualTrigger'] = async (input, { emit, logger, state, traceId }) => {
  const { maxProjects, delay } = input
  
  try {
    logger.info('Manual crawl triggered', { 
      maxProjects, 
      delay, 
      traceId 
    })
    
    // Import crawler dynamically to avoid circular dependencies
    const { CryptoRankCrawler } = await import('../services/crawler')
    const crawler = new CryptoRankCrawler()
    
    // Initialize and crawl
    await crawler.init()
    const urls = await crawler.crawlUpcomingICOList()
    await crawler.close()
    
    // Limit results
    const limitedUrls = urls.slice(0, maxProjects)
    
    // Emit event to trigger detail crawling
    await emit({
      topic: 'ico.list.crawled',
      data: {
        urls: limitedUrls,
        totalCount: limitedUrls.length,
        originalCount: urls.length,
        crawledAt: new Date().toISOString(),
        traceId,
      },
    })
    
    logger.info('Manual crawl completed', { 
      totalUrls: limitedUrls.length, 
      traceId 
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Manual crawl failed', { 
      error: errorMessage, 
      traceId 
    })
  }
}
