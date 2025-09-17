import { CRYPTORANK_BASE_URL } from '../../lib/config/url'
import { axiosClient } from '../../lib/config/axios'

export class FinanceExtractor {
  
  static async extractByKey(coinKey: string): Promise<any> {
    try {
      console.log(`Fetching finance data for: ${coinKey}`)
      const url = `${CRYPTORANK_BASE_URL}/app/coins/${coinKey}/token-sales?sortBy=Date`
      const res = await axiosClient.get(url)
      const data = res.data || {}
      
      console.log(`Finance response for ${coinKey}:`, {
        status: res.status,
        hasCoinData: !!data.coin,
        hasRounds: !!data.rounds,
        roundsCount: Array.isArray(data.rounds) ? data.rounds.length : 0
      })

      const fundraising = { totalRaised: 0, notableInvestors: [] as string[] }
      const fundingRounds: any[] = []
      const tokenomics = {
        tokenName: '',
        tokenSymbol: '',
        tokenType: 'Utility',
        totalSupply: 0,
        circulatingSupply: 0,
        tokenContract: ''
      }
      const allocations: any[] = []
      const tgeInfo = { tgeDate: null as any, tgeExchange: '', initialMarketcap: 0 }

      const coinData = data.coin || {}
      if (coinData) {
        tokenomics.tokenName = coinData.name || ''
        tokenomics.tokenSymbol = coinData.symbol || ''
        tokenomics.totalSupply = coinData.totalSupply || coinData.maxSupply || 0
        tokenomics.circulatingSupply = coinData.initialSupply || coinData.availableSupply || 0
        tgeInfo.initialMarketcap = coinData.icoFullyDilutedMarketCap || coinData.initialMarketCap || 0
      }

      const rounds = Array.isArray(data.rounds) ? data.rounds : []
      rounds.forEach((round: any) => {
        if (round.kind !== 'Crowdsale' && round.kind !== 'FundingRound') return

        const investorNames: string[] = []
        if (round.investors && typeof round.investors === 'object') {
          Object.values(round.investors).forEach((tier: any) => {
            if (!Array.isArray(tier)) return
            tier.forEach((inv: any) => {
              const name = inv?.name || inv?.slug || ''
              if (name && !investorNames.includes(name)) investorNames.push(name)
            })
          })
        }

        fundingRounds.push({
          roundName: round.type || 'IDO',
          date: round.start ? new Date(round.start) : (round.date ? new Date(round.date) : null),
          amount: round.raise?.USD || 0,
          investors: investorNames,
          tokenPrice: round.price?.USD || 0,
          platform: round.idoPlatformKey || 'N/A',
          lockup: round.lockupPeriod || '',
          status: round.status || 'upcoming',
          tokensForSale: round.tokensForSale || round.tokens_for_sale || 0
        })
      })

      // Extract TGE info from funding rounds
      const upcomingRound = rounds.find((r: any) => r.status === 'upcoming' && (r.kind === 'Crowdsale' || r.kind === 'FundingRound'))
      const activeRound = rounds.find((r: any) => r.status === 'active' && (r.kind === 'Crowdsale' || r.kind === 'FundingRound'))
      
      if (upcomingRound?.start) {
        tgeInfo.tgeDate = new Date(upcomingRound.start)
      } else if (activeRound?.start) {
        tgeInfo.tgeDate = new Date(activeRound.start)
      }
      
      if (upcomingRound?.idoPlatformKey) {
        tgeInfo.tgeExchange = upcomingRound.idoPlatformKey
      } else if (activeRound?.idoPlatformKey) {
        tgeInfo.tgeExchange = activeRound.idoPlatformKey
      }

      // Fetch investors with retry logic
      try {
        console.log(` Fetching investors for: ${coinKey}`)
        const invRes = await axiosClient.get(`${CRYPTORANK_BASE_URL}/coins/${coinKey}/investors-list`, { 
          params: { limit: 10, skip: 0 },
          timeout: 10000 // 10 second timeout
        })
        const invData = invRes.data || {}
        const investorsArr = Array.isArray(invData.investors) ? invData.investors : []
        const investorNames = investorsArr.map((i: any) => i?.name).filter(Boolean)
        fundraising.notableInvestors = investorNames
        
        console.log(`Found ${investorNames.length} investors for ${coinKey}`)
        
        if (typeof invData.total_raise === 'number' && invData.total_raise > 0) {
          fundraising.totalRaised = Math.max(fundraising.totalRaised || 0, invData.total_raise)
        }
      } catch (investorError: any) {
        console.log(`Investors API failed for ${coinKey}:`, investorError.message)
        if (investorError.response) {
          console.log(`  Status: ${investorError.response.status}`)
          if (investorError.response.status === 429) {
            console.log(`  Rate limited - will retry later`)
          }
        }
        // Don't throw error, continue with other data
      }

      const roundsTotal = fundingRounds.reduce((sum, r) => sum + (r.amount || 0), 0)
      if (roundsTotal > fundraising.totalRaised) fundraising.totalRaised = roundsTotal

      // Fetch token allocations
      try {
        const allocationRes = await axiosClient.get(`${CRYPTORANK_BASE_URL}/coins/${coinKey}/allocation-chart`)
        const allocationData = allocationRes.data
        if (allocationData?.data && Array.isArray(allocationData.data)) {
          allocations.push(...allocationData.data.map((item: any) => ({
            name: item.name,
            percent: item.percent,
            vestingSchedule: '', // Not provided by API
            cliff: '' // Not provided by API
          })))
        }
      } catch (allocationError) {
       
      }

      const result = {
        url,
        fundraising,
        fundingRounds,
        tokenomics,
        allocations,
        tgeInfo,
        extractedAt: new Date().toISOString()
      }
      
      console.log(`Successfully extracted finance data for ${coinKey}:`, {
        totalRaised: result.fundraising.totalRaised,
        investorsCount: result.fundraising.notableInvestors.length,
        roundsCount: result.fundingRounds.length,
        allocationsCount: result.allocations.length
      })
      
      return result
    } catch (e: any) {
      console.log(`Error extracting finance data for ${coinKey}:`, e.message)
      return null
    }
  }

}