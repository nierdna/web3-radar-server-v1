import { Page } from 'puppeteer'
import { AntiBotMeasures } from './anti-bot'

export class CrawlerUtils {
  /**
   * Generate random delay between min and max milliseconds
   */
  static async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * Get error message from unknown error type
   */
  static getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error'
  }

  /**
   * Setup page with anti-bot measures and human simulation
   */
  static async setupPage(page: Page): Promise<void> {
    await AntiBotMeasures.setupAntiBotMeasures(page)
    await this.randomDelay(2000, 5000)
    await AntiBotMeasures.simulateHumanBehavior(page)
  }

  /**
   * Navigate to URL with retry logic
   */
  static async navigateWithRetry(
    page: Page, 
    url: string, 
    maxRetries: number = 1
  ): Promise<void> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        })
        return // Success
      } catch (error) {
        lastError = error as Error
        if (attempt < maxRetries) {
          console.warn(`Failed to load ${url}, retrying... (attempt ${attempt + 1})`, lastError.message)
          await this.randomDelay(3000, 5000)
          
          // Try with networkidle0 on retry
          await page.goto(url, { 
            waitUntil: 'networkidle0',
            timeout: 45000 
          })
          return
        }
      }
    }
    
    throw lastError || new Error('Navigation failed after retries')
  }

  /**
   * Wait for selector with multiple fallback selectors
   */
  static async waitForSelectors(
    page: Page, 
    selectors: string[], 
    timeout: number = 15000
  ): Promise<void> {
    await page.waitForSelector(selectors.join(', '), { timeout })
  }

  /**
   * Convert ICO URL to price URL for better data access
   */
  static normalizeUrl(url: string): string {
    if (url.includes('/ico/')) {
      return url.replace('/ico/', '/price/')
    }
    return url
  }

  /**
   * Convert price URL to team URL
   */
  static getTeamUrl(url: string): string {
    // Handle different URL patterns
    if (url.includes('/price/')) {
      return url.replace('/price/', '/price/') + '/team'
    } else if (url.includes('/ico/')) {
      return url.replace('/ico/', '/price/') + '/team'
    } else {
      // Fallback: add /team to the end
      return url + '/team'
    }
  }
}
