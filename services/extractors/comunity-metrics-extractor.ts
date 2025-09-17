import { Page } from 'puppeteer'
import { CrawlerUtils } from '../utils/crawler-utils'

export interface CommunityMetrics {
  twitterFollowers?: number
  discordMembers?: number
  telegramMembers?: number
  githubStars?: number
  mediumFollowers?: number
}

export class CommunityMetricsExtractor {
  
  static async extractCommunityMetrics(
    page: Page, 
    socials: {
      twitter?: string
      discord?: string
      telegram?: string
      github?: string
      medium?: string
    }
  ): Promise<CommunityMetrics> {
    const metrics: CommunityMetrics = {}

    try {
     
      if (socials.twitter) {
        metrics.twitterFollowers = await this.extractTwitterFollowers(page, socials.twitter)
      }

     
      if (socials.discord) {
        metrics.discordMembers = await this.extractDiscordMembers(page, socials.discord)
      }

     
      if (socials.telegram) {
        metrics.telegramMembers = await this.extractTelegramMembers(page, socials.telegram)
      }


      if (socials.github) {
        metrics.githubStars = await this.extractGithubStars(page, socials.github)
      }

      if (socials.medium) {
        metrics.mediumFollowers = await this.extractMediumFollowers(page, socials.medium)
      }

      return metrics
    } catch (error) {
      
      return metrics
    }
  }

