// Core notification system - handles browser push, email, and smart scheduling
export interface NotificationConfig {
  browser: boolean
  email: boolean
  emailProvider: 'resend' | 'sendgrid' | 'gmail'
  userEmail?: string
}

export interface ReminderNotification {
  id: string
  contactId: string
  contactName: string
  message: string
  type: 'overdue' | 'question' | 'scheduled' | 'urgent'
  priority: 'high' | 'medium' | 'low'
  createdAt: Date
  scheduledFor?: Date
  sentAt?: Date
  status: 'pending' | 'sent' | 'dismissed'
}

// Browser notification system
export class BrowserNotificationService {
  private static instance: BrowserNotificationService
  private permission: NotificationPermission = 'default'

  static getInstance(): BrowserNotificationService {
    if (!BrowserNotificationService.instance) {
      BrowserNotificationService.instance = new BrowserNotificationService()
    }
    return BrowserNotificationService.instance
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported')
      return false
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted'
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      this.permission = permission
      return permission === 'granted'
    }

    return false
  }

  async sendNotification(reminder: ReminderNotification): Promise<boolean> {
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission()
      if (!granted) return false
    }

    try {
      const notification = new Notification('Loop Reminder', {
        body: reminder.message,
        icon: '/favicon.ico',
        tag: reminder.id,
        requireInteraction: true,
        data: { reminderId: reminder.id }
      })

      notification.onclick = () => {
        window.focus()
        window.location.href = '/dashboard'
        notification.close()
      }

      return true
    } catch (error) {
      console.error('Error sending browser notification:', error)
      return false
    }
  }
}

// Email notification system
export class EmailNotificationService {
  private static instance: EmailNotificationService
  private config: NotificationConfig

  constructor(config: NotificationConfig) {
    this.config = config
  }

