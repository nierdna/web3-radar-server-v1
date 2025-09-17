import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { FinanceExtractor } from '../../services/extractors/finance-extractor'

export const config: EventConfig = {
  type: 'event',
  name: 'ExtractFinanceData',
  description: 'Extract finance data for a single coin',
  subscribes: ['coins.team.extracted'],
  emits: ['coins.finance.extracted', 'coins.finance.failed'],
  input: z.object({
    coinKey: z.string(),
    combinedData: z.record(z.any())
  }),
  flows: ['data-extraction']
}

export const handler: Handlers['ExtractFinanceData'] = async (input, { emit, logger, traceId }) => {
  const { coinKey, combinedData } = input
  
  try {
    logger.info(`Extracting finance data for ${coinKey}`, { coinKey, traceId })
    
    const financeData = await FinanceExtractor.extractByKey(coinKey)
    
    // Combine team data with finance data
    const finalData = {
      ...(combinedData as Record<string, any>),
      ...(financeData || {})
    }
    
    logger.info(`Successfully extracted finance data for ${coinKey}`, { 
      coinKey,
      hasFinanceData: !!financeData,
      traceId 
    })
    
    await emit({
      topic: 'coins.finance.extracted',
      data: { coinKey, combinedData: finalData }
    })
    
  } catch (error: any) {
    logger.warn(`Finance data extraction failed for ${coinKey}, continuing with basic info only`, { 
      coinKey, 
      error: error.message,
      traceId 
    })
    
    // Even if finance fails, continue with team data
    const finalData = { ...(combinedData as Record<string, any>) }
    
    await emit({
      topic: 'coins.finance.extracted',
      data: { coinKey, combinedData: finalData }
    })
  }
}
