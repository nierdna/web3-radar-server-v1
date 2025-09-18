import { prisma } from '../../lib/prisma'
import { 
  ProjectCategory, 
  Chain, 
  LaunchStatus, 
  TokenType, 
} from '@prisma/client'

export interface ProjectData {
  // Basic Info
  name: string
  symbol?: string
  description: string
  website?: string
  category: string
  chain: string
  status: string
  tokenContract?: string
  
  // Socials
  socials?: {
    twitter?: string
    discord?: string
    telegram?: string
    medium?: string
    github?: string
  }
  
  // Fundraising
  fundraising?: {
    totalRaised?: number
    notableInvestors?: string[]
    fundingRounds?: Array<{
      roundName: string
      date: Date
      amount: number
      investors: string[]
      tokenPrice?: number
      platform?: string
      lockup?: string
      status?: string
      tokensForSale?: number
    }>
  }
  
  // Tokenomics
  tokenomics?: {
    tokenName: string
    tokenSymbol: string
    tokenType: string
    totalSupply: number
    circulatingSupply?: number
    tokenContract?: string
    allocations?: Array<{
      name: string
      percent: number
      vestingSchedule?: string
      cliff?: string
    }>
  }
  
  // TGE Info
  tgeInfo?: {
    tgeDate?: Date
    tgeExchange?: string
    initialMarketcap?: number
  }
  
  // Community Metrics
  communityMetrics?: {
    twitterFollowers?: number
    discordMembers?: number
    telegramMembers?: number
    githubStars?: number
    mediumFollowers?: number
  }
  
  // Team
  team?: Array<{
    name: string
    role: string
    linkedin?: string
    anonymous?: boolean
  }>
  
  // Finance extractor returns these at root level
  fundingRounds?: Array<{
    roundName: string
    date: Date
    amount: number
    investors: string[]
    tokenPrice?: number
    platform?: string
    lockup?: string
    status?: string
    tokensForSale?: number
  }>
  
  allocations?: Array<{
    name: string
    percent: number
    vestingSchedule?: string
    cliff?: string
  }>
}

export class ProjectService {
  
