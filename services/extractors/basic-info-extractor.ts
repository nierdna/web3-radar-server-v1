import { Page } from 'puppeteer'
import { CryptoRankProject } from '../schemas'

export class BasicInfoExtractor {
  static async extractBasicInfo(page: Page, url: string): Promise<CryptoRankProject | null> {
    try {

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
        await this.randomDelay(3000, 5000)
        await page.goto(detailUrl, { 
          waitUntil: 'networkidle0',
          timeout: 45000 
        })
      })
      await this.randomDelay(1000, 3000)
      const projectData = await page.evaluate((currentUrl) => {
        const extractBasicInfo = () => {
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
          const descSelectors = [
            '#coin-description-block',
            '#coin-description-block p',
            '#coin-description-block div',
            '[data-testid="project-description"]',
            '[data-testid="description"]',
            '[data-testid="overview"]',
            'h2 + p',
            'h3 + p', 
            'h4 + p', 
            'h2:contains("What is") + p',
            'h3:contains("What is") + p',
            'h4:contains("What is") + p',
            'meta[name="description"]',
           
            '.project-description',
            '.description',
            '[class*="description"]',
            '[class*="overview"]',
            '[class*="summary"]',
            '[class*="about"]',
            '[class*="intro"]'
          ]
          
          let description = ''
          
          const coinDescBlock = document.querySelector('#coin-description-block')
          if (coinDescBlock) {
        
            const textContent = coinDescBlock.textContent?.trim() || ''
            if (textContent.length > 100 && 
                !textContent.includes('Loading') && 
                !textContent.includes('Error') &&
                !textContent.includes('CryptoRank') &&
                !textContent.includes('Price') &&
                !textContent.includes('Market') &&
                !textContent.includes('Volume') &&
                !textContent.includes('24h') &&
                !textContent.includes('Change') &&
                !textContent.match(/^\d+[.,]\d+/) &&
                textContent.split(' ').length > 10) {
              description = textContent
            } else {
            
              const paragraphs = coinDescBlock.querySelectorAll('p, div')
              for (const p of paragraphs) {
                const text = p.textContent?.trim() || ''
                if (text.length > 100 && 
                    !text.includes('Loading') && 
                    !text.includes('Error') &&
                    !text.includes('CryptoRank') &&
                    !text.includes('Price') &&
                    !text.includes('Market') &&
                    !text.includes('Volume') &&
                    !text.includes('24h') &&
                    !text.includes('Change') &&
                    !text.match(/^\d+[.,]\d+/) &&
                    text.split(' ').length > 10) {
                  description = text
                  break
                }
              }
            }
          }
          
    
          if (!description) {
            for (const selector of descSelectors) {
              const element = document.querySelector(selector)
              if (element && element.textContent?.trim()) {
                const text = element.textContent.trim()
              
                if (text.length > 100 && 
                    !text.includes('Loading') && 
                    !text.includes('Error') &&
                    !text.includes('CryptoRank') &&
                    !text.includes('Price') &&
                    !text.includes('Market') &&
                    !text.includes('Volume') &&
                    !text.includes('24h') &&
                    !text.includes('Change') &&
                    !text.match(/^\d+[.,]\d+/) && 
                    text.split(' ').length > 10) { // At least 10 words
                  description = text
                  break
                }
              }
            }
          }
          
         
          if (!description) {
            const allTextElements = document.querySelectorAll('p, div, span, h2, h3, h4, h5, h6')
            let longestText = ''
            
            allTextElements.forEach(el => {
              const text = el.textContent?.trim() || ''
              if (text.length > longestText.length && 
                  text.length > 100 &&
                  text.length < 2000 && 
                  !text.includes('Loading') &&
                  !text.includes('Error') &&
                  !text.includes('CryptoRank') &&
                  !text.includes('Price') &&
                  !text.includes('Market') &&
                  !text.includes('Volume') &&
                  !text.includes('24h') &&
                  !text.includes('Change') &&
                  !text.match(/^\d+[.,]\d+/) &&
                  text.split(' ').length > 10) {
                longestText = text
              }
            })
            
            if (longestText) {
              description = longestText
            }
          }

          let website = ''
          
          const socialLinks = document.querySelectorAll('a[href]')
          for (const link of socialLinks) {
            const href = link.getAttribute('href')
            const text = link.textContent?.toLowerCase().trim() || ''
            
            if (!href) continue
            if ((text.includes('website') || text.includes('site')) && 
                href.includes('http') && 
                !href.includes('twitter') && 
                !href.includes('x.com') && 
                !href.includes('t.me') && 
                !href.includes('discord') && 
                !href.includes('medium') && 
                !href.includes('github') && 
                !href.includes('cryptorank')) {
              website = href
              break
            }
          }
          

          if (!website) {
            for (const link of socialLinks) {
              const href = link.getAttribute('href')
              const text = link.textContent?.toLowerCase().trim() || ''
              
              if (!href) continue
              
              if (href.includes('twitter') || 
                  href.includes('x.com') || 
                  href.includes('t.me') || 
                  href.includes('discord') || 
                  href.includes('medium') || 
                  href.includes('github') || 
                  href.includes('cryptorank') ||
                  href.includes('arbiscan') ||
                  href.includes('etherscan') ||
                  href.includes('bscscan') ||
                  href.includes('coingecko') ||
                  href.includes('coinmarketcap')) {
                continue
              }
              if (href.includes('http') && 
                  (href.includes('.io') || href.includes('.com') || href.includes('.org')) &&
                  text.length < 50) { 
                website = href
                break
              }
            }
          }
          let category = ''
          const categorySelector='a[href*="/categories/"]'
          let categoryLink = document.querySelector(categorySelector)
          if (categoryLink) {
            const href = categoryLink.getAttribute('href')
            if (href) {
             category = href.split('/').slice(-1)[0]
            } 
          }
          let chain = ''
          
          const contractDiv =document.querySelector('.contracts')
          if (contractDiv) {
            chain = contractDiv.querySelectorAll('p')[1]?.textContent?.trim()||''
          }
          
          // Extract status - robust selectors that won't break with class changes
          let status = ''
          const statusSelectors = [
            // Content-based selectors (most reliable)
            'button:contains("upcoming")', // jQuery-style contains
            'button:contains("live")',
            'button:contains("ended")',
            'button:contains("active")',
            'button:contains("inactive")',
            'button:contains("completed")',
            'button:contains("ongoing")',
            'button:contains("finished")',
            'button:contains("cancelled")',
            
            // Pattern-based selectors (more stable)
            'button[class*="badge"]', // Badge pattern
            'button[class*="tag"]', // Tag pattern
            'button[class*="label"]', // Label pattern
            'button[class*="status"]', // Status pattern
            'span[class*="badge"]', // Alternative badge
            'span[class*="tag"]', // Alternative tag
            'div[class*="badge"]', // Alternative badge
            'div[class*="tag"]', // Alternative tag
            
            // Generic selectors
            'button', 'span', 'div',
            
            // Data attributes (most stable)
            '[data-status]',
            '[data-testid*="status"]',
            '[aria-label*="status"]',
            
            // Text content selectors
            '*:contains("upcoming")',
            '*:contains("live")',
            '*:contains("ended")',
            '*:contains("active")',
            '*:contains("inactive")',
            '*:contains("completed")',
            '*:contains("ongoing")',
            '*:contains("finished")',
            '*:contains("cancelled")'
          ]
          
          // First try content-based approach (most reliable)
          const validStatuses = ['upcoming', 'live', 'ended', 'active', 'inactive', 'completed', 'ongoing', 'finished', 'cancelled']
          

          const allElements = document.querySelectorAll('*')
          for (const element of allElements) {
            const text = element.textContent?.trim().toLowerCase()
            if (text && validStatuses.includes(text)) {
              status = text
              break
            }
          }

          if (!status) {
            for (const selector of statusSelectors) {
              try {
                const statusEl = document.querySelector(selector)
                if (statusEl && statusEl.textContent?.trim()) {
                  const statusText = statusEl.textContent.trim().toLowerCase()
                  if (validStatuses.includes(statusText)) {
                    status = statusText
                    break
                  }
                }
              } catch (e) {
                // Skip invalid selectors
                continue
              }
            }
          }
          
          return { name, symbol, description, website, category, chain, status}
        }
        const extractSocialLinks = () => {
          const socials = {
            twitter: '',
            discord: '',
            telegram: '',
            medium: '',
            github: ''
          }
          const socialSelectors = {
            twitter: 'a[href*="twitter.com"], a[href*="x.com"]',
            telegram: 'a[href*="t.me"]',
            discord: 'a[href*="discord"]',
            medium: 'a[href*="medium.com"]',
            github: 'a[href*="github.com"]'
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
        const basicInfo = extractBasicInfo()
        const socials = extractSocialLinks()
        return {
          name: basicInfo.name,
          symbol: basicInfo.symbol,
          detailUrl: currentUrl,
          description: basicInfo.description,
          website: basicInfo.website,
          category: basicInfo.category,
          chain: basicInfo.chain,
          status: basicInfo.status,
          socials,
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