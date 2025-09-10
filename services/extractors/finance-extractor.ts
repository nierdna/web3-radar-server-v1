export class FinanceExtractor {
  static extractTGEInfo(document: Document) {
    const tgeInfo = {
      tgeDate: '',
      tgeExchange: '',
      initialMarketcap: 0,
      listingPrice: 0,
      marketCap: 0
    }

    // Look for TGE information
    const tgeSelectors = [
      '[class*="tge"]', '[class*="launch"]', '[class*="token"]', '[class*="listing"]',
      '[class*="exchange"]', '[class*="dex"]', 'td', 'span', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ]
    
    tgeSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      elements.forEach(el => {
        const text = el.textContent || ''
        
        // Look for TGE date patterns like "16 Sep"
        if (text.toLowerCase().includes('tge') || text.toLowerCase().includes('launch') || text.includes('Sep')) {
          const dateMatch = text.match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)
          if (dateMatch) tgeInfo.tgeDate = dateMatch[0]
        }
        
        // Look for price patterns like "$ 0.05"
        if (text.includes('$') && text.includes('0.05')) {
          const priceMatch = text.match(/\$\s*([\d.]+)/)
          if (priceMatch) tgeInfo.listingPrice = parseFloat(priceMatch[1])
        }
        
        // Look for exchange patterns
        if (text.toLowerCase().includes('exchange') || 
            text.toLowerCase().includes('dex') ||
            text.toLowerCase().includes('uniswap') ||
            text.toLowerCase().includes('pancakeswap')) {
          tgeInfo.tgeExchange = text.trim()
        }
      })
    })

    return tgeInfo
  }

  static extractFundraising(document: Document) {
    const fundraising = {
      totalRaised: 0,
      notableInvestors: [] as string[],
      fundingRounds: [] as any[]
    }

    // Look for fundraising information
    const raisedSelectors = [
      '[class*="raised"]', '[class*="funding"]', '[class*="investment"]',
      '[class*="raise"]', '[class*="total"]', 'td', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ]
    
    raisedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      elements.forEach(el => {
        const text = el.textContent || ''
        
        // Look for "Raising $ 50.00K" pattern
        if (text.includes('Raising') && text.includes('$')) {
          const raiseMatch = text.match(/\$\s*([\d,]+(?:\.\d+)?[KMB]?)/i)
          if (raiseMatch) {
            let value = parseFloat(raiseMatch[1].replace(/[KMB]/i, ''))
            if (raiseMatch[1].toUpperCase().includes('K')) value *= 1000
            else if (raiseMatch[1].toUpperCase().includes('M')) value *= 1000000
            else if (raiseMatch[1].toUpperCase().includes('B')) value *= 1000000000
            fundraising.totalRaised = value
          }
        }
        
        // Look for other raised amount patterns
        const value = parseFloat(text.replace(/[^\d.]/g, ''))
        
        if (value > 0) {
          // Look for raised amount patterns
          if (text.toLowerCase().includes('raised') || 
              text.toLowerCase().includes('funding') ||
              text.toLowerCase().includes('investment') ||
              (text.includes('$') && text.toLowerCase().includes('total'))) {
            fundraising.totalRaised = value
          }
        }
      })
    })

    return fundraising
  }

  static extractPreMarketPricing(document: Document) {
    const preMarketPricing = [] as any[]
    const preMarketElements = document.querySelectorAll('[class*="pre-market"], [class*="otc"], [class*="pricing"]')
    preMarketElements.forEach(el => {
      const platformEl = el.querySelector('.platform, [class*="platform"]')
      const priceEl = el.querySelector('.price, [class*="price"]')
      const volumeEl = el.querySelector('.volume, [class*="volume"]')
      
      if (platformEl) {
        const platform = platformEl.textContent?.trim() || ''
        const lastPrice = priceEl ? parseFloat(priceEl.textContent?.replace(/[^\d.]/g, '') || '0') : 0
        const totalVol = volumeEl ? parseFloat(volumeEl.textContent?.replace(/[^\d.]/g, '') || '0') : 0
        
        if (platform) {
          preMarketPricing.push({
            platform,
            lastPrice,
            totalVol,
            vol24h: 0,
            change24h: 0
          })
        }
      }
    })

    return preMarketPricing
  }
}