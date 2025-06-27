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
    const hoursSinceLastMessage = (now.getTime() - loop.message.createdAt.toDate().getTime()) / (1000 * 60 * 60)
    
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

// Send email reminder (placeholder for now)
export async function sendEmailReminder(reminder: Reminder): Promise<boolean> {
  try {
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    console.log('Sending email reminder:', reminder)
    
    // For now, just log the reminder
    console.log(`📧 Email to user: ${reminder.message}`)
    
    return true
  } catch (error) {
    console.error('Error sending email reminder:', error)
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
    await sendEmailReminder(reminder)
    await sendPushNotification(reminder)
  }
  
  // Process scheduled follow-ups
  for (const followup of scheduledFollowups) {
    console.log(`📅 Scheduled follow-up due: ${followup.message}`)
    // This would trigger the actual follow-up action
  }
} 