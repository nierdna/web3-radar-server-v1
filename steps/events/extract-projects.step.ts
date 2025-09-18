import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ICOListExtractor } from '../../services/extractors/ico-list-extractor'
import { BasicInfoExtractor } from '../../services/extractors/basic-info-extractor'
import { TeamExtractor } from '../../services/extractors/team-extractor'
import { FinanceExtractor } from '../../services/extractors/finance-extractor'
import { ProjectService } from '../../services/database/project-service'

export const config: EventConfig = {
  type: 'event',
  name: 'ExtractProjects',
  description: 'Main step for extracting projects data - combines all extraction logic',
  subscribes: ['extraction.start'],
  emits: ['extraction.completed', 'extraction.failed', 'project.created', 'project.status.changed'],
  input: z.object({
    trigger: z.string().optional(),
    projectType: z.string().optional()
  }),
  flows: ['data-extraction']
}

export const handler = async (input: any, { emit, logger, traceId }: any) => {
  const { projectType = 'upcoming' } = input as { trigger?: string; projectType?: string }
  
  try {
    logger.info('Starting projects extraction', { projectType, traceId })
    
    // Step 1: Extract coin keys based on project type
    let coinKeys: string[] = []
    
    switch (projectType) {
      case 'active-ico':
        coinKeys = await ICOListExtractor.extractICOActiveKeys()
        break
      case 'all-ico':
        coinKeys = await ICOListExtractor.extractICOKeys()
        break
      case 'upcoming':
      default:
        coinKeys = await ICOListExtractor.extractICOUpcomingKeys()
        break
    }
    
    if (!coinKeys || coinKeys.length === 0) {
      logger.warn('No coin keys found', { projectType, traceId })
      await emit({
        topic: 'extraction.completed',
        data: { projectType, totalProcessed: 0, successCount: 0, failCount: 0, traceId }
      })
      return
    }
    
    logger.info(`Found ${coinKeys.length} coin keys`, { 
      projectType,
      totalCount: coinKeys.length,
      traceId 
    })
    
    // Step 2: Process each coin sequentially
    let successCount = 0
    let failCount = 0
    
    for (const coinKey of coinKeys) {
      try {
        logger.info(`Processing ${coinKey}`, { coinKey, traceId })
        
        // Extract basic info
        const basicInfo = await BasicInfoExtractor.extractByKey(coinKey)
        if (!basicInfo) {
          logger.warn(`No basic info for ${coinKey}`, { coinKey, traceId })
          failCount++
          continue
        }
        
        // Extract team data
        let teamData: any[] = []
        try {
          teamData = await TeamExtractor.extractByKey(coinKey)
          logger.info(`Extracted team data for ${coinKey}`, { 
            coinKey, 
            teamCount: teamData.length,
            traceId 
          })
        } catch (error) {
          logger.warn(`Team extraction failed for ${coinKey}`, { 
            coinKey, 
            error: (error as any).message, 
            traceId 
          })
        }
        
        // Extract finance data
        let financeData = null
        try {
          financeData = await FinanceExtractor.extractByKey(coinKey)
          logger.info(`Extracted finance data for ${coinKey}`, { 
            coinKey, 
            hasFinanceData: !!financeData,
            traceId 
          })
        } catch (error) {
          logger.warn(`Finance extraction failed for ${coinKey}`, { 
            coinKey, 
            error: (error as any).message, 
            traceId 
          })
        }
        
        // Combine all data
        const combinedData = {
          ...basicInfo,
          team: teamData,
          ...(financeData || {})
        }
        
        // Save to database
        const result = await ProjectService.createOrUpdateProject(coinKey, combinedData, 'system')
        const { project, isNewProject, oldStatus, newStatus, statusChanged } = result
        
        logger.info(`Successfully processed ${coinKey}`, { 
          coinKey, 
          projectId: project.id,
          name: project.name,
          isNewProject,
          statusChanged,
          traceId 
        })
        
        // Emit project.created event for new projects
        if (isNewProject) {
          await emit({
            topic: 'project.created',
            data: {
              projectName: project.name,
              symbol: project.symbol,
              status: newStatus,
              category: project.category,
              website: project.website,
              projectId: project.id,
              changeType: 'created'
            }
          })
        }
        
        // Emit project.status.changed event for status changes
        if (statusChanged && oldStatus) {
          await emit({
            topic: 'project.status.changed',
            data: {
              projectName: project.name,
              symbol: project.symbol,
              status: newStatus,
              category: project.category,
              website: project.website,
              projectId: project.id,
              changeType: 'status_changed',
              oldStatus,
              newStatus
            }
          })
        }
        
        successCount++
        
      } catch (error) {
        logger.error(`Failed to process ${coinKey}`, { 
          coinKey, 
          error: (error as any).message,
          traceId 
        })
        failCount++
      }
    }
    
    logger.info('Projects extraction completed', {
      projectType,
      totalProcessed: coinKeys.length,
      successCount,
      failCount,
      successRate: `${((successCount / coinKeys.length) * 100).toFixed(1)}%`,
      traceId
    })
    
    await emit({
      topic: 'extraction.completed',
      data: {
        projectType,
        totalProcessed: coinKeys.length,
        successCount,
        failCount,
        successRate: `${((successCount / coinKeys.length) * 100).toFixed(1)}%`,
        traceId
      }
    })
    
  } catch (error: any) {
    logger.error('Projects extraction failed', { 
      error: error.message,
      projectType,
      traceId 
    })
    
    await emit({
      topic: 'extraction.failed',
      data: {
        projectType,
        error: error.message,
        traceId
      }
    })
  }
}
