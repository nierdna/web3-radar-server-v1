import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import {  ProjectNotification } from '../../lib/types'
import { TelegramService } from '../../services/notifications/telegram/telegram-service'
export const config: EventConfig = {
  type: 'event',
  name: 'TelegramNotification',
  description: 'Send Telegram notifications for project events',
  subscribes: ['project.created', 'project.status.changed'],
  emits: ['notification.sent', 'notification.failed'],
  input: z.object({
    projectName: z.string(),
    symbol: z.string().optional(),
    status: z.string(),
    category: z.string().optional(),
    website: z.string().optional(),
    projectId: z.string(),
    changeType: z.enum(['created', 'status_changed']),
    oldStatus: z.string().optional(),
    newStatus: z.string().optional()
  }),
  flows: ['notifications']
}

export const handler = async (input: any, { emit, logger, traceId }: any) => {
  try {
    logger.info('Processing Telegram notification', { 
      changeType: input.changeType,
      projectName: input.projectName,
      traceId 
    })

    const notification: ProjectNotification = {
      projectName: input.projectName,
      symbol: input.symbol,
      status: input.status,
      category: input.category,
      website: input.website,
      projectId: input.projectId,
      changeType: input.changeType,
      oldStatus: input.oldStatus,
      newStatus: input.newStatus
    }

    let message
    if (input.changeType === 'created') {
      message = TelegramService.formatProjectCreatedMessage(notification)
    } else {
      message = TelegramService.formatStatusChangedMessage(notification)
    }

    const success = await TelegramService.sendMessage(message)

    if (success) {
      logger.info('Telegram notification sent successfully', { 
        projectName: input.projectName,
        changeType: input.changeType,
        traceId 
      })
      
      await emit({
        topic: 'notification.sent',
        data: { 
          projectName: input.projectName,
          changeType: input.changeType,
          traceId 
        }
      })
    } else {
      throw new Error('Failed to send Telegram message')
    }

  } catch (error: any) {
    logger.error('Telegram notification failed', { 
      error: error.message,
      projectName: input.projectName,
      traceId 
    })
    
    await emit({
      topic: 'notification.failed',
      data: { 
        projectName: input.projectName,
        error: error.message,
        traceId 
      }
    })
  }
}
