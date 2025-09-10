import puppeteer, { Browser, Page } from 'puppeteer'
import { CryptoRankProject, ICOListItem } from './schemas'
import { AntiBotMeasures } from './anti-bot'
import { ICOListExtractor } from './extractors/ico-list-extractor'
import { ProjectDetailExtractor } from './extractors/project-detail-extractor'
import { normalizeProjectData, mapToProjectCategory, mapToChain } from './utils'

export class CryptoRankCrawler {
  private browser: Browser | null = null
  private page: Page | null = null

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        // '--disable-javascript', // Enable JS for dynamic content
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--password-store=basic',
        '--use-mock-keychain',
      ],
      defaultViewport: { width: 1920, height: 1080 },
    })

    this.page = await this.browser.newPage()
    
    // Enhanced anti-bot measures
    await AntiBotMeasures.setupAntiBotMeasures(this.page)
    
    // Block unnecessary resources to speed up crawling
    await AntiBotMeasures.setupResourceBlocking(this.page)
  }

  async crawlUpcomingICOList(maxProjects: number = 0): Promise<ICOListItem[]> {
    if (!this.page) throw new Error('Crawler not initialized')

    console.log('Crawling upcoming ICO list...')
    
    try {
      await this.page.goto('https://cryptorank.io/upcoming-ico', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      })

      // Add random delay to simulate human behavior
      await AntiBotMeasures.randomDelay(2000, 4000)

      // Wait for the list to load with multiple selectors
      await this.page.waitForSelector('a[href*="/ico/"], [data-testid="upcoming-ico-list"], .upcoming-ico-list', { 
        timeout: 15000 
      })

      // Scroll to load more content if needed
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      
      await AntiBotMeasures.randomDelay(1000, 2000)

      // Use the extracted ICO list extractor
      return await ICOListExtractor.extractICOList(this.page)
      
    } catch (error) {
      console.error('Error crawling ICO list:', error)
      throw error
    }
  }

  async crawlProjectDetail(url: string): Promise<CryptoRankProject | null> {
    if (!this.browser) throw new Error('Crawler not initialized')

    // Create a new page for each project to avoid state issues
    const page = await this.browser.newPage()
    
    try {
      // Setup anti-bot measures for new page
      await AntiBotMeasures.setupAntiBotMeasures(page)
      
      // Add random delay before each request
      await AntiBotMeasures.randomDelay(2000, 5000)
      
      // Simulate human behavior - scroll and move mouse
      await AntiBotMeasures.simulateHumanBehavior(page)

      // Use the extracted project detail extractor
      return await ProjectDetailExtractor.extractProjectDetail(page, url)
    } catch (error) {
      console.error(`Error crawling project ${url}:`, error)
      return null
    } finally {
      // Close the page to free up resources
      await page.close()
    }
  }

  async close() {
    if (this.page) {
      await this.page.close()
      this.page = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

// Re-export types and utilities for convenience
export { CryptoRankProject, ICOListItem } from './schemas'
export { normalizeProjectData, mapToProjectCategory, mapToChain } from './utils'