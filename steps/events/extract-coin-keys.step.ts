import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ICOListExtractor } from '../../services/extractors/ico-list-extractor'

export const config: EventConfig = {
  type: 'event',
  name: 'ExtractCoinKeys',
  description: 'Extract coin keys from CryptoRank ICO list',
  subscribes: ['extraction.start'],
  emits: ['coins.keys.extracted'],
  input: z.object({
    trigger: z.string().optional()
  }),
  flows: ['data-extraction']
}

export const handler: Handlers['ExtractCoinKeys'] = async (input, { emit, logger, traceId }) => {
  try {
    logger.info('Starting coin keys extraction', { traceId })
    
    const coinKeys = await ICOListExtractor.extractKeys()
    
    if (!coinKeys || coinKeys.length === 0) {
      logger.warn('No coin keys found from CryptoRank', { traceId })
      return
    }
    
    logger.info(`Found ${coinKeys.length} coin keys`, { 
      totalCount: coinKeys.length,
      sampleKeys: coinKeys.slice(0, 5),
      traceId 
    })
    
    // Emit each coin key for parallel processing
    for (const coinKey of coinKeys) {
      await emit({
        topic: 'coins.keys.extracted',
        data: { coinKey }
      })
    }
    
    logger.info('Coin keys extraction completed', { 
      totalCoins: coinKeys.length,
      traceId 
    })
    
  } catch (error: any) {
    logger.error('Coin keys extraction failed', { 
      error: error.message,
      traceId 
    })
  }
}
