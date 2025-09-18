export interface ProjectData {
  name: string
  symbol?: string
  description?: string
  website?: string
  category?: string
  chain?: string
  status?: string
  tokenContract?: string
  socials?: {
    twitter?: string
    discord?: string
    telegram?: string
    medium?: string
    github?: string
  }
  fundraising?: {
    totalRaised?: number
    notableInvestors?: string[]
    fundingRounds?: FundingRound[]
  }
  tokenomics?: {
    tokenName?: string
    tokenSymbol?: string
    tokenType?: string
    totalSupply?: number
    circulatingSupply?: number
    tokenContract?: string
    allocations?: TokenAllocation[]
  }
  tgeInfo?: {
    tgeDate?: string
    tgeExchange?: string
    initialMarketcap?: number
  }
  communityMetrics?: {
    twitterFollowers?: number
    discordMembers?: number
    telegramMembers?: number
    githubStars?: number
  }
  team?: TeamMember[]
  // Finance extractor returns these at root level
  fundingRounds?: FundingRound[]
  allocations?: TokenAllocation[]
}

export interface FundingRound {
  roundName: string
  date: string
  amount: number
  investors: string[]
  tokenPrice?: number
  platform?: string
  lockup?: string
  status?: string
  tokensForSale?: number
}

export interface TokenAllocation {
  name: string
  percent: number
  vestingSchedule?: string
  cliff?: string
}

export interface TeamMember {
  name: string
  role: string
  linkedin?: string
  anonymous?: boolean
}

export interface ProjectStatus {
  current: string
  previous?: string
  changedAt: Date
}

export interface ProjectEvent {
  type: 'created' | 'updated' | 'status_changed'
  projectId: string
  projectName: string
  data: ProjectData
  status?: ProjectStatus
  timestamp: Date
}
