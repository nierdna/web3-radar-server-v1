import { CryptoRankProject } from '../../lib/schemas/schemas'
import { CRYPTORANK_DETAIL_URL } from '../../lib/config/url'
import { axiosClient } from '../../lib/config/axios'

export class BasicInfoExtractor {
  
  static async extractByKey(coinKey: string): Promise<CryptoRankProject | null> {
    try {
      console.log(` Fetching basic info for: ${coinKey}`)
      const res = await axiosClient.get(`${CRYPTORANK_DETAIL_URL}/${coinKey}`)
      const payload = res.data
      
      console.log(`Response for ${coinKey}:`, {
        hasData: !!payload?.data,
        status: res.status,
        dataKeys: payload ? Object.keys(payload) : [],
        fullResponse: JSON.stringify(payload, null, 2).substring(0, 500) + '...'
      })
      
      if (!payload || !payload.data) {
        console.log(`No data found for ${coinKey}`)
        return null
      }

      const coin = payload.data
      const stripHtml = (html?: string) => {
        if (!html || typeof html !== 'string') return ''
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      }
      const linkVal = (type: string) => {
        const found = Array.isArray(coin.links) ? coin.links.find((l: any) => (l?.type || '').toLowerCase() === type) : undefined
        return (found && typeof found.value === 'string') ? found.value : ''
      }
          const socials = {
        twitter: linkVal('twitter'),
        telegram: linkVal('telegram'),
        discord: linkVal('discord'),
        medium: linkVal('medium'),
        github: linkVal('github')
      }
      const website = linkVal('web') || linkVal('website')
      const category = coin.category || ''
      
      // Debug token contract extraction
      console.log(`Token contract debug for ${coinKey}:`, {
        hasTokens: Array.isArray(coin.tokens),
        tokensLength: Array.isArray(coin.tokens) ? coin.tokens.length : 0,
        firstToken: Array.isArray(coin.tokens) && coin.tokens[0] ? coin.tokens[0] : null,
        hasEcosystems: Array.isArray(coin.ecosystems),
        ecosystemsLength: Array.isArray(coin.ecosystems) ? coin.ecosystems.length : 0
      })
      
      const chain = Array.isArray(coin.tokens) && coin.tokens[0]?.platformName ? coin.tokens[0].platformName : (Array.isArray(coin.ecosystems) && coin.ecosystems[0]?.name ? coin.ecosystems[0].name : '')
      const tokenContract = Array.isArray(coin.tokens) && coin.tokens[0]?.address ? coin.tokens[0].address : ''
      
      console.log(` Extracted contract info for ${coinKey}:`, {
        chain: chain || 'Not found',
        tokenContract: tokenContract || 'Not found',
        platformName: Array.isArray(coin.tokens) && coin.tokens[0]?.platformName ? coin.tokens[0].platformName : 'Not found',
        address: Array.isArray(coin.tokens) && coin.tokens[0]?.address ? coin.tokens[0].address : 'Not found'
      })
      
      const description = stripHtml(coin.description || coin.shortDescription)
      const status = (coin.icoStatus || '').toString().toLowerCase()

      const project: CryptoRankProject = {
        name: coin.name || '',
        symbol: coin.symbol || '',
        detailUrl: `https://cryptorank.io/price/${coinKey}`,
        description,
        website,
        category,
        chain,
        status,
        socials,
        tokenContract,
      } as any
      
      console.log(`Successfully extracted basic info for ${coinKey}:`, {
        name: project.name,
        symbol: project.symbol,
        category: project.category
      })
      
      return project
    } catch (error: any) {
      console.log(`Error extracting basic info for ${coinKey}:`, error.message)
      return null
    }
  }
}