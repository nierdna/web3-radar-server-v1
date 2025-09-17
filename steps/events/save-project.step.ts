import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ProjectService } from '../../services/database/project-service'

export const config: EventConfig = {
  type: 'event',
  name: 'SaveProject',
  description: 'Save project data to database',
  subscribes: ['coins.finance.extracted'],
  emits: ['project.saved', 'project.failed'],
  input: z.object({
    coinKey: z.string(),
    combinedData: z.any()
  }),
  flows: ['data-extraction']
}

export const handler: Handlers['SaveProject'] = async (input, { emit, logger, traceId }) => {
  const { coinKey, combinedData } = input
  
  try {
    logger.info(`Saving project for ${coinKey}`, { coinKey, traceId })
    
    const project = await ProjectService.createOrUpdateProject(coinKey, combinedData, 'system-user')
    
    logger.info(`Successfully saved project for ${coinKey}`, { 
      coinKey, 
      projectId: project.id,
      projectName: project.name,
      traceId 
    })
    
    await emit({
      topic: 'project.saved',
      data: { 
        coinKey, 
        project: {
          id: project.id,
          name: project.name,
          symbol: project.symbol
        }
      }
    })
    
  } catch (error: any) {
    logger.error(`Failed to save project for ${coinKey}`, { 
      coinKey, 
      error: error.message,
      traceId 
    })
    
    await emit({
      topic: 'project.failed',
      data: { coinKey, error: error.message }
    })
  }
}
