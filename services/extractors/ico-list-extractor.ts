import { Page } from 'puppeteer'
import { ICOListItem } from '../schemas'

export class ICOListExtractor {
  static async extractICOList(page: Page): Promise<ICOListItem[]> {
    const allProjects: ICOListItem[] = []
    let currentPage = 1
    let hasNextPage = true
    const maxPages = 10 // Safety limit to avoid infinite loop

    while (hasNextPage && currentPage <= maxPages) {
      console.log(`Crawling page ${currentPage}...`)
      
      // Navigate to current page
      if (currentPage > 1) {
        await page.goto(`https://cryptorank.io/upcoming-ico?page=${currentPage}`, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        })
        await this.randomDelay(2000, 4000)
      }

      // Wait for table to load
      await page.waitForSelector('table, [class*="table"], .upcoming-ico-list', { 
        timeout: 15000 
      })

      const pageProjects = await page.evaluate(() => {
        const projects: ICOListItem[] = []

        // Find table rows
        const tableRows = document.querySelectorAll('tr, [class*="row"], [class*="item"]')
        
        tableRows.forEach((row) => {
          try {
            // Find project link in row
            const projectLink = row.querySelector('a[href*="/ico/"]') as HTMLAnchorElement
            if (!projectLink) return

            const href = projectLink.getAttribute('href')
            if (!href) return

            // Normalize URL and convert /ico/ to /price/ for better data access
            let detailUrl = href.startsWith('/') ? `https://cryptorank.io${href}` : href
            if (detailUrl.includes('/ico/')) {
              detailUrl = detailUrl.replace('/ico/', '/price/')
            }
            
            // Extract project name and token symbol
            const projectText = projectLink.textContent?.trim() || ''
            let projectName = ''
            let tokenSymbol = ''

            if (projectText) {
              // Try to split by pattern: "ProjectNameTOKEN" -> "ProjectName" and "TOKEN"
              const match = projectText.match(/^(.+?)([A-Z]{2,10})$/)
              if (match) {
                projectName = match[1].trim()
                tokenSymbol = match[2].trim()
              } else {
                projectName = projectText
                tokenSymbol = ''
              }
            }

            // Extract other fields from table cells
            const cells = row.querySelectorAll('td, [class*="cell"], [class*="column"]')
            let type = ''
            let initialCap = ''
            let raise = ''
            let launchpad = ''
            let when = ''
            let moniScore = ''

            cells.forEach((cell, index) => {
              const text = cell.textContent?.trim() || ''
              
              // Based on cell position to determine field
              if (index === 1) type = text // Type column
              else if (index === 2) initialCap = text // Initial Cap column
              else if (index === 3) raise = text // Raise column
              else if (index === 4) launchpad = text // Launchpad column
              else if (index === 5) when = text // When column
              else if (index === 7) moniScore = text // Moni Score column
            })

            // Find chain info from images or text
            let chain = ''
            const chainImages = row.querySelectorAll('img[alt*="ethereum"], img[alt*="bsc"], img[alt*="solana"], img[alt*="polygon"], img[alt*="avalanche"]')
            if (chainImages.length > 0) {
              chain = chainImages[0].getAttribute('alt') || ''
            }

            // Find category from type or tags
            let category = ''
            if (type) {
              if (type.includes('DeFi')) category = 'DeFi'
              else if (type.includes('NFT')) category = 'NFT'
              else if (type.includes('Gaming')) category = 'Gaming'
              else if (type.includes('DAO')) category = 'DAO'
              else if (type.includes('AI')) category = 'AI'
              else category = 'Others'
            }

            const project: ICOListItem = {
              detailUrl,
              projectName,
              tokenSymbol,
              chain,
              category,
              status: when || 'Upcoming',
              type,
              initialCap,
              raise,
              launchpad,
              when,
              moniScore
            }

            projects.push(project)

          } catch (error) {
            console.error('Error extracting project from row:', error)
          }
        })

        return projects
      })

      allProjects.push(...pageProjects)
      console.log(`Page ${currentPage}: Found ${pageProjects.length} projects`)

      // Check if there's a next page
      const hasNext = await page.evaluate(() => {
        const nextButton = document.querySelector('a[href*="page="], button[class*="next"], [class*="pagination"] a:last-child')
        return nextButton && !nextButton.classList.contains('disabled') && !nextButton.classList.contains('active')
      })

      hasNextPage = hasNext || false
      currentPage++

      // Delay between pages
      if (hasNextPage) {
        await this.randomDelay(3000, 5000)
      }
    }

    // Remove duplicates and filter valid data
    const uniqueData = allProjects.filter((item, index, self) => 
      item && 
      item.detailUrl && 
      item.detailUrl.includes('cryptorank.io') && 
      (item.detailUrl.includes('ico') || item.detailUrl.includes('price')) &&
      index === self.findIndex(t => t.detailUrl === item.detailUrl)
    )
    
    console.log(`Found ${uniqueData.length} unique ICO items with data`)
    return uniqueData
  }

  private static async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}
