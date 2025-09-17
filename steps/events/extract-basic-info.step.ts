import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { BasicInfoExtractor } from '../../services/extractors/basic-info-extractor'

export const config: EventConfig = {
  type: 'event',
  name: 'ExtractBasicInfo',
  description: 'Extract basic information for a single coin',
  subscribes: ['coins.keys.extracted'],
  emits: ['coins.basic.extracted', 'coins.basic.failed'],
  input: z.object({
    coinKey: z.string()
  }),
  flows: ['data-extraction']
}

export const handler: Handlers['ExtractBasicInfo'] = async (input, { emit, logger, traceId }) => {
  const { coinKey } = input
  
  try {
    logger.info(`Extracting basic info for ${coinKey}`, { coinKey, traceId })
    
    const basicInfo = await BasicInfoExtractor.extractByKey(coinKey)
    
    if (!basicInfo) {
      logger.warn(`No basic info data for ${coinKey}`, { coinKey, traceId })
      await emit({
        topic: 'coins.basic.failed',
        data: { coinKey, error: 'No basic info data' }
      })
      return
    }
    
    logger.info(`Successfully extracted basic info for ${coinKey}`, { 
      coinKey,
      name: basicInfo.name,
      symbol: basicInfo.symbol,
      traceId 
    })
    
    await emit({
      topic: 'coins.basic.extracted',
      data: { coinKey, basicInfo }
    })
    
  } catch (error: any) {
    logger.error(`Failed to extract basic info for ${coinKey}`, { 
      coinKey, 
      error: error.message,
      traceId 
    })
    
    await emit({
      topic: 'coins.basic.failed',
      data: { coinKey, error: error.message }
    })
  }
}
