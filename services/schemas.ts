import { z } from 'zod'

// Schemas for data validation
export const cryptoRankProjectSchema = z.object({
  name: z.string(),
  symbol: z.string().optional(),
  detailUrl: z.string(),
  chain: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  socials: z.object({
    twitter: z.string().optional(),
    discord: z.string().optional(),
    telegram: z.string().optional(),
    medium: z.string().optional(),
    github: z.string().optional(),
    website: z.string().optional(),
    farcaster: z.string().optional(),
    gitbook: z.string().optional(),
  }).optional(),
  communityMetrics: z.object({
    twitterFollowers: z.number().optional(),
    discordMembers: z.number().optional(),
    telegramMembers: z.number().optional(),
    githubStars: z.number().optional(),
  }).optional(),
  tokenomics: z.object({
    tokenName: z.string().optional(),
    tokenSymbol: z.string().optional(),
    tokenType: z.string().optional(),
    totalSupply: z.number().optional(),
    circulatingSupply: z.number().optional(),
    circulatingAtTGE: z.number().optional(),
    tokenContract: z.string().optional(),
    tokenAllocation: z.object({
      seed: z.object({ percentage: z.number(), vesting: z.string() }),
      private: z.object({ percentage: z.number(), vesting: z.string() }),
      team: z.object({ percentage: z.number(), vesting: z.string() }),
      treasury: z.object({ percentage: z.number(), vesting: z.string() }),
      public: z.object({ percentage: z.number(), vesting: z.string() })
    }).optional()
  }).optional(),
  tokenAllocations: z.array(z.object({
    name: z.string(),
    percent: z.number(),
    vestingSchedule: z.string().optional(),
    cliff: z.string().optional(),
  })).optional(),
  fundraising: z.object({
    totalRaised: z.number().optional(),
    notableInvestors: z.array(z.string()).optional(),
    fundingRounds: z.array(z.object({
      roundName: z.string(),
      date: z.string(),
      amount: z.number(),
      investors: z.array(z.string()),
      tokenPrice: z.number().optional()
    })).optional()
  }).optional(),
  fundingRounds: z.array(z.object({
    roundName: z.string(),
    date: z.string().optional(),
    amount: z.number().optional(),
    investors: z.array(z.string()).optional(),
    tokenPrice: z.number().optional(),
  })).optional(),
  tgeInfo: z.object({
    tgeDate: z.string().optional(),
    tgeExchange: z.string().optional(),
    initialMarketcap: z.number().optional(),
    listingPrice: z.number().optional(),
    marketCap: z.number().optional()
  }).optional(),
  preMarketPricing: z.array(z.object({
    platform: z.string(),
    lastPrice: z.number().optional(),
    totalVol: z.number().optional(),
    vol24h: z.number().optional(),
    change24h: z.number().optional(),
  })).optional(),
  team: z.array(z.object({
    name: z.string(),
    role: z.string(),
    linkedin: z.string().optional(),
    isAnonymous: z.boolean().optional().nullable()
  })).optional(),
  audit: z.object({
    auditor: z.string().optional(),
    reportLink: z.string().optional(),
    auditDate: z.string().optional()
  }).optional(),
  roadmap: z.array(z.object({
    milestone: z.string(),
    expectedDate: z.string().optional(),
    status: z.string().optional()
  })).optional(),
  teamMembers: z.array(z.object({
    name: z.string(),
    role: z.string().optional(),
    linkedin: z.string().optional(),
    anonymous: z.boolean().optional(),
  })).optional(),
  audits: z.array(z.object({
    auditor: z.string(),
    reportLink: z.string().optional(),
    auditDate: z.string().optional(),
  })).optional(),
  roadmapItems: z.array(z.object({
    milestone: z.string(),
    targetDate: z.string().optional(),
    status: z.string().optional(),
  })).optional(),
})

export type CryptoRankProject = z.infer<typeof cryptoRankProjectSchema>

// ICO List item schema
export const icoListItemSchema = z.object({
  detailUrl: z.string(),
  projectName: z.string(),
  tokenSymbol: z.string(),
  chain: z.string(),
  category: z.string(),
  status: z.string(),
  type: z.string(),
  initialCap: z.string(),
  raise: z.string(),
  launchpad: z.string(),
  when: z.string(),
  moniScore: z.string(),
})

export type ICOListItem = z.infer<typeof icoListItemSchema>