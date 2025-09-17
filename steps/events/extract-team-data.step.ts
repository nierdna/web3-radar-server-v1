import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { TeamExtractor } from '../../services/extractors/team-extractor'

export const config: EventConfig = {
  type: 'event',
  name: 'ExtractTeamData',
  description: 'Extract team data for a single coin',
  subscribes: ['coins.basic.extracted'],
  emits: ['coins.team.extracted', 'coins.team.failed'],
  input: z.object({
    coinKey: z.string(),
    basicInfo: z.record(z.any())
  }),
  flows: ['data-extraction']
}

export const handler: Handlers['ExtractTeamData'] = async (input, { emit, logger, traceId }) => {
  const { coinKey, basicInfo } = input
  
  try {
    logger.info(`Extracting team data for ${coinKey}`, { coinKey, traceId })
    
    const teamData = await TeamExtractor.extractByKey(coinKey)
    
    // Combine basic info with team data
    const combinedData = {
      ...(basicInfo as Record<string, any>),
      team: teamData
    }
    
    logger.info(`Successfully extracted team data for ${coinKey}`, { 
      coinKey,
      teamCount: teamData.length,
      traceId 
    })
    
    await emit({
      topic: 'coins.team.extracted',
      data: { coinKey, combinedData }
    })
    
  } catch (error: any) {
    logger.warn(`Team data extraction failed for ${coinKey}, continuing without team data`, { 
      coinKey, 
      error: error.message,
      traceId 
    })
    
    // Even if team fails, continue with basic info
    const combinedData = { ...(basicInfo as Record<string, any>), team: [] }
    
    await emit({
      topic: 'coins.team.extracted',
      data: { coinKey, combinedData }
    })
  }
}