  static async createOrUpdateProject(coinKey: string, data: ProjectData, userId: string) {
    try {
      const category = this.mapCategory(data.category)
      const chain = this.mapChain(data.chain)
      const launchStatus = this.mapLaunchStatus(data.status)
      const tokenType = this.mapTokenType(data.tokenomics?.tokenType || 'Utility')
      
      
      let systemUser = await prisma.user.findFirst({
        where: { email: 'system@web3radar.com' }
      })
      
      if (!systemUser) {
        systemUser = await prisma.user.create({
          data: {
            email: 'system@web3radar.com',
            name: 'System User',
            role: 'Admin'
          }
        })
      }
      
      const actualUserId = systemUser.id
      
      // Check for existing project by name + symbol (as per SRS)
      let existingProject = null
      let matchType = ''
      
      // First try: name + symbol
      if (data.symbol) {
        existingProject = await prisma.web3Project.findFirst({
          where: {
            name: data.name,
            symbol: data.symbol
          }
        })
        if (existingProject) {
          matchType = 'name + symbol'
        }
      }
      
      
      let project
      if (existingProject) {
        console.log(` Updating existing project: ${data.name} (matched by: ${matchType})`)
        project = await prisma.web3Project.update({
          where: { id: existingProject.id },
          data: {
            name: data.name,
            symbol: data.symbol,
            description: data.description,
            website: data.website,
            category,
            chain,
            launchStatus,
            updatedById: actualUserId,
          }
        })
      } else {
        console.log(`Creating new project: ${data.name} (${data.symbol || 'no symbol'})`)
        project = await prisma.web3Project.create({
          data: {
            id: `${coinKey}-${data.symbol || data.name}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            name: data.name,
            symbol: data.symbol,
            description: data.description,
            website: data.website,
            category,
            chain,
            launchStatus,
            createdById: actualUserId,
            updatedById: actualUserId,
          }
        })
      }
      if (data.socials) {
        await prisma.socials.upsert({
          where: { projectId: project.id },
          update: data.socials,
          create: {
            ...data.socials,
            projectId: project.id,
          },
        })
      }
      
      // Create/update fundraising
      if (data.fundraising) {
        const fundraising = await prisma.fundraising.upsert({
          where: { projectId: project.id },
          update: {
            totalRaised: data.fundraising.totalRaised,
            notableInvestors: data.fundraising.notableInvestors || [],
          },
          create: {
            totalRaised: data.fundraising.totalRaised,
            notableInvestors: data.fundraising.notableInvestors || [],
            projectId: project.id,
          },
        })
        
        // Create/update funding rounds
        if (data.fundingRounds && data.fundingRounds.length > 0) {
          // Delete existing rounds
          await prisma.fundingRound.deleteMany({
            where: { fundraisingId: fundraising.id },
          })
          
          // Create new rounds
          await prisma.fundingRound.createMany({
            data: data.fundingRounds
              .filter((round: any) => round.date !== null) // Filter out rounds with null dates
              .map((round: any) => ({
                roundName: round.roundName,
                date: round.date,
                amount: round.amount,
                investors: round.investors,
                tokenPrice: round.tokenPrice,
                fundraisingId: fundraising.id,
              })),
          })
        }
      }
      
      // Create/update tokenomics
      if (data.tokenomics) {
        const tokenomic = await prisma.tokenomic.upsert({
          where: { projectId: project.id },
          update: {
            tokenName: data.tokenomics.tokenName,
            tokenSymbol: data.tokenomics.tokenSymbol,
            tokenType,
            totalSupply: data.tokenomics.totalSupply,
            circulatingSupply: data.tokenomics.circulatingSupply,
            tokenContract: data.tokenomics.tokenContract || data.tokenContract, // Use basicInfo tokenContract as fallback
          },
          create: {
            tokenName: data.tokenomics.tokenName,
            tokenSymbol: data.tokenomics.tokenSymbol,
            tokenType,
            totalSupply: data.tokenomics.totalSupply,
            circulatingSupply: data.tokenomics.circulatingSupply,
            tokenContract: data.tokenomics.tokenContract || data.tokenContract, // Use basicInfo tokenContract as fallback
            projectId: project.id,
          },
        })
        
        // Create/update token allocations
        if (data.allocations && data.allocations.length > 0) {
          // Delete existing allocations
          await prisma.tokenAllocation.deleteMany({
            where: { tokenomicId: tokenomic.id },
          })
          
          // Create new allocations
          await prisma.tokenAllocation.createMany({
            data: data.allocations.map((allocation: any) => ({
              name: allocation.name,
              percent: allocation.percent,
              vestingSchedule: allocation.vestingSchedule,
              cliff: allocation.cliff,
              tokenomicId: tokenomic.id,
            })),
          })
        }
      }
      
      // Create/update TGE info
      if (data.tgeInfo) {
        await prisma.tgeInfo.upsert({
          where: { projectId: project.id },
          update: data.tgeInfo,
          create: {
            ...data.tgeInfo,
            projectId: project.id,
          },
        })
      }
      
      // Create/update community metrics
      if (data.communityMetrics) {
        await prisma.communityMetrics.upsert({
          where: { projectId: project.id },
          update: data.communityMetrics,
          create: {
            ...data.communityMetrics,
            projectId: project.id,
          },
        })
      }
      
      // Create/update team members
      if (data.team && data.team.length > 0) {
        // Delete existing team members
        await prisma.teamMember.deleteMany({
          where: { projectId: project.id },
        })
        
        // Create new team members
        await prisma.teamMember.createMany({
          data: data.team.map(member => ({
            name: member.name,
            role: member.role,
            linkedin: member.linkedin,
            anonymous: member.anonymous || false,
            projectId: project.id,
          })),
        })
      }
      
      return project
    } catch (error) {
      console.error('Error creating/updating project:', error)
      throw error
    }
  }
  
  private static mapCategory(category: string): ProjectCategory {
    const categoryMap: Record<string, ProjectCategory> = {
      'defi': ProjectCategory.DeFi,
      'nft': ProjectCategory.NFT,
      'gamefi': ProjectCategory.GameFi,
      'dao': ProjectCategory.DAO,
      'infra': ProjectCategory.Infra,
      'tool': ProjectCategory.Tool,
      'layer1': ProjectCategory.Layer1,
      'layer2': ProjectCategory.Layer2,
      'cefi': ProjectCategory.DeFi, // Map CeFi to DeFi
    }
    return categoryMap[category.toLowerCase()] || ProjectCategory.Others
  }
  
  private static mapChain(chain: string): Chain {
    const chainMap: Record<string, Chain> = {
      'ethereum': Chain.Ethereum,
      'solana': Chain.Solana,
      'bsc': Chain.BNB,
      'binance smart chain': Chain.BNB,
      'polygon': Chain.Polygon,
      'arbitrum': Chain.Arbitrum,
      'optimism': Chain.Optimism,
      'avalanche': Chain.Avalanche,
      'fantom': Chain.Fantom,
      'cardano': Chain.Cardano,
      'polkadot': Chain.Polkadot,
      'cosmos': Chain.Cosmos,
      'near': Chain.Near,
      'algorand': Chain.Algorand,
      'tezos': Chain.Tezos,
      'aptos': Chain.Aptos,
      'sui': Chain.Sui,
      'base': Chain.Base,
      'linea': Chain.Linea,
      'scroll': Chain.Scroll,
      'mantle': Chain.Mantle,
      'zksync': Chain.zkSync,
      'starknet': Chain.Starknet,
      'immutable': Chain.Immutable,
      'ronin': Chain.Ronin,
      'oasys': Chain.Oasys,
    }
    return chainMap[chain.toLowerCase()] || Chain.Other
  }
  
  private static mapLaunchStatus(status: string): LaunchStatus {
    const statusMap: Record<string, LaunchStatus> = {
      'upcoming': LaunchStatus.Upcoming,
      'active': LaunchStatus.Active,
      'ended': LaunchStatus.Ended,
      'past': LaunchStatus.Ended,
      'testnet': LaunchStatus.Testnet,
      'dead': LaunchStatus.Dead,
      'mainnet': LaunchStatus.Mainnet,
      'notlaunched': LaunchStatus.NotLaunched,
    }
    return statusMap[status.toLowerCase()] || LaunchStatus.NotLaunched
  }
  
  private static mapTokenType(tokenType: string): TokenType {
    const typeMap: Record<string, TokenType> = {
      'utility': TokenType.Utility,
      'governance': TokenType.Governance,
      'security': TokenType.Security,
      'reward': TokenType.Reward,
      'staking': TokenType.Staking,
      'liquidity': TokenType.Liquidity,
    }
    return typeMap[tokenType.toLowerCase()] || TokenType.Utility
  }
  
  static async getProject(coinKey: string) {
    return await prisma.web3Project.findFirst({
      where: {
        id: {
          contains: coinKey.toLowerCase()
        }
      },
      include: {
        socials: true,
        fundraising: {
          include: {
            fundingRounds: true
          }
        },
        tokenomic: {
          include: {
            allocations: true
          }
        },
        tgeInfo: true,
        communityMetrics: true,
        team: true,
        audits: true,
        roadmap: true,
        preMarketPricing: true,
      }
    })
  }
  
  static async getProjectById(projectId: string) {
    return await prisma.web3Project.findUnique({
      where: {
        id: projectId
      },
      include: {
        socials: true,
        fundraising: {
          include: {
            fundingRounds: true
          }
        },
        tokenomic: {
          include: {
            allocations: true
          }
        },
        tgeInfo: true,
        communityMetrics: true,
        team: true,
        audits: true,
        roadmap: true,
        preMarketPricing: true,
      }
    })
  }
  
  static async getAllProjects() {
    return await prisma.web3Project.findMany({
      include: {
        socials: true,
        fundraising: {
          include: {
            fundingRounds: true
          }
        },
        tokenomic: {
          include: {
            allocations: true
          }
        },
        tgeInfo: true,
        communityMetrics: true,
        team: true,
        audits: true,
        roadmap: true,
        preMarketPricing: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }
}
