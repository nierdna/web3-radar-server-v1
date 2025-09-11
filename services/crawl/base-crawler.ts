import puppeteer, { Browser, Page } from 'puppeteer'
import { AntiBotMeasures } from '../utils/anti-bot'

export abstract class BaseCrawler {
  protected browser: Browser | null = null
  protected page: Page | null = null

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

  protected async navigateToPage(url: string, page?: Page): Promise<void> {
    const targetPage = page || this.page
    if (!targetPage) throw new Error('No page available for navigation')

    await targetPage.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
  }

  protected async setupNewPage(): Promise<Page> {
    if (!this.browser) throw new Error('Browser not initialized')
    
    const page = await this.browser.newPage()
    await AntiBotMeasures.setupAntiBotMeasures(page)
    await AntiBotMeasures.randomDelay(2000, 5000)
    await AntiBotMeasures.simulateHumanBehavior(page)
    
    return page
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
