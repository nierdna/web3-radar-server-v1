import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ErrorHandler } from '../../services/validations/error-handler'

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
    
    
    const { CryptoRankCrawler } = await import('../../services/crawl/crawler')
    const crawler = new CryptoRankCrawler()
    
 
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
    ErrorHandler.handleCrawlError(error, logger, traceId, 'Manual crawl')
  }
}
