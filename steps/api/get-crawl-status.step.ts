import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetCrawlStatus',
  description: 'Get current crawl status and results',
  method: 'GET',
  path: '/crawl/status',
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      summary: z.object({
        totalUrls: z.number(),
        successCount: z.number(),
        errorCount: z.number(),
        successRate: z.number(),
        crawledAt: z.string(),
        lastUpdated: z.string().optional(),
        traceId: z.string(),
      }).optional(),
      message: z.string(),
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
  flows: ['crypto-crawler'],
}

export const handler: Handlers['GetCrawlStatus'] = async (req, { state, logger, traceId }) => {
  try {
    logger.info('Getting crawl status', { traceId })
    
    // Get crawl summary from state
    const summary = await state.get('crawl', 'summary')
    
    if (!summary) {
      return {
        status: 200,
        body: {
          success: true,
          message: 'No crawl data found',
        },
      }
    }
    
    logger.info('Crawl status retrieved', { summary, traceId })
    
    return {
      status: 200,
      body: {
        success: true,
        summary,
        message: `Crawl status: ${summary.successCount}/${summary.totalUrls} projects completed (${summary.successRate.toFixed(1)}% success rate)`,
      },
    }
  } catch (error) {
    logger.error('Failed to get crawl status', { error: error.message, traceId })
    return {
      status: 500,
      body: {
        success: false,
        error: 'Failed to get crawl status',
      },
    }
  }
}
