// services/telegram/telegram-service.ts
import axios from 'axios'
import { TelegramMessage, ProjectNotification, TelegramConfig } from '../../../lib/types'
import { TemplateEngine } from '../templates/template-engine'
import { readFileSync } from 'fs'
import { join } from 'path'

export class TelegramService {
  private static botToken: string
  private static groupId: string
  private static baseUrl: string
  private static templateCache: Map<string, string> = new Map()

  static initialize() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || ''
    this.groupId = process.env.TELEGRAM_GROUP_ID || ''
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`
    
    if (!this.botToken || !this.groupId) {
      console.warn('Telegram credentials not configured. Notifications will be disabled.')
    }
    
    // Pre-load templates
    this.loadTemplates()
  }

  private static loadTemplates() {
    try {
      const templatesDir = join(__dirname, '../templates')
      const projectCreatedTemplate = readFileSync(join(templatesDir, 'project-created.template.html'), 'utf-8')
      const statusChangedTemplate = readFileSync(join(templatesDir, 'status-changed.template.html'), 'utf-8')
      
      this.templateCache.set('project-created', projectCreatedTemplate)
      this.templateCache.set('status-changed', statusChangedTemplate)
      
      console.log('Templates loaded successfully')
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  private static getTemplate(templateName: string): string {
    const cached = this.templateCache.get(templateName)
    if (cached) {
      return cached
    }
    
    // Fallback: load from file
    try {
      const templatePath = join(__dirname, '../templates', `${templateName}.template.html`)
      const template = readFileSync(templatePath, 'utf-8')
      this.templateCache.set(templateName, template)
      return template
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error)
      return ''
    }
  }

  static async sendMessage(message: TelegramMessage): Promise<boolean> {
    if (!this.botToken || !this.groupId) {
      console.warn('Telegram not configured, skipping notification')
      return false
    }

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: this.groupId,
        text: message.text,
        parse_mode: message.parse_mode || 'HTML',
        disable_web_page_preview: message.disable_web_page_preview || false
      })

      console.log('Telegram message sent successfully:', response.data.ok)
      return response.data.ok
    } catch (error: any) {
      console.error('Failed to send Telegram message:', error.message)
      return false
    }
  }

  static formatProjectCreatedMessage(notification: ProjectNotification): TelegramMessage {
    const template = this.getTemplate('project-created')
    const templateData = {
      projectName: notification.projectName,
      symbol: notification.symbol,
      statusText: this.getStatusText(notification.status),
      category: notification.category || 'Crypto',
      website: notification.website,
      statusHashtag: this.getStatusHashtag(notification.status)
    }
    
    const message = TemplateEngine.render(template, templateData)

    return {
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    }
  }

  static formatStatusChangedMessage(notification: ProjectNotification): TelegramMessage {
    const template = this.getTemplate('status-changed')
    const templateData = {
      projectName: notification.projectName,
      symbol: notification.symbol,
      oldStatusText: this.getStatusText(notification.oldStatus || ''),
      newStatusText: this.getStatusText(notification.newStatus || ''),
      date: new Date().toLocaleDateString('vi-VN'),
      website: notification.website,
      statusHashtag: this.getStatusHashtag(notification.newStatus || '')
    }
    const message = TemplateEngine.render(template, templateData)

    return {
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    }
  }


  private static getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'upcoming': 'Upcoming IDO',
      'active': 'Active ICO',
      'mainnet': 'Mainnet Live',
      'testnet': 'Testnet',
      'dead': 'Dead',
      'notlaunched': 'Not Launched'
    }
    return statusMap[status.toLowerCase()] || status
  }

  private static getStatusHashtag(status: string): string {
    const statusMap: Record<string, string> = {
      'upcoming': 'IDO',
      'active': 'ICO',
      'mainnet': 'Mainnet',
      'testnet': 'Testnet',
      'dead': 'Dead',
      'notlaunched': 'Upcoming'
    }
    return statusMap[status.toLowerCase()] || 'Crypto'
  }

  static testTemplate(templateName: 'project-created' | 'status-changed', testData: any): string {
    const template = this.getTemplate(templateName)
    return TemplateEngine.render(template, testData)
  }
}
TelegramService.initialize()