  private static async extractTwitterFollowers(page: Page, twitterUrl: string): Promise<number | undefined> {
    try {
     
      await CrawlerUtils.navigateWithRetry(page, twitterUrl)
      await CrawlerUtils.randomDelay(5000, 8000)

      const followers = await page.evaluate(() => {

        
        const allLinks = document.querySelectorAll('a[href*="followers"]')
        
        for (let i = 0; i < allLinks.length; i++) {
          const link = allLinks[i]
          const text = link.textContent?.trim()
          const href = link.getAttribute('href')
          if (text && text.match(/\d/)) {
            const match = text.match(/([\d,]+\.?\d*)([KMB]?)/i)
            if (match) {
              let num = parseFloat(match[1].replace(/,/g, ''))
              const suffix = match[2].toUpperCase()
              
              if (suffix === 'K') num *= 1000
              else if (suffix === 'M') num *= 1000000
              else if (suffix === 'B') num *= 1000000000
              if (num > 0 && num < 1000000000) {
                return Math.floor(num)
              }
            }
          }
        }
        const selectors = [
          'a[href*="followers"] span span',
          'a[href*="verified_followers"] span span', 
          'a[href*="followers"] span',
          'a[href*="verified_followers"] span',
          '[data-testid="followerCount"]',
          '[aria-label*="followers"]',
          'div[data-testid="UserProfileHeader_Items"] a[href*="followers"] span',
          'span[class*="css-1jxf684"]',
          'a[href*="followers"] span[class*="css-1jxf684"]'
        ]

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector)
          for (const element of elements) {
            const text = element.textContent?.trim()
            if (text && text.match(/\d/)) {
              const match = text.match(/([\d,]+\.?\d*)([KMB]?)/i)
              if (match) {
                let num = parseFloat(match[1].replace(/,/g, ''))
                const suffix = match[2].toUpperCase()
                
                if (suffix === 'K') num *= 1000
                else if (suffix === 'M') num *= 1000000
                else if (suffix === 'B') num *= 1000000000
                
               
                
                if (num > 0 && num < 1000000000) {
                  return Math.floor(num)
                }
              }
            }
          }
        }
        
       
        return null
      })

     
      return followers || 0
    } catch (error) {
     
      return 0
    }
  }

  private static async extractDiscordMembers(page: Page, discordUrl: string): Promise<number | undefined> {
    try {
      try {
        await CrawlerUtils.navigateWithRetry(page, discordUrl)
        await CrawlerUtils.randomDelay(5000, 8000)
        const title = await page.title()
        console.log(`Discord page title: ${title}`)
        
        // Check if we're blocked or need login
        if (title.includes('Login') || title.includes('Verify') || title.includes('Blocked') || 
            title === 'Discord' || title.includes('Join') || title.includes('Invite')) {
          console.log('Discord requires login or invite - returning 0')
          return 0
        }
        
        // Check if page loaded properly
        const bodyText = await page.evaluate(() => document.body.textContent)
        if (!bodyText || bodyText.length < 100) {
       
          return 0
        }
        
      } catch (navError) {
        
        return 0
      }

      const members = await page.evaluate(() => {
        // First, try to find all elements that contain "members" text
        const allElements = document.querySelectorAll('*')
        const memberElements = []
        
        for (const element of allElements) {
          const text = element.textContent?.trim()
          if (text && text.toLowerCase().includes('members') && text.match(/\d/)) {
            memberElements.push({ element, text })
          }
        }
        
        console.log(`Found ${memberElements.length} elements containing "members"`)
        
        // Process member elements first (highest priority)
        for (const { text } of memberElements) {
          console.log(`Processing member text: "${text}"`)
          
          // Look for exact "members" patterns
          const memberPatterns = [
            /([\d.,]+)\s*(members)/i,
            /([\d.,]+)\s*(member)/i,
            /([\d.,]+)\s*(members,)/i
          ]
          
          for (const pattern of memberPatterns) {
            const match = text.match(pattern)
            if (match) {
              const numStr = match[1].replace(/\./g, '').replace(/,/g, '')
              const num = parseFloat(numStr)
              if (num > 0 && num < 10000000) {
                console.log(`Found Discord members via member pattern: ${num}`)
                return Math.floor(num)
              }
            }
          }
        }
        
        // If no members found, try general selectors but prioritize larger numbers
        const selectors = [
          'span[class*="text-sm/normal"]',
          'span[data-text-variant*="text-sm"]',
          'div[class*="pill"] span',
          'div[class*="activityCount"] span',
          'span[class*="text-sm"]',
          'span[class*="normal"]', 
          'span[class*="text-"]',
          '[class*="memberCount"]',
          '[class*="member-count"]',
          '[class*="members"]',
          'div[class*="member"] span',
          'span[class*="memberCount"]'
        ]

        let maxNumber = 0
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector)
          console.log(`Discord selector ${selector}: found ${elements.length} elements`)
          
          for (const element of elements) {
            const text = element.textContent?.trim()
            console.log(`Discord element text: "${text}"`)
            
            if (text && text.match(/\d/)) {
              // Look for any number pattern
              const match = text.match(/([\d,]+\.?\d*)([KMB]?)/i)
              if (match) {
                let num = parseFloat(match[1].replace(/,/g, ''))
                const suffix = match[2].toUpperCase()
                if (suffix === 'K') num *= 1000
                else if (suffix === 'M') num *= 1000000
                else if (suffix === 'B') num *= 1000000000
                if (num > 0 && num < 10000000 && num > maxNumber) {
                  maxNumber = num
                  console.log(`Found larger number: ${num}`)
                }
              }
            }
          }
        }
        
        if (maxNumber > 0) {
          console.log(`Returning largest number found: ${maxNumber}`)
          return Math.floor(maxNumber)
        }
        
        return null
      })
      return members || 0
    } catch (error) {

      return 0
    }
  }
  private static async extractTelegramMembers(page: Page, telegramUrl: string): Promise<number | undefined> {
    try {
      await CrawlerUtils.navigateWithRetry(page, telegramUrl)
      await CrawlerUtils.randomDelay(2000, 4000)
      const members = await page.evaluate(() => {
        const selectors = [
          '.tgme_page_extra',
          'div.tgme_page_extra',
          '[class*="tgme_page_extra"]',
          '[class*="member"]',
          '[class*="subscribers"]',
          'div[class*="tgme"] span',
          'span[class*="member"]'
        ]
        for (const selector of selectors) {
          const element = document.querySelector(selector)
          if (element) {
            const text = element.textContent?.trim()
            if (text) {
              const membersMatch = text.match(/([\d\s,]+)\s*members/i)
              if (membersMatch) {
                const numStr = membersMatch[1].replace(/\s/g, '').replace(/,/g, '')
                const num = parseFloat(numStr)
                if (num > 0) {
                  return Math.floor(num)
                }
              }
              const match = text.match(/([\d,]+\.?\d*)([KMB]?)/i)
              if (match) {
                let num = parseFloat(match[1].replace(/,/g, ''))
                const suffix = match[2].toUpperCase()
                if (suffix === 'K') num *= 1000
                else if (suffix === 'M') num *= 1000000
                else if (suffix === 'B') num *= 1000000000
                if (num > 0) {
                  return Math.floor(num)
                }
              }
            }
          }
        }
        return null
      })

      return members || 0
    } catch (error) {
      return 0
    }
  }
  private static async extractGithubStars(page: Page, githubUrl: string): Promise<number | undefined> {
    try {
      await CrawlerUtils.navigateWithRetry(page, githubUrl)
      await CrawlerUtils.randomDelay(3000, 5000)
      
      const title = await page.title()
      console.log(`GitHub page title: ${title}`)
      
      // Check if page exists and is accessible
      if (title.includes('404') || title.includes('Not Found') || title.includes('Private')) {
        console.log('GitHub repo not found or private - returning 0')
        return 0
      }
      
      const stars = await page.evaluate(() => {
        // Try multiple selectors for GitHub stars
        const selectors = [
          '[data-testid="stargazers"]',
          'a[href*="/stargazers"] span',
          '[aria-label*="stars"]',
          'div[class*="star"] span',
          'span[class*="star"]',
          'a[href*="/stargazers"]',
          '[class*="social-count"]',
          '[class*="Counter"]',
          'span[class*="Counter"]'
        ]
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector)
          
          
          for (const element of elements) {
            const text = element.textContent?.trim()
            
            
            if (text) {
              const match = text.match(/([\d,]+\.?\d*)([KMB]?)/i)
              if (match) {
                let num = parseFloat(match[1].replace(/,/g, ''))
                const suffix = match[2].toUpperCase()
                
                if (suffix === 'K') num *= 1000
                else if (suffix === 'M') num *= 1000000
                else if (suffix === 'B') num *= 1000000000
                
                if (num > 0) {
                  
                  return Math.floor(num)
                }
              }
            }
          }
        }
        
        
        const allElements = document.querySelectorAll('*')
        for (const element of allElements) {
          const text = element.textContent?.trim()
          if (text && text.match(/\d+\s*star/i)) {
            const match = text.match(/([\d,]+\.?\d*)([KMB]?)\s*star/i)
            if (match) {
              let num = parseFloat(match[1].replace(/,/g, ''))
              const suffix = match[2].toUpperCase()
              if (suffix === 'K') num *= 1000
              else if (suffix === 'M') num *= 1000000
              else if (suffix === 'B') num *= 1000000000
              if (num > 0) {
                  
                return Math.floor(num)
              }
            }
          }
        }
        
        return null
      })
      
      return stars || 0
    } catch (error) {
      
      return 0
    }
  }
  private static async extractMediumFollowers(page: Page, mediumUrl: string): Promise<number | undefined> {
    try {
      await CrawlerUtils.navigateWithRetry(page, mediumUrl)
      await CrawlerUtils.randomDelay(3000, 5000)
      
      const followers = await page.evaluate(() => {
        // Target the specific class from the image: pw-follower-count
        const selectors = [
          'span.pw-follower-count a', // Main selector from the image
          'span.pw-follower-count',   // Fallback to span itself
          'a[href*="followers"]',     // Any link containing followers
          '[class*="follower-count"]', // Any element with follower-count in class
          'a[href*="followers"] span', // Link with followers href containing span
          'span[class*="follower"]'    // Any span with follower in class
        ]

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector)
          for (const element of elements) {
            const text = element.textContent?.trim()
            if (text && text.includes('followers')) {
              // Extract number from text like "89 followers"
              const match = text.match(/([\d,]+\.?\d*)\s*followers/i)
              if (match) {
                const num = parseFloat(match[1].replace(/,/g, ''))
                if (num > 0 && num < 10000000) {
                  return Math.floor(num)
                }
              }
            }
          }
        }

      
        const allElements = document.querySelectorAll('*')
        for (const element of allElements) {
          const text = element.textContent?.trim()
          if (text && text.match(/\d+\s*followers/i)) {
            const match = text.match(/([\d,]+\.?\d*)\s*followers/i)
            if (match) {
              const num = parseFloat(match[1].replace(/,/g, ''))
              if (num > 0 && num < 10000000) {
                return Math.floor(num)
              }
            }
          }
        }

        return null
      })

      return followers || 0
    } catch (error) {
      
      return 0
    }
  }

  static async extractFromSinglePlatform(
    page: Page, 
    platform: 'twitter' | 'discord' | 'telegram' | 'github' | 'medium',
    url: string
  ): Promise<number | undefined> {
    switch (platform) {
      case 'twitter':
        return await this.extractTwitterFollowers(page, url)
      case 'discord':
        return await this.extractDiscordMembers(page, url)
      case 'telegram':
        return await this.extractTelegramMembers(page, url)
      case 'github':
        return await this.extractGithubStars(page, url)
      case 'medium':
        return await this.extractMediumFollowers(page, url)
      default:
        return undefined
    }
  }

  static async extractByKey(coinKey: string): Promise<CommunityMetrics | null> {
    try {
      console.log(`Extracting community metrics for: ${coinKey}`)
      
      // First get basic info to get socials
      const { BasicInfoExtractor } = await import('./basic-info-extractor')
      const basicInfo = await BasicInfoExtractor.extractByKey(coinKey)
      
      if (!basicInfo || !basicInfo.socials) {
        console.log(`No socials data found for ${coinKey}`)
        return null
      }

      // Extract community metrics using Puppeteer
      const puppeteer = await import('puppeteer')
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      const page = await browser.newPage()
      
      try {
        const { CrawlerUtils } = await import('../utils/crawler-utils')
        await CrawlerUtils.setupPage(page)
        
        const metrics = await this.extractCommunityMetrics(page, basicInfo.socials)
        console.log(` Successfully extracted community metrics for ${coinKey}:`, metrics)
        return metrics
      } finally {
        await page.close()
        await browser.close()
      }
    } catch (error: any) {
      console.log(` Error extracting community metrics for ${coinKey}:`, error.message)
      return null
    }
  }
}