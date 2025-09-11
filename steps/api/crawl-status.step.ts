import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ErrorHandler } from '../../services/validations/error-handler'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CrawlStatus',
  description: 'Get crawling status and statistics',
  method: 'GET',
  path: '/crawl/status',
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      status: z.object({
        lastCrawl: z.string().optional(),
        totalProjects: z.number(),
        successRate: z.number(),
        errorRate: z.number(),
        recentCrawls: z.array(z.object({
          timestamp: z.string(),
          totalUrls: z.number(),
          successCount: z.number(),
          errorCount: z.number(),
          successRate: z.number(),
        })),
      }),
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
  emits: [],
  flows: ['crypto-crawler'],
}

export const handler: Handlers['CrawlStatus'] = async (req, { state, logger, traceId }) => {
  try {
    logger.info('Fetching crawl status', { traceId })
    
    // Get last crawl time
    const lastCrawl = await state.get('crawl', 'lastRun') as string | undefined
    
    // Get crawl summary
    const crawlSummary = await state.get('crawl', 'summary') as any
    
    // Get all projects count
    const allProjects = await state.get('projects', '*') || {}
    const totalProjects = Object.keys(allProjects).length
    
    // Calculate success rate
    const successRate = crawlSummary?.successRate || 0
    const errorRate = 100 - successRate
    
    // Get recent crawl history (last 10)
    const recentCrawls = crawlSummary ? [{
      timestamp: crawlSummary.crawledAt || new Date().toISOString(),
      totalUrls: crawlSummary.totalUrls || 0,
      successCount: crawlSummary.successCount || 0,
      errorCount: crawlSummary.errorCount || 0,
      successRate: crawlSummary.successRate || 0,
    }] : []
    
    const status = {
      lastCrawl: lastCrawl || undefined,
      totalProjects,
      successRate: Math.round(successRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      recentCrawls,
    }
    
    logger.info('Crawl status retrieved', { 
      totalProjects, 
      successRate, 
      traceId 
    })
    
    return {
      status: 200,
      body: {
        success: true,
        status,
      },
    }
  } catch (error) {
    ErrorHandler.handleCrawlError(error, logger, traceId, 'Crawl status fetch')
    
    // Return 200 with error info instead of 500
    return {
      status: 200,
      body: {
        success: false,
        status: {
          lastCrawl: undefined,
          totalProjects: 0,
          successRate: 0,
          errorRate: 100,
          recentCrawls: [],
        },
      },
    }
  }
}
