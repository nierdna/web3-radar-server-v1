import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { CryptoRankCrawler, normalizeProjectData, mapToProjectCategory, mapToChain } from '../services/crawler'

export const config: EventConfig = {
  type: 'event',
  name: 'CrawlProjectDetail',
  description: 'Crawl individual project details from CryptoRank',
  subscribes: ['ico.list.crawled'],
  emits: ['project.detail.crawled', 'project.detail.failed'],
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

export const handler: Handlers['CrawlProjectDetail'] = async (input, { emit, logger, state, traceId }) => {
  const { urls, icoData } = input
  
  // Create a map of URL to basic data for quick lookup
  const urlToBasicData = new Map()
  icoData.forEach(item => {
    urlToBasicData.set(item.detailUrl, item)
  })
  const crawler = new CryptoRankCrawler()
  
  let successCount = 0
  let errorCount = 0
  const crawledProjects: any[] = []

  try {
    logger.info('Starting project detail crawl', { 
      totalUrls: urls.length, 
      traceId 
    })
    
    // Initialize crawler
    await crawler.init()
    
    // Process each URL with concurrency control
    const concurrency = 3 // Process 3 projects at a time
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency)
      
      // Process batch in parallel
      const batchPromises = batch.map(async (url, index) => {
        try {
          // Add delay between requests to avoid rate limiting
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000))
          }
          
          const projectData = await crawler.crawlProjectDetail(url)
          
          if (projectData) {
            // Get basic data from list page
            const basicData = urlToBasicData.get(url) || {}
            
            // Normalize and enrich data
            const normalizedData = normalizeProjectData(projectData)
            const enrichedData = {
              ...normalizedData,
              // Use data from list page if available, otherwise use detail page
              name: basicData.projectName || normalizedData.name,
              symbol: basicData.tokenSymbol || normalizedData.symbol,
              category: mapToProjectCategory(basicData.category || normalizedData.category || ''),
              chain: mapToChain(basicData.chain || normalizedData.chain || ''),
              status: basicData.status || normalizedData.status || '',
              crawledAt: new Date().toISOString(),
              sourceUrl: url,
            }
            
            // Store in state
            await state.set('projects', url, enrichedData)
            crawledProjects.push(enrichedData)
            
            successCount++
            logger.info('Project crawled successfully', { 
              url, 
              name: enrichedData.name,
              traceId 
            })
            
            // Emit individual project event
            await (emit as any)({
              topic: 'project.detail.crawled',
              data: {
                project: enrichedData,
                url,
                traceId,
              },
            })
          } else {
            errorCount++
            logger.warn('Failed to crawl project', { url, traceId })
            
            await (emit as any)({
              topic: 'project.detail.failed',
              data: {
                url,
                error: 'No data extracted',
                traceId,
              },
            })
          }
        } catch (error) {
          errorCount++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          logger.error('Error crawling project', { 
            url, 
            error: errorMessage, 
            traceId 
          })
          
          await (emit as any)({
            topic: 'project.detail.failed',
            data: {
              url,
              error: errorMessage,
              traceId,
            },
          })
        }
      })
      
      // Wait for batch to complete
      await Promise.all(batchPromises)
      
      // Log progress
      logger.info('Batch completed', { 
        processed: Math.min(i + concurrency, urls.length),
        total: urls.length,
        successCount,
        errorCount,
        traceId 
      })
    }
    
    // Store crawl summary in state
    const crawlSummary = {
      totalUrls: urls.length,
      successCount,
      errorCount,
      successRate: (successCount / urls.length) * 100,
      crawledAt: new Date().toISOString(),
      traceId,
    }
    
    await state.set('crawl', 'summary', crawlSummary)
    
    logger.info('Project detail crawl completed', crawlSummary)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Project detail crawl failed', { 
      error: errorMessage, 
      traceId 
    })
  } finally {
    // Always close crawler
    await crawler.close()
  }
}
