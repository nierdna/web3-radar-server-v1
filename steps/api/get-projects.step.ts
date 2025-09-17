import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ProjectService } from '../../services/database/project-service'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetProjects',
  description: 'Get all projects from database',
  method: 'GET',
  path: '/api/projects',
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      projects: z.array(z.object({
        id: z.string(),
        name: z.string(),
        symbol: z.string().optional(),
        description: z.string(),
        website: z.string().optional(),
        category: z.string(),
        chain: z.string(),
        launchStatus: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        socials: z.object({
          twitter: z.string().optional(),
          discord: z.string().optional(),
          telegram: z.string().optional(),
          medium: z.string().optional(),
          github: z.string().optional(),
        }).optional(),
        fundraising: z.object({
          totalRaised: z.number().optional(),
          notableInvestors: z.array(z.string()),
          fundingRounds: z.array(z.object({
            roundName: z.string(),
            date: z.string(),
            amount: z.number(),
            investors: z.array(z.string()),
            tokenPrice: z.number().optional(),
          })),
        }).optional(),
        tokenomic: z.object({
          tokenName: z.string(),
          tokenSymbol: z.string(),
          tokenType: z.string(),
          totalSupply: z.number(),
          circulatingSupply: z.number().optional(),
          tokenContract: z.string().optional(),
          allocations: z.array(z.object({
            name: z.string(),
            percent: z.number(),
            vestingSchedule: z.string().optional(),
            cliff: z.string().optional(),
          })),
        }).optional(),
        tgeInfo: z.object({
          tgeDate: z.string().optional(),
          tgeExchange: z.string().optional(),
          initialMarketcap: z.number().optional(),
        }).optional(),
        communityMetrics: z.object({
          twitterFollowers: z.number().optional(),
          discordMembers: z.number().optional(),
          telegramMembers: z.number().optional(),
          githubStars: z.number().optional(),
          mediumFollowers: z.number().optional(),
        }).optional(),
        team: z.array(z.object({
          name: z.string(),
          role: z.string(),
          linkedin: z.string().optional(),
          anonymous: z.boolean(),
        })),
      })),
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
  emits: [],
  flows: ['data-retrieval']
}

export const handler: Handlers['GetProjects'] = async (req, { logger, traceId }) => {
  try {
    logger.info('Fetching all projects', { traceId })
    
    const projects = await ProjectService.getAllProjects()
    
    logger.info('Successfully fetched projects', { 
      count: projects.length, 
      traceId 
    })
    
    return {
      status: 200,
      body: {
        success: true,
        projects: projects.map(project => ({
          id: project.id,
          name: project.name,
          symbol: project.symbol,
          description: project.description,
          website: project.website,
          category: project.category,
          chain: project.chain,
          launchStatus: project.launchStatus,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          socials: project.socials ? {
            twitter: project.socials.twitter,
            discord: project.socials.discord,
            telegram: project.socials.telegram,
            medium: project.socials.medium,
            github: project.socials.github,
          } : undefined,
          fundraising: project.fundraising ? {
            totalRaised: project.fundraising.totalRaised,
            notableInvestors: project.fundraising.notableInvestors,
            fundingRounds: project.fundraising.fundingRounds.map(round => ({
              roundName: round.roundName,
              date: round.date.toISOString(),
              amount: round.amount,
              investors: round.investors,
              tokenPrice: round.tokenPrice,
            })),
          } : undefined,
          tokenomic: project.tokenomic ? {
            tokenName: project.tokenomic.tokenName,
            tokenSymbol: project.tokenomic.tokenSymbol,
            tokenType: project.tokenomic.tokenType,
            totalSupply: project.tokenomic.totalSupply,
            circulatingSupply: project.tokenomic.circulatingSupply,
            tokenContract: project.tokenomic.tokenContract,
            allocations: project.tokenomic.allocations.map(allocation => ({
              name: allocation.name,
              percent: allocation.percent,
              vestingSchedule: allocation.vestingSchedule,
              cliff: allocation.cliff,
            })),
          } : undefined,
          tgeInfo: project.tgeInfo ? {
            tgeDate: project.tgeInfo.tgeDate?.toISOString(),
            tgeExchange: project.tgeInfo.tgeExchange,
            initialMarketcap: project.tgeInfo.initialMarketcap,
          } : undefined,
          communityMetrics: project.communityMetrics ? {
            twitterFollowers: project.communityMetrics.twitterFollowers,
            discordMembers: project.communityMetrics.discordMembers,
            telegramMembers: project.communityMetrics.telegramMembers,
            githubStars: project.communityMetrics.githubStars,
            mediumFollowers: project.communityMetrics.mediumFollowers,
          } : undefined,
          team: project.team.map(member => ({
            name: member.name,
            role: member.role,
            linkedin: member.linkedin,
            anonymous: member.anonymous,
          })),
        }))
      }
    }
    
  } catch (error: any) {
    logger.error('Failed to fetch projects', { 
      error: error.message, 
      traceId 
    })
    
    return {
      status: 500,
      body: {
        success: false,
        error: `Failed to fetch projects: ${error.message}`
      }
    }
  }
}
