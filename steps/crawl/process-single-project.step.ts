import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { CryptoRankCrawler } from '../../services/crawl/crawler'
import { normalizeProjectData } from '../../services/utils/utils'
import { ErrorHandler } from '../../services/validations/error-handler'

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessSingleProject',
  description: 'Process individual project detail crawling',
  subscribes: ['project.crawl.requested'],
  emits: ['project.detail.crawled', 'project.detail.failed'],
  input: z.object({
    url: z.string(),
    basicData: z.object({
      projectName: z.string().optional(),
      tokenSymbol: z.string().optional(),
      chain: z.string().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
    }).optional(),
    traceId: z.string(),
  }),
  flows: ['crypto-crawler'],
}

export const handler: Handlers['ProcessSingleProject'] = async (input, { emit, logger, state, traceId }) => {
  const { url, basicData = {}, traceId: inputTraceId } = input
  const currentTraceId = traceId || inputTraceId
  const crawler = new CryptoRankCrawler()

  try {
    logger.info('Starting single project crawl', { url, traceId: currentTraceId })
    
    // Initialize crawler
    await crawler.init()
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
    
    // Crawl project detail
    const projectData = await crawler.crawlProjectDetail(url)
    
    if (!projectData) {
      throw new Error('No project data found')
    }
    
    // Normalize and enrich data
    const normalizedData = normalizeProjectData(projectData)
    
    // Crawl team info
    let teamMembers = []
    try {
      teamMembers = await crawler.crawlTeamInfo(url)
      logger.info('Team info crawled', { url, teamCount: teamMembers.length, traceId: currentTraceId })
    } catch (error) {
      const errorMessage = ErrorHandler.handleCrawlError(error, logger, currentTraceId, 'Team info crawl', { url })
      logger.warn('Failed to crawl team info', { url, error: errorMessage, traceId: currentTraceId })
    }
    
    const enrichedData = {
      ...normalizedData,
      // Use data from list page if available, otherwise use detail page
      name: basicData.projectName || normalizedData.name,
      symbol: basicData.tokenSymbol || normalizedData.symbol,
      category: basicData.category || normalizedData.category || '',
      chain: basicData.chain || normalizedData.chain || '',
      status: basicData.status || normalizedData.status || '',
      team: teamMembers,
      crawledAt: new Date().toISOString(),
      sourceUrl: url,
    }
    
    // Store in state
    await state.set('projects', url, enrichedData)
    
    // Emit success event
    await emit({
      topic: 'project.detail.crawled',
      data: {
        projectData: enrichedData,
        url,
        traceId: currentTraceId,
      },
    })
    
    logger.info('Single project crawl completed', { 
      url, 
      projectName: enrichedData.name,
      teamCount: teamMembers.length,
      traceId: currentTraceId 
    })
    
  } catch (error) {
    const errorMessage = ErrorHandler.handleCrawlError(error, logger, currentTraceId, 'Single project crawl', { url })
    
    // Emit failure event
    await emit({
      topic: 'project.detail.failed',
      data: {
        url,
        error: errorMessage,
        traceId: currentTraceId,
      },
    })
    
    logger.error('Single project crawl failed', { url, error: errorMessage, traceId: currentTraceId })
  } finally {
    // Always close crawler
    await crawler.close()
  }
}
