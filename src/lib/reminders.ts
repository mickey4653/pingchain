// Only import email functions on server side
let sendEmailReminder: any = null
let createReminderEmail: any = null
let createFollowupEmail: any = null

if (typeof window === 'undefined') {
  // Server-side only
  try {
    // Try Resend first
    const resend = require('./resend')
    sendEmailReminder = resend.sendEmailReminder
    createReminderEmail = resend.createReminderEmail
    createFollowupEmail = resend.createFollowupEmail
  } catch (error) {
    console.log('Resend not available, trying simple email service')
    try {
      // Fallback to simple email service
      const simpleEmail = require('./simple-email')
      sendEmailReminder = simpleEmail.sendEmailReminder
      createReminderEmail = simpleEmail.createReminderEmail
      createFollowupEmail = simpleEmail.createFollowupEmail
    } catch (error2) {
      console.log('Simple email service not available:', error2)
    }
  }
}

// Helper function to handle both Firestore Timestamp and regular Date objects
function getMessageDate(message: any): Date {
  if (message.createdAt && typeof message.createdAt.toDate === 'function') {
    // Firestore Timestamp object
    return message.createdAt.toDate()
  } else if (message.createdAt instanceof Date) {
    // Regular Date object
    return message.createdAt
  } else if (typeof message.createdAt === 'string') {
    // ISO string
    return new Date(message.createdAt)
  } else {
    // Fallback to current date
    return new Date()
  }
}

export interface Reminder {
  id: string
  userId: string
  contactId: string
  contactName: string
  type: 'overdue' | 'scheduled' | 'snoozed'
  message: string
  dueDate: Date
  status: 'pending' | 'sent' | 'dismissed'
  createdAt: Date
}

export interface ScheduledFollowup {
  id: string
  userId: string
  contactId: string
  contactName: string
  scheduledFor: Date
  message: string
  status: 'pending' | 'sent' | 'cancelled'
  createdAt: Date
}

// Check for overdue conversations and create reminders
export function checkForOverdueConversations(
  openLoops: any[], 
  userId: string
): Reminder[] {
  const now = new Date()
  const reminders: Reminder[] = []
  
  openLoops.forEach(loop => {
    const hoursSinceLastMessage = (now.getTime() - getMessageDate(loop.message).getTime()) / (1000 * 60 * 60)
    
    // Create reminders for conversations older than 24 hours
    if (hoursSinceLastMessage >= 24) {
      reminders.push({
        id: `overdue_${loop.id}`,
        userId,
        contactId: loop.contact.id,
        contactName: loop.contact.name,
        type: 'overdue',
        message: `You haven't responded to ${loop.contact.name} in ${Math.floor(hoursSinceLastMessage)} hours`,
        dueDate: now,
        status: 'pending',
        createdAt: now
      })
    }
  })
  
  return reminders
}

// Check scheduled follow-ups
export function checkScheduledFollowups(userId: string): ScheduledFollowup[] {
  const now = new Date()
  const scheduledFollowups = JSON.parse(localStorage.getItem('scheduledFollowups') || '[]')
  
  return scheduledFollowups.filter((followup: ScheduledFollowup) => {
    const scheduledDate = new Date(followup.scheduledFor)
    return scheduledDate <= now && followup.status === 'pending'
  })
}

// Send email reminder using Resend
export async function sendEmailReminderWithResend(reminder: Reminder): Promise<boolean> {
  try {
    // Check if Resend functions are available
    if (!sendEmailReminder || !createReminderEmail) {
      console.log('Resend not available, logging reminder instead:', reminder)
      return true
    }

    // Find the contact and message details
    const contactName = reminder.contactName
    const hoursSinceLastMessage = Math.floor((new Date().getTime() - reminder.createdAt.getTime()) / (1000 * 60 * 60))
    
    // Create email content
    const emailReminder = createReminderEmail(
      contactName,
      hoursSinceLastMessage,
      reminder.message
    )
    
    // Send email
    const success = await sendEmailReminder(emailReminder)
    
    if (success) {
      console.log(`📧 Email reminder sent for ${contactName}`)
    }
    
    return success
  } catch (error) {
    console.error('Error sending email reminder:', error)
    return false
  }
}

// Send scheduled follow-up email
export async function sendScheduledFollowupEmail(followup: ScheduledFollowup): Promise<boolean> {
  try {
    // Check if Resend functions are available
    if (!sendEmailReminder || !createFollowupEmail) {
      console.log('Resend not available, logging follow-up instead:', followup)
      return true
    }

    // Create email content
    const emailReminder = createFollowupEmail(
      followup.contactName,
      followup.message
    )
    
    // Send email
    const success = await sendEmailReminder(emailReminder)
    
    if (success) {
      console.log(`📧 Scheduled follow-up email sent for ${followup.contactName}`)
    }
    
    return success
  } catch (error) {
    console.error('Error sending scheduled follow-up email:', error)
    return false
  }
}

// Send push notification (placeholder for now)
export async function sendPushNotification(reminder: Reminder): Promise<boolean> {
  try {
    // This would integrate with push notification service
    console.log('Sending push notification:', reminder)
    
    // For now, just log the notification
    console.log(`🔔 Push notification: ${reminder.message}`)
    
    return true
  } catch (error) {
    console.error('Error sending push notification:', error)
    return false
  }
}

// Process all pending reminders
export async function processReminders(userId: string, openLoops: any[]): Promise<void> {
  // Check for overdue conversations
  const overdueReminders = checkForOverdueConversations(openLoops, userId)
  
  // Check scheduled follow-ups
  const scheduledFollowups = checkScheduledFollowups(userId)
  
  // Process overdue reminders
  for (const reminder of overdueReminders) {
    await sendEmailReminderWithResend(reminder)
    await sendPushNotification(reminder)
  }
  
  // Process scheduled follow-ups
  for (const followup of scheduledFollowups) {
    console.log(`📅 Scheduled follow-up due: ${followup.message}`)
    await sendScheduledFollowupEmail(followup)
  }
} 