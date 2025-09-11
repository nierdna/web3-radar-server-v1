import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const crawlTeamTriggerSchema = z.object({
  projectUrl: z.string().url(),
  projectId: z.string().optional()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CrawlTeamTrigger',
  description: 'Trigger team information crawling for a project',
  method: 'POST',
  path: '/api/crawl/team-trigger',
  bodySchema: crawlTeamTriggerSchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      projectUrl: z.string()
    }),
    400: z.object({ error: z.string() })
  },
  emits: ['project.team.crawl'],
  flows: ['team-crawling']
}

export const handler: Handlers['CrawlTeamTrigger'] = async (req, { emit, logger, traceId }) => {
  try {
    const { projectUrl, projectId } = req.body
    
    logger.info('Triggering team crawl', { projectUrl, projectId, traceId })
    
    // Emit event to trigger team crawling
    await emit({
      topic: 'project.team.crawl',
      data: {
        projectUrl,
        projectId,
        traceId
      }
    })
    
    return {
      status: 200,
      body: {
        success: true,
        message: 'Team crawl triggered successfully',
        projectUrl
      }
    }
    
  } catch (error) {
    logger.error('Failed to trigger team crawl', { 
      error: error.message, 
      traceId 
    })
    
    return {
      status: 400,
      body: {
        error: 'Failed to trigger team crawl'
      }
    }
  }
}
