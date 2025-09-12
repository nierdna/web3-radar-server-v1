import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { CryptoRankCrawler } from '../../services/crawl/crawler'
import { ErrorHandler } from '../../services/validations/error-handler'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'TriggerManualCrawl',
  description: 'Manually trigger ICO crawl with custom parameters',
  method: 'POST',
  path: '/crawl/manual',
  bodySchema: z.object({
    maxProjects: z.number().optional().default(10),
    delay: z.number().optional().default(2000),
  }),
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      totalUrls: z.number(),
      message: z.string(),
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
  emits: ['ico.list.crawled'],
  flows: ['crypto-crawler'],
}

export const handler: Handlers['TriggerManualCrawl'] = async (req, { emit, logger, traceId }) => {
  const { maxProjects = 10, delay = 2000 } = req.body
  
  try {
    logger.info('Manual crawl triggered', { 
      maxProjects, 
      delay, 
      traceId 
    })
    
    const crawler = new CryptoRankCrawler()
    await crawler.init()
    
    const icoData = await crawler.crawlUpcomingICOList(maxProjects)
    await crawler.close()
    
    // Limit results
    const limitedData = icoData.slice(0, maxProjects)
    const urls = limitedData.map(item => item.detailUrl)
    
    // Emit event to trigger distribution
    await emit({
      topic: 'ico.list.crawled',
      data: {
        urls: urls,
        icoData: limitedData,
        totalCount: limitedData.length,
        originalCount: icoData.length,
        crawledAt: new Date().toISOString(),
        traceId,
      },
    })
    
    logger.info('Manual crawl completed', { 
      totalUrls: limitedData.length, 
      traceId 
    })
    
    return {
      status: 200,
      body: {
        success: true,
        totalUrls: limitedData.length,
        message: `Successfully triggered manual crawl for ${limitedData.length} ICO items`,
      },
    }
    
  } catch (error) {
    return ErrorHandler.handleApiError(error, logger, traceId, 'Manual crawl')
  }
}
