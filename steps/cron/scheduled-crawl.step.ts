import { CronConfig, Handlers } from 'motia'
import { CryptoRankCrawler } from '../../services/crawl/crawler'
import { ErrorHandler } from '../../services/validations/error-handler'

export const config: CronConfig = {
  type: 'cron',
  name: 'ScheduledCrawl',
  description: 'Scheduled ICO crawl every 6 hours',
  cron: '0 */6 * * *', // Every 6 hours
  emits: ['ico.list.crawled'],
  flows: ['crypto-crawler'],
}

export const handler: Handlers['ScheduledCrawl'] = async ({ emit, logger, traceId }) => {
  const crawler = new CryptoRankCrawler()
  
  try {
    logger.info('Scheduled crawl started', { traceId })
    
    await crawler.init()
    
    // Crawl limited number of projects for scheduled runs
    const icoData = await crawler.crawlUpcomingICOList(20)
    
    const urls = icoData.map(item => item.detailUrl)
    
    // Emit event to trigger distribution
    await emit({
      topic: 'ico.list.crawled',
      data: {
        urls: urls,
        icoData: icoData,
        totalCount: icoData.length,
        originalCount: icoData.length,
        crawledAt: new Date().toISOString(),
        traceId,
        scheduled: true,
      },
    })
    
    logger.info('Scheduled crawl completed', { 
      totalUrls: icoData.length, 
      traceId 
    })
    
  } catch (error) {
    ErrorHandler.handleCrawlError(error, logger, traceId, 'Scheduled crawl')
  } finally {
    await crawler.close()
  }
}
