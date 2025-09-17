import { Page } from 'puppeteer'
import { CryptoRankProject, ICOListItem } from '../../lib/schemas/schemas'
import { AntiBotMeasures } from '../utils/anti-bot'
import { ICOListExtractor } from '../extractors/ico-list-extractor'
import { BasicInfoExtractor } from '../extractors/basic-info-extractor'
import { TeamExtractor } from '../extractors/team-extractor'
import { BaseCrawler } from './base-crawler'
import { CrawlerUtils } from '../utils/crawler-utils'

export class CryptoRankCrawler extends BaseCrawler {
  async init() {
    await super.init()
  }

  async crawlUpcomingICOList(maxProjects: number = 0): Promise<ICOListItem[]> {
    if (!this.page) throw new Error('Crawler not initialized')

    console.log('Crawling upcoming ICO list...')
    
    try {
      await this.navigateToPage('https://cryptorank.io/upcoming-ico')

      // Add random delay to simulate human behavior
      await CrawlerUtils.randomDelay(2000, 4000)

      // Wait for the list to load with multiple selectors
      await CrawlerUtils.waitForSelectors(this.page, [
        'a[href*="/ico/"]', 
        '[data-testid="upcoming-ico-list"]', 
        '.upcoming-ico-list'
      ])

      // Scroll to load more content if needed
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      
      await CrawlerUtils.randomDelay(1000, 2000)

      return await ICOListExtractor.extractKeys()
      
    } catch (error) {
      console.error('Error crawling ICO list:', error)
      throw error
    }
  }

  async crawlProjectDetail(url: string, projectName?: string, tokenSymbol?: string): Promise<CryptoRankProject | null> {
    if (!this.browser) throw new Error('Crawler not initialized')

    // Create a new page for each project to avoid state issues
    const page = await this.setupNewPage()
    
    try {
      // Use the extracted project detail extractor with name/symbol from ICO list
      return await BasicInfoExtractor.extractBasicInfo(page, url, projectName, tokenSymbol)
    } catch (error) {
      console.error(`Error crawling project ${url}:`, error)
      return null
    } finally {
      // Close the page to free up resources
      await page.close()
    }
  }

  async crawlTeamInfo(url: string): Promise<any[]> {
    if (!this.browser) throw new Error('Crawler not initialized')

    // Create a new page for team crawling
    const page = await this.setupNewPage()
    
    try {
      // Use the team extractor
      return await TeamExtractor.extractTeamInfo(page, url)
    } catch (error) {
      console.error(`Error crawling team info for ${url}:`, error)
      return []
    } finally {
      // Close the page to free up resources
      await page.close()
    }
  }
}

// Re-export types and utilities for convenience
export { CryptoRankProject, ICOListItem } from '../../lib/schemas/schemas'
