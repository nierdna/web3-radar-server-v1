import { Page } from 'puppeteer'
import { CrawlerUtils } from '../utils/crawler-utils'

export interface TeamMember {
  name: string
  role: string
  linkedin?: string
  anonymous: boolean 
  projectId?: string 
}

export class TeamExtractor {
  static async extractTeamInfo(page: Page, baseUrl: string): Promise<TeamMember[]> {
    try {
      const teamUrl = CrawlerUtils.getTeamUrl(baseUrl)
      console.log(`Crawling team info: ${teamUrl}`)
      
      await CrawlerUtils.navigateWithRetry(page, teamUrl)
      await CrawlerUtils.randomDelay(1000, 2000)
      
      // Check if page is 404 or error page
      const isErrorPage = await page.evaluate(() => {
        const title = document.title.toLowerCase()
        const has404Title = title.includes('not found') && !title.includes('team')
        const has404InTitle = title.includes('404')
        
        const teamSection = document.querySelector('section:has(h1, h2, h3)') ||
                           document.querySelector('main') ||
                           document.body
        
        const teamSectionText = teamSection.textContent?.toLowerCase() || ''
        const has404Content = teamSectionText.includes('the requested page was not found') ||
                             teamSectionText.includes('page not found') ||
                             teamSectionText.includes('404 error')
        
        const hasTeamMembers = document.querySelector('div:has(img):has(p)') !== null ||
                              document.querySelector('div:has(img):has(button)') !== null ||
                              document.querySelector('section > div:has(img)') !== null
        
        return (has404Title || has404InTitle || has404Content) && !hasTeamMembers
      })
      
      if (isErrorPage) {
        console.log(`Team page not found for ${baseUrl} - returning empty team`)
        return []
      }
      
      const teamData = await page.evaluate(() => {
          const team: TeamMember[] = []
          
        // Look for team member containers
          const teamSelectors = [
          'section > div:has(img)',
          'div:has(img[alt]):has(p)',
          'div:has(img):has(button)',
          'div:has(img):has(a[href*="linkedin"])',
          'div:has(img)'
          ]
          
          let teamContainers: Element[] = []
          
          for (const selector of teamSelectors) {
            const elements = document.querySelectorAll(selector)
            if (elements.length > 0) {
              teamContainers = Array.from(elements)
              break
            }
          }
          
        // Filter out navigation elements
        teamContainers = teamContainers.filter(container => {
          const text = container.textContent || ''
          const navigationKeywords = [
            'Upgrade', 'Log in', 'Search', 'Market Cap', '24h Spot Volume', 'Dominance',
            'Currencies', 'Fundraising', 'Exchanges', 'IDO/ICO', 'Token Unlocks', 'Products',
            'Research', 'Rewards', 'Maps', 'Download on the', 'App Store', 'Google Play',
            'Follow Us', 'Contact us', 'We are Hiring', 'Affiliate Program', 'For Partnership',
            'Leave Feedback', 'Report Issue', 'Market Data API', 'Accept cookies',
            'Top 100 Coins', 'Trending Cryptos', 'Performance', 'Recently Listed', 'Gainers',
            'All Categories', 'All Time High', 'Blockchains', 'Global Market Data',
            'Ecosystems', 'Funding Rounds', 'Funds', 'Analytics Dashboard', 'IDO Launchpad ROI',
            'Launchpads', 'CEX Launchpad ROI', 'Launchpool', 'Node Sale', 'CEX',
            'CEX Transparency', 'DEX', 'Exchange Tokens', 'ETH Bridge', 'Analytics',
            'VC Pressure', 'Drop Hunting', 'Alerts', 'Converter', 'Widgets',
            'Futures and Options', 'Watchlist', 'Portfolio', 'Popular',
            'The requested page was not found', 'Easily manage your assets',
            'Country flag', 'Cryptorank', 'English', 'USD', 'GET IT ON',
            'Browse popular', 'Browse latest', 'Read latest', 'Back to CryptoRank',
            'Main', 'Overview', 'Fundraising', 'Team', 'Open report modal',
            'Report issue', 'Watchlists', 'DeFi', 'GameFi', 'Infra', 'Others'
          ]
          
          const containsNavigation = navigationKeywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
          )
          
          if (containsNavigation) return false
          
          const hasImage = container.querySelector('img') !== null
          const hasLinkedIn = container.querySelector('a[href*="linkedin"]') !== null
          const hasButton = container.querySelector('button') !== null
          const isInHeader = container.closest('header') !== null
          const isInFooter = container.closest('footer') !== null
          const isInNav = container.closest('nav') !== null
          
          return (hasImage || hasLinkedIn || hasButton) && 
                 !isInHeader && !isInFooter && !isInNav &&
                 text.length >= 5 && text.length <= 1000
        })
        
        // Check if all team members are in a single container (like Lendr.fi)
        const isSingleContainer = teamContainers.length === 1 && 
                                 teamContainers[0].textContent && 
                                 teamContainers[0].textContent.length > 100
        
        if (isSingleContainer) {
          const teamImages = teamContainers[0].querySelectorAll('img[alt]')
          
          teamImages.forEach((img) => {
            const altText = img.getAttribute('alt')?.trim() || ''
            
            // Filter out navigation and invalid team member names
            const invalidKeywords = [
              'cryptorank', 'currencies_', 'global_market', 'recently_listed', 'all_categories',
              'blockchains', 'funding_rounds', 'funds', 'dashboard', 'ido_ico', 'launchpads',
              'launchpools', 'node_sale', 'platform_roi', 'analytics', 'exchanges_', 'eth_bridge',
              'token_unlock', 'news', 'heatmaps', 'alerts', 'widgets', 'futures_and_options',
              'earn', 'drophunting', 'converter', 'get_api', 'affiliate_program', 'country flag',
              'open report modal', 'the first ai dex', 'join presale', 'section', 'lendr.fi'
            ]
            
            const isInvalidName = invalidKeywords.some(keyword => 
              altText.toLowerCase().includes(keyword.toLowerCase())
            )
            
            // Additional validation: must look like a person's name
            const isPersonName = /^[A-Z][a-zA-Z\s]+$/.test(altText) && 
                                altText.split(' ').length <= 4 &&
                                !altText.includes('_') &&
                                !altText.includes('section') &&
                                !altText.includes('flag') &&
                                !altText.includes('modal') &&
                                !altText.includes('dex') &&
                                !altText.includes('presale')
            
            if (altText && altText.length >= 3 && altText.length <= 50 && !isInvalidName && isPersonName) {
              const parentDiv = img.closest('div')
   
              let roles: string[] = []
              const roleKeywords = ['Founder', 'CEO', 'CTO', 'CMO', 'COO', 'Advisor', 'Manager', 'Director']
              
             
              if (parentDiv) {
                // Tìm sibling div chứa thông tin (cùng cấp với parentDiv)
                const siblingDiv = parentDiv.nextElementSibling
                if (siblingDiv && siblingDiv.tagName === 'DIV') {
                  // Tìm thẻ p chứa tên trong sibling div
                  const namePTag = siblingDiv.querySelector('p')
                  if (namePTag) {
                    // Tìm thẻ div chứa roles (cùng cấp với p)
                    const rolesDiv = namePTag.nextElementSibling
                    if (rolesDiv && rolesDiv.tagName === 'DIV') {
                      // Select role buttons trong div đó
                      const roleButtons = rolesDiv.querySelectorAll('button')
                      roles = Array.from(roleButtons).map(btn => btn.textContent?.trim()).filter(Boolean)
                    }
                  }
                }
              }

            roles = [...new Set(roles)].filter(role => role && role.trim().length > 0)
            let linkedin = ''
            
            // Helper function to check if LinkedIn URL matches the person's name
            const isLinkedinMatch = (url: string, name: string) => {
              if (!url || !name) return false
              
              // Extract name parts (first name, last name)
              const nameParts = name.toLowerCase().split(' ').filter(part => part.length > 0)
              if (nameParts.length < 2) return false
              
              const firstName = nameParts[0]
              const lastName = nameParts[nameParts.length - 1]
              
              // Check if URL contains both first and last name
              const urlLower = url.toLowerCase()
              return urlLower.includes(firstName) && urlLower.includes(lastName)
            }
            
            // Method 1: Tìm LinkedIn trong parent elements của image
            let currentElement = img
            while (currentElement && !linkedin) {
              const linkedinEl = currentElement.querySelector('a[href*="linkedin"]')
              if (linkedinEl?.getAttribute('href')) {
                const linkHref = linkedinEl.getAttribute('href') || ''
                if (isLinkedinMatch(linkHref, altText)) {
                  linkedin = linkHref
                  break
                }
              }
              currentElement = currentElement.parentElement
            }
            
            // Method 2: Nếu không tìm thấy, dùng proximity-based search với name matching
            if (!linkedin) {
              const containerText = teamContainers[0].textContent || ''
              const nameIndex = containerText.indexOf(altText)
              if (nameIndex !== -1) {
                const allLinkedinLinks = teamContainers[0].querySelectorAll('a[href*="linkedin"]')
                
                // Tìm LinkedIn link gần nhất và match với tên
                let closestLinkedin = ''
                let minDistance = Infinity
                
                for (const link of allLinkedinLinks) {
                  const linkHref = link.getAttribute('href') || ''
                  const linkIndex = containerText.indexOf(linkHref)
                  
                  if (linkIndex !== -1) {
                    const distance = Math.abs(linkIndex - nameIndex)
                    
                    // Ưu tiên link gần tên và match với tên
                    if (distance < 500 && isLinkedinMatch(linkHref, altText)) {
                      if (distance < minDistance) {
                        closestLinkedin = linkHref
                        minDistance = distance
                      }
                    }
                  }
                }
                
                linkedin = closestLinkedin
              }
            }
          
              team.push({
                name: altText,
                role: roles.length > 0 ? roles.join(', ') : 'Team Member',
                linkedin: linkedin,
                anonymous: false,
              })
            }
          })
          
          return team
        }
        teamContainers.forEach((container) => {
          try {
            const imgEl = container.querySelector('img[alt]')
              let name = ''
            if (imgEl?.getAttribute('alt')) {
              const altText = imgEl.getAttribute('alt')?.trim() || ''
              if (altText && altText.length >= 3 && altText.length <= 50) {
                name = altText
              }
            }
            
            if (!name) {
              const nameSelectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'strong', 'b']
              
              for (const selector of nameSelectors) {
                const nameEl = container.querySelector(selector)
                if (nameEl && nameEl.textContent?.trim()) {
                  const text = nameEl.textContent.trim()
                  const isLikelyName = text.length >= 3 && 
                                      text.length <= 50 && 
                                      /^[A-Z][a-zA-Z\s]+$/.test(text) && 
                                      text.split(' ').length <= 4 &&
                      !text.toLowerCase().includes('team') &&
                      !text.toLowerCase().includes('member') &&
                      !text.toLowerCase().includes('founder') &&
                      !text.toLowerCase().includes('ceo') &&
                      !text.toLowerCase().includes('cto') &&
                                      !text.toLowerCase().includes('cmo') &&
                                      !text.toLowerCase().includes('coo') &&
                                      !text.toLowerCase().includes('advisor') &&
                                      !text.toLowerCase().includes('manager') &&
                                      !text.toLowerCase().includes('director') &&
                      !text.match(/^\d+$/) &&
                      !text.includes('•') &&
                                      !text.includes('|') &&
                                      !text.includes('+') &&
                                      !text.includes('%') &&
                                      !text.includes('$')
                  
                  if (isLikelyName) {
                    name = text
                    break
                  }
                }
              }
              }
              
              
              const roleSelectors = [
                'button',
                'span',
                'div',
                'p',
                '[data-testid*="role"]',
                '[data-testid*="position"]',
                '[data-testid*="badge"]'
              ]
              
              const roles: string[] = []
              
              for (const selector of roleSelectors) {
                const roleElements = container.querySelectorAll(selector)
                roleElements.forEach(roleEl => {
                  if (roleEl && roleEl.textContent?.trim()) {
                    const text = roleEl.textContent.trim()
                  const isLikelyRole = (text.includes('CEO') || text.includes('CTO') || text.includes('COO') ||
                        text.includes('Founder') || text.includes('Advisor') || text.includes('CMO') ||
                        text.includes('Lead') || text.includes('Director') || text.includes('Manager') ||
                        text.includes('Developer') || text.includes('Engineer') || text.includes('Designer') ||
                      text.includes('President') || text.includes('VP') || text.includes('Head') ||
                      text.includes('Chief') || text.includes('Senior') || text.includes('Principal')) &&
                     text.length <= 30 &&
                     !text.includes('Upgrade') &&
                     !text.includes('Log in') &&
                     !text.includes('Search') &&
                     !text.includes('English') &&
                     !text.includes('Coins') &&
                     !text.includes('Fundraising') &&
                     !text.includes('Exchanges') &&
                     !text.includes('IDO/ICO') &&
                     !text.includes('Token Unlocks') &&
                     !text.includes('Products') &&
                     !text.includes('Research')
                  
                  if (isLikelyRole) {
                      roles.push(text)
                    }
                  }
                })
              }
              
            const role = roles.join(', ')
              
              
              // Helper function to check if LinkedIn URL matches the person's name
              const isLinkedinMatch = (url: string, name: string) => {
                if (!url || !name) return false
                
                // Extract name parts (first name, last name)
                const nameParts = name.toLowerCase().split(' ').filter(part => part.length > 0)
                if (nameParts.length < 2) return false
                
                const firstName = nameParts[0]
                const lastName = nameParts[nameParts.length - 1]
                
                // Check if URL contains both first and last name
                const urlLower = url.toLowerCase()
                return urlLower.includes(firstName) && urlLower.includes(lastName)
              }
              
              const linkedinSelectors = [
              'a[href*="linkedin.com"]',
              'a[href*="linkedin.com/in/"]',
              'a[href*="www.linkedin.com"]'
              ]
              
              let linkedin = ''
              for (const selector of linkedinSelectors) {
                const linkedinEl = container.querySelector(selector)
                if (linkedinEl?.getAttribute('href')) {
                  const linkHref = linkedinEl.getAttribute('href') || ''
                  if (isLinkedinMatch(linkHref, name)) {
                    linkedin = linkHref
                  break
                }
              }
              }
              
              if (name && name.length > 2) {
                const cleanName = name.trim().replace(/\s+/g, ' ')
                const cleanRoles = roles
                  .filter(r => r && r.trim().length > 0)
                  .map(r => r.trim())
                .filter((r, index, arr) => arr.indexOf(r) === index)
                
                const cleanRole = cleanRoles.length > 0 ? cleanRoles.join(', ') : 'Team Member'
                const cleanLinkedin = linkedin && linkedin.includes('linkedin.com') ? linkedin : ''
                const isAnonymous = cleanName.toLowerCase().includes('anonymous') || 
                                  cleanName.toLowerCase().includes('tba') ||
                                  cleanName.toLowerCase().includes('to be announced') ||
                                  cleanName.toLowerCase().includes('coming soon')
                
              const invalidKeywords = [
                'english', 'coins', 'upgrade', 'log in', 'search', 'fundraising', 'exchanges',
                'ido/ico', 'token unlocks', 'products', 'research', 'the requested page was not found',
                'easily manage your assets', 'country flag', 'cryptorank', 'follow us', 'contact us',
                'we are hiring', 'affiliate program', 'for partnership', 'leave feedback', 'report issue',
                'market data api', 'accept cookies', 'top 100 coins', 'trending cryptos', 'performance',
                'recently listed', 'gainers', 'all categories', 'all time high', 'blockchains',
                'global market data', 'ecosystems', 'funding rounds', 'funds', 'analytics dashboard',
                'ido launchpad roi', 'launchpads', 'cex launchpad roi', 'launchpool', 'node sale',
                'cex', 'cex transparency', 'dex', 'exchange tokens', 'eth bridge', 'analytics',
                'vc pressure', 'drop hunting', 'alerts', 'converter', 'widgets', 'futures and options',
                'watchlist', 'portfolio', 'popular', 'browse popular', 'browse latest', 'read latest',
                'back to cryptorank', 'main', 'overview', 'team', 'open report modal', 'report issue',
                'watchlists', 'defi', 'gamefi', 'infra', 'others', 'get it on', 'download on the',
                'app store', 'google play', 'market cap', '24h spot volume', 'dominance', 'currencies',
                'rewards', 'maps', 'browse', 'read', 'back to', 'open', 'report', 'modal', 'issue',
                'eth gas', 'gwei', 'btc', 'eth', 'top 100', 'performance', 'gainers', 'all time high',
                'blockchains', 'global market', 'ecosystems', 'funding rounds', 'funds', 'analytics',
                'ido launchpad', 'launchpads', 'cex launchpad', 'launchpool', 'node sale', 'cex',
                'cex transparency', 'dex', 'exchange tokens', 'eth bridge', 'vc pressure', 'drop hunting',
                'alerts', 'converter', 'widgets', 'futures and options', 'watchlist', 'portfolio',
                'popular', 'browse popular', 'browse latest', 'read latest', 'back to', 'open report',
                'report issue', 'watchlists', 'defi', 'gamefi', 'infra', 'others', 'get it on',
                'download on the', 'app store', 'google play', 'market data', 'accept cookies',
                'the requested', 'easily manage', 'country flag', 'cryptorank', 'english', 'usd'
              ]
              
              const isValidTeamMember = cleanName.length >= 3 && 
                                      cleanName.length <= 50 &&
                                      /^[A-Z][a-zA-Z\s]+$/.test(cleanName) &&
                                      cleanName.split(' ').length <= 4 &&
                                      !invalidKeywords.some(keyword => 
                                        cleanName.toLowerCase().includes(keyword.toLowerCase())
                                      )
              
              if (isValidTeamMember) {
                team.push({
                  name: cleanName,
                  role: cleanRole,
                  linkedin: cleanLinkedin,
                  anonymous: isAnonymous
                })
              }
              }
            } catch (error) {
              console.warn('Error processing team member:', error)
            }
          })
          
          return team
      })
      
      console.log(`Extracted ${teamData.length} team members`)
      return teamData
      
    } catch (error) {
      console.error(`Error crawling team info for ${baseUrl}:`, error)
      return []
    }
  }
}