  static getInstance(config: NotificationConfig): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService(config)
    }
    return EmailNotificationService.instance
  }

  async sendEmailReminder(reminder: ReminderNotification): Promise<boolean> {
    if (!this.config.email || !this.config.userEmail) return false

    try {
      const emailData = {
        to: this.config.userEmail,
        subject: `Loop Reminder: ${reminder.contactName}`,
        html: this.createEmailTemplate(reminder),
        text: this.createEmailText(reminder)
      }

      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...emailData,
          provider: this.config.emailProvider
        })
      })

      return response.ok
    } catch (error) {
      console.error('Error sending email reminder:', error)
      return false
    }
  }

  private createEmailTemplate(reminder: ReminderNotification): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Loop Reminder</h2>
        <p>You have an important conversation that needs attention:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
          <p style="margin: 0;"><strong>${reminder.contactName}</strong></p>
          <p style="margin: 10px 0 0 0; font-style: italic;">${reminder.message}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
            Open Loop Dashboard
          </a>
        </div>
      </div>
    `
  }

  private createEmailText(reminder: ReminderNotification): string {
    return `Loop Reminder\n\nYou have an important conversation with ${reminder.contactName} that needs attention:\n\n${reminder.message}\n\nOpen your Loop Dashboard to respond.`
  }
}

// Smart reminder scheduler
export class SmartReminderScheduler {
  private static instance: SmartReminderScheduler
  private reminders: Map<string, ReminderNotification> = new Map()

  static getInstance(): SmartReminderScheduler {
    if (!SmartReminderScheduler.instance) {
      SmartReminderScheduler.instance = new SmartReminderScheduler()
    }
    return SmartReminderScheduler.instance
  }

  scheduleReminder(reminder: ReminderNotification): void {
    this.reminders.set(reminder.id, reminder)
    
    if (reminder.scheduledFor) {
      const delay = reminder.scheduledFor.getTime() - Date.now()
      if (delay > 0) {
        setTimeout(() => this.processReminder(reminder.id), delay)
      } else {
        this.processReminder(reminder.id)
      }
    }
  }

  private async processReminder(reminderId: string): Promise<void> {
    const reminder = this.reminders.get(reminderId)
    if (!reminder || reminder.status !== 'pending') return

    // Send notifications
    const browserService = BrowserNotificationService.getInstance()
    const emailService = EmailNotificationService.getInstance({
      browser: true,
      email: true,
      emailProvider: 'resend'
    })

    await Promise.all([
      browserService.sendNotification(reminder),
      emailService.sendEmailReminder(reminder)
    ])

    // Mark as sent
    reminder.status = 'sent'
    reminder.sentAt = new Date()
    this.reminders.set(reminderId, reminder)
  }

  getPendingReminders(): ReminderNotification[] {
    return Array.from(this.reminders.values()).filter(r => r.status === 'pending')
  }
}

// Question detection system
export class QuestionDetector {
  private static questionPatterns = [
    /\?$/, // Ends with question mark
    /^(what|when|where|who|why|how|can|could|would|will|do|does|did|is|are|was|were)/i, // Question words
    /^(are you|can you|could you|would you|will you)/i, // Direct questions
    /^(let me know|tell me|update me|get back to me)/i // Requests for information
  ]

  static detectQuestions(message: string): boolean {
    const cleanMessage = message.trim().toLowerCase()
    
    return this.questionPatterns.some(pattern => 
      pattern.test(cleanMessage) || 
      cleanMessage.includes('?') ||
      this.isRequestForAction(cleanMessage)
    )
  }

  private static isRequestForAction(message: string): boolean {
    const actionWords = [
      'please', 'need', 'want', 'require', 'looking for', 'seeking',
      'help', 'assist', 'support', 'advice', 'suggestion', 'recommendation'
    ]
    
    return actionWords.some(word => message.includes(word))
  }

  static extractQuestions(messages: string[]): string[] {
    return messages.filter(msg => this.detectQuestions(msg))
  }
}

// Reminder effectiveness tracker
export class ReminderEffectivenessTracker {
  private static instance: ReminderEffectivenessTracker
  private stats: Map<string, { sent: number; responded: number; timeToResponse: number[] }> = new Map()

  static getInstance(): ReminderEffectivenessTracker {
    if (!ReminderEffectivenessTracker.instance) {
      ReminderEffectivenessTracker.instance = new ReminderEffectivenessTracker()
    }
    return ReminderEffectivenessTracker.instance
  }

  trackReminderSent(contactId: string): void {
    const stats = this.stats.get(contactId) || { sent: 0, responded: 0, timeToResponse: [] }
    stats.sent++
    this.stats.set(contactId, stats)
  }

  trackResponse(contactId: string, timeToResponse: number): void {
    const stats = this.stats.get(contactId) || { sent: 0, responded: 0, timeToResponse: [] }
    stats.responded++
    stats.timeToResponse.push(timeToResponse)
    this.stats.set(contactId, stats)
  }

  getEffectivenessStats(contactId: string): {
    responseRate: number
    avgResponseTime: number
    totalReminders: number
  } {
    const stats = this.stats.get(contactId) || { sent: 0, responded: 0, timeToResponse: [] }
    
    return {
      responseRate: stats.sent > 0 ? (stats.responded / stats.sent) * 100 : 0,
      avgResponseTime: stats.timeToResponse.length > 0 
        ? stats.timeToResponse.reduce((a, b) => a + b, 0) / stats.timeToResponse.length 
        : 0,
      totalReminders: stats.sent
    }
  }
}

// Main notification orchestrator
export class NotificationOrchestrator {
  private browserService: BrowserNotificationService
  private emailService: EmailNotificationService
  private scheduler: SmartReminderScheduler
  private questionDetector: QuestionDetector
  private effectivenessTracker: ReminderEffectivenessTracker

  constructor(config: NotificationConfig) {
    this.browserService = BrowserNotificationService.getInstance()
    this.emailService = EmailNotificationService.getInstance(config)
    this.scheduler = SmartReminderScheduler.getInstance()
    this.questionDetector = QuestionDetector
    this.effectivenessTracker = ReminderEffectivenessTracker.getInstance()
  }

  async createReminder(
    contactId: string,
    contactName: string,
    message: string,
    type: ReminderNotification['type'] = 'overdue',
    priority: ReminderNotification['priority'] = 'medium',
    scheduledFor?: Date
  ): Promise<string> {
    const reminder: ReminderNotification = {
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactId,
      contactName,
      message,
      type,
      priority,
      createdAt: new Date(),
      scheduledFor,
      status: 'pending'
    }

    this.scheduler.scheduleReminder(reminder)
    this.effectivenessTracker.trackReminderSent(contactId)
    
    return reminder.id
  }

  detectUnansweredQuestions(messages: string[]): string[] {
    return this.questionDetector.extractQuestions(messages)
  }

  getEffectivenessStats(contactId: string) {
    return this.effectivenessTracker.getEffectivenessStats(contactId)
  }
} 