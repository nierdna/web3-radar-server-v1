import { Page } from 'puppeteer'

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
      // Convert base URL to team URL
      const teamUrl = baseUrl.replace('/price/', '/team/').replace('/ico/', '/team/')
      console.log(`Crawling team info: ${teamUrl}`)
      
      await page.goto(teamUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      })
      
      await this.randomDelay(1000, 2000)
      
      const teamData = await page.evaluate(() => {
        const extractTeamMembers = (): TeamMember[] => {
          const team: TeamMember[] = []
          
          // Look for team member cards/containers - robust selectors that won't break
          const teamSelectors = [
            // Content-based approach (most reliable)
            // Look for divs that contain common team member patterns
            'div:has(img)', // Divs with images (likely profile pics)
            'div:has(a[href*="linkedin"])', // Divs with LinkedIn links
            'div:has(button)', // Divs with buttons (likely role badges)
            
            // Pattern-based selectors (more stable)
            '[class*="card"]',
            '[class*="member"]',
            '[class*="team"]',
            '[class*="person"]',
            '[class*="profile"]',
            
            // Common container patterns
            'div[class*="container"]',
            'div[class*="item"]',
            'div[class*="wrapper"]',
            
            // Framework patterns (more stable than specific classes)
            'div[class*="sc-"]', // Styled-components pattern
            'div[class*="styles_"]', // CSS modules pattern
            
            // Data attributes (most stable)
            '[data-testid*="team"]',
            '[data-testid*="member"]',
            '[data-testid*="card"]',
            
            // Semantic selectors
            'article',
            'section > div',
            'div[role="article"]',
            'div[role="listitem"]',
            
            // Generic fallbacks
            'div'
          ]
          
          let teamContainers: Element[] = []
          
          // Try different selectors to find team containers
          for (const selector of teamSelectors) {
            const elements = document.querySelectorAll(selector)
            if (elements.length > 0) {
              teamContainers = Array.from(elements)
              break
            }
          }
          
          // If no specific team containers found, look for grid items or cards
          if (teamContainers.length === 0) {
            const gridSelectors = [
              '[class*="grid"] > div',
              '[class*="card"]',
              '[class*="item"]',
              'div[class*="team"] > div',
              'section > div',
              'div[class*="sc-"]', // Styled-components fallback
              'div[class*="styles_"]' // CSS modules fallback
            ]
            
            for (const selector of gridSelectors) {
              const elements = document.querySelectorAll(selector)
              if (elements.length > 2) { // Likely team members if more than 2
                teamContainers = Array.from(elements)
                break
              }
            }
          }
          
          // Last resort: look for any div that might contain team info
          if (teamContainers.length === 0) {
            const allDivs = document.querySelectorAll('div')
            teamContainers = Array.from(allDivs).filter(div => {
              const text = div.textContent || ''
              const hasImage = div.querySelector('img') !== null
              const hasLinkedIn = div.querySelector('a[href*="linkedin"]') !== null
              const hasButton = div.querySelector('button') !== null
              const hasRoleKeywords = text.includes('CEO') || text.includes('CTO') || text.includes('Founder') ||
                                    text.includes('CMO') || text.includes('COO') || text.includes('Advisor') ||
                                    text.includes('Manager') || text.includes('Director')
              
              // Look for divs that contain common team member patterns
              return (hasImage && hasLinkedIn) || // Profile pic + LinkedIn
                     (hasImage && hasButton) || // Profile pic + role button
                     (hasLinkedIn && hasRoleKeywords) || // LinkedIn + role keywords
                     (hasImage && hasRoleKeywords) || // Profile pic + role keywords
                     (text.includes('linkedin.com') && text.length > 10 && text.length < 200) // LinkedIn link with reasonable text length
            })
          }
          
          teamContainers.forEach((container, index) => {
            try {
              // Extract name - based on actual HTML structure from DevTools
              const nameSelectors = [
                // Specific selectors from actual HTML
                'p.sc-d271dd04-0.j0JVcF', // Exact selector from HTML
                'p[class*="j0JVcF"]', // Partial match
                'p[class*="sc-d271dd04-0"]', // Partial match
                
                // Generic text elements
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'p', 'span', 'div',
                'strong', 'b',
                
                // Class patterns that are likely to contain names
                '[class*="name"]',
                '[class*="title"]',
                '[class*="heading"]',
                '[class*="label"]',
                
                // Styled-components patterns (more stable)
                'p[class*="sc-"]',
                'h1[class*="sc-"]',
                'h2[class*="sc-"]',
                'h3[class*="sc-"]',
                
                // CSS modules patterns
                '[class*="styles_"][class*="name"]',
                '[class*="styles_"][class*="title"]',
                
                // Data attributes
                '[data-testid*="name"]',
                '[data-testid*="title"]',
                
                // Semantic selectors
                'header h1', 'header h2', 'header h3',
                'header p', 'header span'
              ]
              
              let name = ''
              for (const selector of nameSelectors) {
                const nameEl = container.querySelector(selector)
                if (nameEl && nameEl.textContent?.trim()) {
                  const text = nameEl.textContent.trim()
                  // Filter out common non-name text
                  if (text.length > 2 && 
                      text.length < 50 && 
                      !text.toLowerCase().includes('team') &&
                      !text.toLowerCase().includes('member') &&
                      !text.toLowerCase().includes('founder') &&
                      !text.toLowerCase().includes('ceo') &&
                      !text.toLowerCase().includes('cto') &&
                      !text.match(/^\d+$/) &&
                      !text.includes('•') &&
                      !text.includes('|')) {
                    name = text
                    break
                  }
                }
              }
              
              // Extract role/position - based on actual HTML structure from DevTools
              const roleSelectors = [
                // Specific selectors from actual HTML
                'button.styles_badge_root_B2zXz.styles_styled_label_tag_8WN1o', // Exact selector from HTML
                'button[class*="styles_badge_root"]', // Partial match
                'button[class*="styles_styled_label_tag"]', // Partial match
                'button[class*="badge_root"]', // Partial match
                'button[class*="styled_label_tag"]', // Partial match
                
                // Button patterns (most common for roles)
                'button',
                'button[class*="badge"]',
                'button[class*="tag"]',
                'button[class*="label"]',
                'button[class*="role"]',
                'button[class*="position"]',
                
                // Generic elements that might contain roles
                'span[class*="badge"]',
                'span[class*="tag"]',
                'span[class*="label"]',
                'div[class*="badge"]',
                'div[class*="tag"]',
                'div[class*="label"]',
                
                // Class patterns
                '[class*="role"]',
                '[class*="position"]',
                '[class*="job"]',
                '[class*="title"]',
                '[class*="badge"]',
                '[class*="tag"]',
                
                // Styled-components patterns
                'button[class*="sc-"]',
                'span[class*="sc-"]',
                'div[class*="sc-"]',
                
                // CSS modules patterns
                '[class*="styles_"][class*="badge"]',
                '[class*="styles_"][class*="tag"]',
                '[class*="styles_"][class*="label"]',
                
                // Data attributes
                '[data-testid*="role"]',
                '[data-testid*="position"]',
                '[data-testid*="badge"]',
                
                // Fallback selectors
                'span', 'p', 'div'
              ]
              
              let role = ''
              const roles: string[] = []
              
              // Get all role buttons
              for (const selector of roleSelectors) {
                const roleElements = container.querySelectorAll(selector)
                roleElements.forEach(roleEl => {
                  if (roleEl && roleEl.textContent?.trim()) {
                    const text = roleEl.textContent.trim()
                    // Look for common role patterns
                    if (text.includes('CEO') || text.includes('CTO') || text.includes('COO') ||
                        text.includes('Founder') || text.includes('Advisor') || text.includes('CMO') ||
                        text.includes('Lead') || text.includes('Director') || text.includes('Manager') ||
                        text.includes('Developer') || text.includes('Engineer') || text.includes('Designer') ||
                        text.length < 20) { // Accept short text as potential role
                      roles.push(text)
                    }
                  }
                })
              }
              
              // Combine all roles
              role = roles.join(', ')
              
              // Extract LinkedIn link - based on actual HTML structure
              const linkedinSelectors = [
                'a[href*="linkedin.com"]', // Generic LinkedIn selector
                'a[href*="linkedin.com/in/"]', // More specific LinkedIn profile selector
                'a[href*="www.linkedin.com"]', // Full domain selector
                'a[href*="linkedin.com/in/nathajimetivier/"]' // Example from actual HTML
              ]
              
              let linkedin = ''
              for (const selector of linkedinSelectors) {
                const linkedinEl = container.querySelector(selector)
                if (linkedinEl?.getAttribute('href')) {
                  linkedin = linkedinEl.getAttribute('href') || ''
                  break
                }
              }
              
              // Extract avatar
              const avatarEl = container.querySelector('img')
              const avatar = avatarEl?.getAttribute('src') || ''
              
              // Validate and clean data before adding
              if (name && name.length > 2) {
                // Clean name - remove extra whitespace and special characters
                const cleanName = name.trim().replace(/\s+/g, ' ')
                
                // Clean role - remove empty roles and duplicates
                const cleanRoles = roles
                  .filter(r => r && r.trim().length > 0)
                  .map(r => r.trim())
                  .filter((r, index, arr) => arr.indexOf(r) === index) // Remove duplicates
                
                const cleanRole = cleanRoles.length > 0 ? cleanRoles.join(', ') : 'Team Member'
                
                // Validate LinkedIn URL
                const cleanLinkedin = linkedin && linkedin.includes('linkedin.com') ? linkedin : ''
                
                // Check if anonymous
                const isAnonymous = cleanName.toLowerCase().includes('anonymous') || 
                                  cleanName.toLowerCase().includes('tba') ||
                                  cleanName.toLowerCase().includes('to be announced') ||
                                  cleanName.toLowerCase().includes('coming soon')
                
                team.push({
                  name: cleanName,
                  role: cleanRole,
                  linkedin: cleanLinkedin,
                  anonymous: isAnonymous
                })
              }
            } catch (error) {
              console.warn('Error processing team member:', error)
            }
          })
          
          console.log('Team extraction completed', { 
            teamCount: team.length,
            teamMembers: team.map(m => ({ name: m.name, role: m.role, linkedin: m.linkedin }))
          })
          return team
        }
        
        return extractTeamMembers()
      })
      
      console.log(`Extracted ${teamData.length} team members`)
      return teamData
      
    } catch (error) {
      console.error(`Error crawling team info for ${baseUrl}:`, error)
      return []
    }
  }
  
  private static async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}
