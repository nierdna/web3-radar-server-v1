export interface TelegramMessage {
  text: string
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  disable_web_page_preview?: boolean
}

export interface ProjectNotification {
  projectName: string
  symbol?: string
  status: string
  category?: string
  website?: string
  projectId: string
  changeType: 'created' | 'status_changed'
  oldStatus?: string
  newStatus?: string
}

export interface TelegramConfig {
  botToken: string
  groupId: string
  enabled: boolean
}
