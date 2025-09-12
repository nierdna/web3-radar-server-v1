import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'AggregateCrawlResults',
  description: 'Aggregate individual project crawl results',
  subscribes: ['project.detail.crawled', 'project.detail.failed'],
  emits: ['crawl.batch.completed'],
  input: z.object({
    projectData: z.object({
      name: z.string(),
      symbol: z.string(),
      category: z.string(),
      chain: z.string(),
      status: z.string(),
      team: z.array(z.any()),
      crawledAt: z.string(),
      sourceUrl: z.string(),
    }).optional(),
    url: z.string(),
    error: z.string().optional(),
    traceId: z.string(),
  }),
  flows: ['crypto-crawler'],
}

export const handler: Handlers['AggregateCrawlResults'] = async (input, { emit, logger, state, traceId }) => {
  const { url, projectData, error, traceId: inputTraceId } = input
  const currentTraceId = traceId || inputTraceId

  try {
    // Get or initialize crawl summary
    let crawlSummary = await state.get('crawl', 'summary') || {
      totalUrls: 0,
      successCount: 0,
      errorCount: 0,
      successRate: 0,
      crawledAt: new Date().toISOString(),
      traceId: currentTraceId,
    }

    if (projectData) {
      // Success case
      crawlSummary.successCount++
      logger.info('Project crawled successfully', { 
        url, 
        projectName: projectData.name,
        successCount: crawlSummary.successCount,
        traceId: currentTraceId 
      })
    } else if (error) {
      // Error case
      crawlSummary.errorCount++
      logger.warn('Project crawl failed', { 
        url, 
        error, 
        errorCount: crawlSummary.errorCount,
        traceId: currentTraceId 
      })
    }

    // Update success rate
    crawlSummary.successRate = (crawlSummary.successCount / crawlSummary.totalUrls) * 100
    crawlSummary.lastUpdated = new Date().toISOString()

    // Store updated summary
    await state.set('crawl', 'summary', crawlSummary)

    // Check if all projects are processed
    const totalProcessed = crawlSummary.successCount + crawlSummary.errorCount
    if (totalProcessed >= crawlSummary.totalUrls) {
      // All projects processed, emit completion event
      await emit({
        topic: 'crawl.batch.completed',
        data: {
          summary: crawlSummary,
          traceId: currentTraceId,
        },
      })
      
      logger.info('All projects processed', { 
        summary: crawlSummary,
        traceId: currentTraceId 
      })
    }
    
  } catch (error) {
    logger.error('Failed to aggregate crawl results', { 
      url, 
      error: error.message, 
      traceId: currentTraceId 
    })
  }
}
