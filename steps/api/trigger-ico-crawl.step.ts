import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { CryptoRankCrawler } from '../../services/crawl/crawler'
import { ErrorHandler } from '../../services/validations/error-handler'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'TriggerICOCrawl',
  description: 'Trigger ICO list crawl and distribute individual project processing',
  method: 'POST',
  path: '/crawl/ico-list',
  bodySchema: z.object({
    maxProjects: z.number().optional().default(50), 
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

export const handler: Handlers['TriggerICOCrawl'] = async (req, { emit, logger, traceId }) => {
  const { maxProjects = 50, delay = 2000 } = req.body
  const crawler = new CryptoRankCrawler()

  try {
    logger.info('Starting ICO list crawl', { maxProjects, delay, traceId })
    
    // Initialize crawler
    await crawler.init()
    
    // Crawl the list
    const icoData = await crawler.crawlUpcomingICOList(maxProjects)
    
    // Limit results if needed (if maxProjects is 0, use all data)
    const limitedData = maxProjects > 0 ? icoData.slice(0, maxProjects) : icoData
    const urls = limitedData.map(item => item.detailUrl)
    
    // Emit event with crawled data - this will trigger the distribution step
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

    logger.info('ICO list crawl completed', { 
      totalUrls: limitedData.length, 
      traceId 
    })

    return {
      status: 200,
      body: {
        success: true,
        totalUrls: limitedData.length,
        message: `Successfully triggered crawl for ${limitedData.length} ICO items`,
      },
    }
  } catch (error) {
    return ErrorHandler.handleApiError(error, logger, traceId, 'ICO list crawl')
  } finally {
    // Always close crawler
    await crawler.close()
  }
}
