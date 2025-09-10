import { Page } from 'puppeteer'
import { CryptoRankProject } from '../schemas'

export class ProjectDetailExtractor {
  static async extractProjectDetail(page: Page, url: string): Promise<CryptoRankProject | null> {
    try {
      // Convert /ico/ to /price/ for better data access
      let detailUrl = url
      if (url.includes('/ico/')) {
        detailUrl = url.replace('/ico/', '/price/')
      }
      console.log(`Crawling project detail: ${detailUrl}`)
      
      await page.goto(detailUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      }).catch(async (error) => {
        console.warn(`Failed to load ${detailUrl}, retrying...`, error.message)
        // Retry once with different strategy
        await this.randomDelay(3000, 5000)
        await page.goto(detailUrl, { 
          waitUntil: 'networkidle0',
          timeout: 45000 
        })
      })

      // Random delay to avoid detection
      await this.randomDelay(1000, 3000)
      
      const projectData = await page.evaluate((currentUrl) => {
        // Helper function to extract basic info
        const extractBasicInfo = () => {
          // Extract project name
          const nameSelectors = [
            'h1', '[data-testid="project-name"]', '.project-name', '.project-title',
            '.ico-name', '.token-name', 'h1[class*="title"]', 'h1[class*="name"]',
            '.title', '.name', 'h1[class*="heading"]', '[class*="project"] h1',
            '[class*="ico"] h1', 'h1[class*="main"]'
          ]
          
          let name = ''
          for (const selector of nameSelectors) {
            const element = document.querySelector(selector)
            if (element && element.textContent?.trim()) {
              name = element.textContent.trim().split('\n')[0].trim()
              break
            }
          }
          
          if (!name) {
            const allH1s = document.querySelectorAll('h1')
            for (const h1 of allH1s) {
              const text = h1.textContent?.trim()
              if (text && text.length > 0 && text.length < 100) {
                name = text.split('\n')[0].trim()
                break
              }
            }
          }

          // Extract token symbol
          const symbolSelectors = [
            '[data-testid="token-symbol"]', '.token-symbol', '.symbol',
            '[class*="symbol"]', '[class*="token"]', 'span[class*="badge"]',
            'div[class*="badge"]', 'span[class*="tag"]'
          ]
          
          let symbol = ''
          for (const selector of symbolSelectors) {
            const element = document.querySelector(selector)
            if (element && element.textContent?.trim()) {
              const text = element.textContent.trim()
              if (text.length <= 10 && /^[A-Za-z0-9]+$/.test(text)) {
                symbol = text
                break
              }
            }
          }

          // Extract description
          const descSelectors = [
            '[data-testid="project-description"]', '.project-description', '.description',
            '[class*="description"]', '[class*="overview"]', '[class*="summary"]',
            '.content p', '.main-content p', '[class*="content"] p',
            'p[class*="text"]', '.text-content', '[class*="text-content"]'
          ]
          
          let description = ''
          for (const selector of descSelectors) {
            const element = document.querySelector(selector)
            if (element && element.textContent?.trim()) {
              const text = element.textContent.trim()
              if (text.length > 50 && !text.includes('Loading') && !text.includes('Error')) {
                description = text
                break
              }
            }
          }

          // Extract website
          let website = ''
          const websiteSelectors = [
            'a[href*="http"]:not([href*="cryptorank.io"]):not([href*="twitter"]):not([href*="t.me"]):not([href*="discord"]):not([href*="medium"]):not([href*="github"]):not([href*="farcaster"]):not([href*="gitbook"])',
            'a[href*="www"]:not([href*="cryptorank.io"])'
          ]
          
          websiteSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector)
            elements.forEach(el => {
              const href = el.getAttribute('href')
              if (href && !website) {
                if (href.includes('http') && !href.includes('twitter') && !href.includes('t.me') && 
                    !href.includes('discord') && !href.includes('medium') && !href.includes('github') &&
                    !href.includes('farcaster') && !href.includes('gitbook') && !href.includes('cryptorank')) {
                  website = href
                }
              }
            })
          })

          return { name, symbol, description, website }
        }

        // Helper function to extract social links
        const extractSocialLinks = () => {
          const socials = {
            twitter: '',
            discord: '',
            telegram: '',
            medium: '',
            github: '',
            website: '',
            farcaster: '',
            gitbook: ''
          }

          const socialSelectors = {
            twitter: 'a[href*="twitter.com"], a[href*="x.com"]',
            telegram: 'a[href*="t.me"]',
            discord: 'a[href*="discord"]',
            medium: 'a[href*="medium.com"]',
            github: 'a[href*="github.com"]',
            farcaster: 'a[href*="farcaster"]',
            gitbook: 'a[href*="gitbook"]'
          }

          Object.entries(socialSelectors).forEach(([platform, selector]) => {
            const element = document.querySelector(selector)
            if (element) {
              const href = element.getAttribute('href')
              if (href) {
                (socials as any)[platform] = href
              }
            }
          })

          return socials
        }

        // Helper function to extract community metrics
        const extractCommunityMetrics = () => {
          return {
            twitterFollowers: 0,
            discordMembers: 0,
            telegramMembers: 0,
            githubStars: 0
          }
        }

        // Helper function to extract tokenomics
        const extractTokenomics = (symbol: string) => {
          return {
            totalSupply: undefined,
            circulatingSupply: undefined,
            marketCap: undefined,
            fullyDilutedValuation: undefined,
            tokenPrice: undefined,
            priceChange24h: undefined,
            volume24h: undefined
          }
        }

        // Helper function to extract TGE info
        const extractTGEInfo = () => {
          return {
            tgeDate: undefined,
            tgeExchange: undefined,
            initialMarketcap: undefined,
            listingPrice: undefined,
            marketCap: undefined
          }
        }

        // Helper function to extract fundraising
        const extractFundraising = () => {
          return {
            totalRaised: undefined,
            notableInvestors: undefined,
            fundingRounds: undefined
          }
        }

        // Helper function to extract team info
        const extractTeamInfo = () => {
          return []
        }

        // Helper function to extract audit info
        const extractAuditInfo = () => {
          return {
            auditor: '',
            reportLink: '',
            auditDate: ''
          }
        }

        // Helper function to extract roadmap
        const extractRoadmap = () => {
          return []
        }

        // Helper function to extract pre-market pricing
        const extractPreMarketPricing = () => {
          return []
        }

        // Execute extractions
        const basicInfo = extractBasicInfo()
        const socials = extractSocialLinks()
        const communityMetrics = extractCommunityMetrics()
        const tokenomics = extractTokenomics(basicInfo.symbol)
        const tgeInfo = extractTGEInfo()
        const fundraising = extractFundraising()
        const team = extractTeamInfo()
        const audit = extractAuditInfo()
        const roadmap = extractRoadmap()
        const preMarketPricing = extractPreMarketPricing()

        return {
          name: basicInfo.name,
          symbol: basicInfo.symbol,
          detailUrl: currentUrl,
          description: basicInfo.description,
          website: basicInfo.website,
          socials,
          communityMetrics,
          tokenomics,
          fundraising,
          tgeInfo,
          team,
          audit,
          roadmap,
          preMarketPricing
        }
      }, url)

      return projectData
    } catch (error) {
      console.error(`Error crawling project ${url}:`, error)
      return null
    }
  }

  private static async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}