export class SocialExtractor {
  static extractSocialLinks(document: Document) {
    const socials = {
      twitter: '',
      discord: '',
      telegram: '',
      medium: '',
      github: '',
      website: '',
      farcaster: '',
      gitbook: ''
    }

    // Look for social links in various locations - comprehensive selectors
    const socialSelectors = [
      // Twitter/X
      'a[href*="twitter.com"]', 'a[href*="x.com"]', 'a[href*="aiquantfun"]',
      // Telegram
      'a[href*="t.me"]', 'a[href*="aiquantfun"]',
      // Discord
      'a[href*="discord"]', 'a[href*="discord.gg"]',
      // Medium
      'a[href*="medium.com"]', 'a[href*="medium"]',
      // GitHub
      'a[href*="github.com"]', 'a[href*="github"]',
      // Farcaster
      'a[href*="farcaster"]', 'a[href*="farcaster.xyz"]', 'a[href*="aiquant"]',
      // Gitbook/Docs
      'a[href*="gitbook"]', 'a[href*="docs.aiquant.fun"]', 'a[href*="docs"]',
      // General links
      'a[href*="http"]', 'a[href*="www"]'
    ]
    
    // Process social links
    socialSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      elements.forEach(el => {
        const href = el.getAttribute('href')
        const text = el.textContent?.toLowerCase() || ''
        const title = el.getAttribute('title')?.toLowerCase() || ''
        
        if (href) {
          // Twitter/X - prioritize aiquantfun
          if (href.includes('aiquantfun') && (href.includes('twitter.com') || href.includes('x.com'))) {
            socials.twitter = href
          }
          else if ((href.includes('twitter.com') || href.includes('x.com')) && !socials.twitter) {
            socials.twitter = href
          }
          // Telegram - prioritize aiquantfun
          else if (href.includes('aiquantfun') && href.includes('t.me')) {
            socials.telegram = href
          }
          else if (href.includes('t.me') && !socials.telegram) {
            socials.telegram = href
          }
          // Discord
          else if (href.includes('discord') && !socials.discord) {
            socials.discord = href
          }
          // Medium - only accept project-specific Medium links, exclude CryptoRank
          else if (href.includes('medium.com/@') && !href.includes('@cryptorank') && !socials.medium) {
            socials.medium = href
          }
          else if (href.includes('medium.com') && !href.includes('pad.') && !href.includes('@cryptorank') && !socials.medium) {
            socials.medium = href
          }
          // GitHub
          else if (href.includes('github') && !socials.github) {
            socials.github = href
          }
          // Farcaster - prioritize aiquant
          else if (href.includes('aiquant') && href.includes('farcaster')) {
            socials.farcaster = href
          }
          else if (href.includes('farcaster') && !socials.farcaster) {
            socials.farcaster = href
          }
          // Gitbook/Docs - prioritize docs.aiquant.fun
          else if (href.includes('docs.aiquant.fun')) {
            socials.gitbook = href
          }
          else if (href.includes('gitbook') && !socials.gitbook) {
            socials.gitbook = href
          }
          // Website links (exclude social platforms)
          else if (href.includes('http') && !href.includes('twitter') && !href.includes('discord') && 
                  !href.includes('t.me') && !href.includes('medium') && !href.includes('github') &&
                  !href.includes('farcaster') && !href.includes('gitbook') && !href.includes('cryptorank') &&
                  !socials.website) {
            socials.website = href
          }
        }
      })
    })

    return socials
  }

  static extractCommunityMetrics(document: Document) {
    const communityMetrics = {
      twitterFollowers: 0,
      discordMembers: 0,
      telegramMembers: 0,
      githubStars: 0
    }

    // Look for follower counts
    const followerElements = document.querySelectorAll('[class*="follower"], [class*="member"], [class*="count"]')
    followerElements.forEach(el => {
      const text = el.textContent || ''
      const count = parseInt(text.replace(/[^\d]/g, ''))
      if (count > 0) {
        // Try to determine which metric this is based on context
        const parent = el.closest('[class*="twitter"], [class*="discord"], [class*="telegram"], [class*="github"]')
        if (parent?.className.includes('twitter')) communityMetrics.twitterFollowers = count
        else if (parent?.className.includes('discord')) communityMetrics.discordMembers = count
        else if (parent?.className.includes('telegram')) communityMetrics.telegramMembers = count
        else if (parent?.className.includes('github')) communityMetrics.githubStars = count
      }
    })

    return communityMetrics
  }
}