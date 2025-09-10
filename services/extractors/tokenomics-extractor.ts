export class TokenomicsExtractor {
  static extractTokenomics(document: Document, symbol: string) {
    const tokenomics = {
      tokenName: '',
      tokenSymbol: symbol,
      tokenType: '',
      totalSupply: 0,
      circulatingSupply: 0,
      circulatingAtTGE: 0,
      tokenContract: '',
      tokenAllocation: {
        seed: { percentage: 0, vesting: '' },
        private: { percentage: 0, vesting: '' },
        team: { percentage: 0, vesting: '' },
        treasury: { percentage: 0, vesting: '' },
        public: { percentage: 0, vesting: '' }
      }
    }

    // Look for token supply information
    const supplySelectors = [
      '[class*="supply"]', '[class*="total"]', '[class*="circulating"]',
      '[class*="tge"]', '[class*="market"]', '[class*="cap"]',
      'td', 'span', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ]
    
    supplySelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      elements.forEach(el => {
        const text = el.textContent || ''
        
        // Look for Max Supply pattern: "AIQ 1,000,000,000"
        if (text.includes('Max Supply') || text.includes('Total Supply')) {
          const supplyMatch = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/)
          if (supplyMatch) {
            const value = parseFloat(supplyMatch[1].replace(/,/g, ''))
            if (text.includes('Max Supply')) {
              tokenomics.totalSupply = value
            } else if (text.includes('Total Supply')) {
              tokenomics.totalSupply = value
            }
          }
        }
        
        // Look for additional supply patterns
        if (text.includes('1,000,000,000') || text.includes('1000000000')) {
          const value = parseFloat(text.replace(/[^\d]/g, ''))
          if (value === 1000000000) {
            tokenomics.totalSupply = value
          }
        }
        
        // Look for token symbol patterns like "AIQ"
        if (text.match(/^[A-Z]{2,10}$/) && text.length <= 10) {
          tokenomics.tokenSymbol = text
        }
        
        const value = parseFloat(text.replace(/[^\d.]/g, ''))
        
        if (value > 0) {
          // Total supply patterns
          if (text.toLowerCase().includes('total') && text.toLowerCase().includes('supply')) {
            tokenomics.totalSupply = value
          }
          // Circulating supply patterns  
          else if (text.toLowerCase().includes('circulating') && text.toLowerCase().includes('supply')) {
            tokenomics.circulatingSupply = value
          }
          // TGE patterns
          else if (text.toLowerCase().includes('tge') || text.toLowerCase().includes('at tge')) {
            tokenomics.circulatingAtTGE = value
          }
        }
      })
    })

    return tokenomics
  }
}