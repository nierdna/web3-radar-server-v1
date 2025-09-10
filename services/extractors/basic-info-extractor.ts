export class BasicInfoExtractor {
  static extractBasicInfo(document: Document) {
    // Extract project name - try multiple selectors
    const nameSelectors = [
      'h1',
      '[data-testid="project-name"]',
      '.project-name',
      '.project-title',
      '.ico-name',
      '.token-name',
      'h1[class*="title"]',
      'h1[class*="name"]',
      '.title',
      '.name',
      'h1[class*="heading"]',
      '[class*="project"] h1',
      '[class*="ico"] h1',
      'h1[class*="main"]'
    ]
    
    let name = ''
    for (const selector of nameSelectors) {
      const element = document.querySelector(selector)
      if (element && element.textContent?.trim()) {
        name = element.textContent.trim()
        // Clean up the name - remove extra text
        name = name.split('\n')[0].trim()
        break
      }
    }
    
    // Fallback: try to find any h1 or title element
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

    // Extract token symbol - look for text in boxes or badges
    const symbolSelectors = [
      '[data-testid="token-symbol"]',
      '.token-symbol',
      '.symbol',
      '[class*="symbol"]',
      '[class*="token"]',
      'span[class*="badge"]',
      'div[class*="badge"]',
      'span[class*="tag"]'
    ]
    
    let symbol = ''
    for (const selector of symbolSelectors) {
      const element = document.querySelector(selector)
      if (element && element.textContent?.trim()) {
        const text = element.textContent.trim()
        // Look for short text that could be a symbol (1-10 chars, mostly letters)
        if (text.length <= 10 && /^[A-Za-z0-9]+$/.test(text)) {
          symbol = text
          break
        }
      }
    }

    // Extract description - try multiple selectors
    const descSelectors = [
      '[data-testid="project-description"]',
      '.project-description',
      '.description',
      '[class*="description"]',
      '[class*="overview"]',
      '[class*="summary"]',
      '.content p',
      '.main-content p',
      '[class*="content"] p',
      'p[class*="text"]',
      '.text-content',
      '[class*="text-content"]'
    ]
    
    let description = ''
    for (const selector of descSelectors) {
      const element = document.querySelector(selector)
      if (element && element.textContent?.trim()) {
        const text = element.textContent.trim()
        // Look for meaningful description (not just single words or short phrases)
        if (text.length > 50 && !text.includes('Loading') && !text.includes('Error')) {
          description = text
          break
        }
      }
    }

    // Extract website - improved selectors
    let website = ''
    const websiteSelectors = [
      'a[href*="aiquant.fun"]',
      'a[href*="http"]:not([href*="cryptorank.io"]):not([href*="twitter"]):not([href*="t.me"]):not([href*="discord"]):not([href*="medium"]):not([href*="github"]):not([href*="farcaster"]):not([href*="gitbook"])',
      'a[href*="www"]:not([href*="cryptorank.io"])'
    ]
    
    websiteSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      elements.forEach(el => {
        const href = el.getAttribute('href')
        if (href && !website) {
          // Look for main website (not social platforms)
          if (href.includes('aiquant.fun') || 
              (href.includes('http') && !href.includes('twitter') && !href.includes('t.me') && 
               !href.includes('discord') && !href.includes('medium') && !href.includes('github') &&
               !href.includes('farcaster') && !href.includes('gitbook') && !href.includes('cryptorank'))) {
            website = href
          }
        }
      })
    })

    return { name, symbol, description, website }
  }
}
