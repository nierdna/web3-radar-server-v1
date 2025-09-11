import { Page } from 'puppeteer'

export class AntiBotMeasures {
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ]

  private static readonly VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
  ]

  static async setupAntiBotMeasures(page: Page): Promise<void> {
    // Random user agents
    const randomUA = this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)]
    await page.setUserAgent(randomUA)
    
    // Random viewport sizes
    const randomViewport = this.VIEWPORTS[Math.floor(Math.random() * this.VIEWPORTS.length)]
    await page.setViewport(randomViewport)
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    })
    
    // Remove webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })
    })
    
    // Override plugins
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      })
    })
    
    // Override languages
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      })
    })
    
    // Random mouse movements
    await page.evaluateOnNewDocument(() => {
      let mouseX = 0
      let mouseY = 0
      document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX
        mouseY = e.clientY
      })
    })
  }

  static async simulateHumanBehavior(page: Page): Promise<void> {
    try {
      // Random mouse movements
      const viewport = await page.viewport()
      if (viewport) {
        const { width, height } = viewport
        
        // Move mouse to random positions
        for (let i = 0; i < 3; i++) {
          const x = Math.floor(Math.random() * width)
          const y = Math.floor(Math.random() * height)
          await page.mouse.move(x, y, { steps: 10 })
          await this.randomDelay(100, 300)
        }
      }

      // Random scrolling
      const scrollAmount = Math.floor(Math.random() * 500) + 200
      await page.evaluate((amount) => {
        window.scrollBy(0, amount)
      }, scrollAmount)
      
      await this.randomDelay(500, 1500)
      
      // Scroll back up a bit
      await page.evaluate((amount) => {
        window.scrollBy(0, -amount / 2)
      }, scrollAmount)
      
      await this.randomDelay(300, 800)
      
    } catch (error) {
      console.warn('Error simulating human behavior:', error)
    }
  }

  static async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  static async setupResourceBlocking(page: Page): Promise<void> {
    // Block unnecessary resources to speed up crawling
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const resourceType = req.resourceType()
      if (['image', 'stylesheet', 'font', 'media', 'websocket'].includes(resourceType)) {
        req.abort()
      } else {
        req.continue()
      }
    })
  }
}