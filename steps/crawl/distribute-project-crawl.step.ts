import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ErrorHandler } from '../../services/validations/error-handler'

export const config: EventConfig = {
  type: 'event',
  name: 'DistributeProjectCrawl',
  description: 'Distribute individual project crawl requests',
  subscribes: ['ico.list.crawled'],
  emits: ['project.crawl.requested'],
  input: z.object({
    urls: z.array(z.string()),
    icoData: z.array(z.object({
      detailUrl: z.string(),
      projectName: z.string(),
      tokenSymbol: z.string(),
      chain: z.string(),
      category: z.string(),
      status: z.string(),
    })),
    totalCount: z.number(),
    originalCount: z.number(),
    crawledAt: z.string(),
    traceId: z.string(),
  }),
  flows: ['crypto-crawler'],
}

export const handler: Handlers['DistributeProjectCrawl'] = async (input, { emit, logger, traceId }) => {
  const { urls, icoData } = input
  
  // Create a map of URL to basic data for quick lookup
  const urlToBasicData = new Map<string, any>()
  icoData.forEach((item: any) => {
    urlToBasicData.set(item.detailUrl, item)
  })

  try {
    logger.info('Starting project crawl distribution', { 
      totalUrls: urls.length, 
      traceId 
    })
    
    // Emit individual events for each project
    for (const url of urls) {
      const basicData = urlToBasicData.get(url) || {}
      
      await emit({
        topic: 'project.crawl.requested',
        data: {
          url,
          basicData: {
            projectName: basicData.projectName,
            tokenSymbol: basicData.tokenSymbol,
            chain: basicData.chain,
            category: basicData.category,
            status: basicData.status,
          },
          traceId,
        },
      })
      
      // Small delay between emissions to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    logger.info('Project crawl distribution completed', { 
      totalUrls: urls.length,
      traceId 
    })
    
  } catch (error) {
    const errorMessage = ErrorHandler.handleCrawlError(error, logger, traceId, 'Project crawl distribution')
    logger.error('Project crawl distribution failed', { error: errorMessage, traceId })
  }
}
