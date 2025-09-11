import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { TeamExtractor } from '../services/extractors/team-extractor'
import { normalizeProjectData } from '../services/utils'

const crawlTeamInfoSchema = z.object({
  projectUrl: z.string().url(),
  projectId: z.string().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'CrawlTeamInfo',
  description: 'Crawl team information from project team page',
  subscribes: ['project.team.crawl'],
  emits: ['project.team.crawled', 'project.team.failed'],
  input: crawlTeamInfoSchema,
  flows: ['team-crawling']
}

export const handler: Handlers['CrawlTeamInfo'] = async (input, { emit, state, logger, traceId }) => {
  const { projectUrl, projectId } = input
  
  try {
    logger.info('Starting team info crawl', { projectUrl, traceId })
    
    // Import puppeteer dynamically to avoid issues
    const puppeteer = await import('puppeteer')
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    
    // Extract team information
    const teamMembers = await TeamExtractor.extractTeamInfo(page, projectUrl)
    
    await browser.close()
    
    // Add projectId to each team member
    const teamMembersWithProjectId = teamMembers.map(member => ({
      ...member,
      projectId: projectId || projectUrl // Use projectId if available, otherwise use URL as fallback
    }))
    
    // Store team data in state
    const teamData = {
      projectUrl,
      projectId,
      teamMembers: teamMembersWithProjectId,
      crawledAt: new Date().toISOString(),
      traceId
    }
    
    await state.set(traceId, `team:${projectUrl}`, teamData)
    
    logger.info('Team info crawl completed', { 
      projectUrl, 
      teamCount: teamMembers.length,
      traceId 
    })
    
    await (emit as any)({
      topic: 'project.team.crawled',
      data: teamData
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    logger.error('Team info crawl failed', { 
      projectUrl, 
      error: errorMessage,
      traceId 
    })
    
    await (emit as any)({
      topic: 'project.team.failed',
      data: {
        projectUrl,
        error: errorMessage,
        traceId
      }
    })
  }
}
