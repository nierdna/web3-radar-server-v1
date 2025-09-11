import { CryptoRankProject } from './schemas'

// Utility functions for data normalization and mapping
export const normalizeProjectData = (data: CryptoRankProject): CryptoRankProject => {
  return {
    ...data,
    name: data.name?.trim() || '',
    symbol: data.symbol?.trim() || '',
    description: data.description?.trim() || '',
    website: data.website?.replace(/utm_.*?(&|$)/g, '').trim() || '',
    // Add more normalization logic here
  }
}




export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const randomDelay = (min: number, max: number): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export const cleanUrl = (url: string): string => {
  return url.replace(/utm_.*?(&|$)/g, '').trim()
}

export const extractDomain = (url: string): string => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

export const formatNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B'
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export const parseNumber = (text: string): number => {
  const cleaned = text.replace(/[^\d.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

export const parseCurrency = (text: string): number => {
  const match = text.match(/\$?([\d,]+(?:\.\d+)?[KMB]?)/i)
  if (!match) return 0
  
  let value = parseFloat(match[1].replace(/,/g, ''))
  const suffix = match[1].toUpperCase()
  
  if (suffix.includes('K')) value *= 1000
  else if (suffix.includes('M')) value *= 1000000
  else if (suffix.includes('B')) value *= 1000000000
  
  return value
}

export const sanitizeText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n\t]/g, ' ')
    .trim()
}

export const extractEmail = (text: string): string => {
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  return emailMatch ? emailMatch[1] : ''
}

export const extractSocialHandle = (url: string, platform: string): string => {
  const patterns: Record<string, RegExp> = {
    twitter: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/,
    telegram: /t\.me\/([a-zA-Z0-9_]+)/,
    discord: /discord\.gg\/([a-zA-Z0-9_]+)/,
    github: /github\.com\/([a-zA-Z0-9_-]+)/,
    medium: /medium\.com\/@([a-zA-Z0-9_-]+)/,
  }
  
  const pattern = patterns[platform.toLowerCase()]
  if (!pattern) return ''
  
  const match = url.match(pattern)
  return match ? match[1] : ''
}
