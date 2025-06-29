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
  type: 'overdue' | 'scheduled' | 'snoozed' | 'checkin'
  message: string
  dueDate: Date
  status: 'pending' | 'sent' | 'dismissed'
  createdAt: Date
  priority: 'high' | 'medium' | 'low'
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

export interface CommunicationContract {
  id: string
  userId: string
  contactId: string
  contactName: string
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  timeOfDay: string // "09:00"
  daysOfWeek: number[] // [1,2,3,4,5] for weekdays
  lastCheckin: Date
  nextCheckin: Date
  status: 'active' | 'paused' | 'completed'
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
      const priority: 'high' | 'medium' | 'low' = 
        hoursSinceLastMessage >= 72 ? 'high' : 
        hoursSinceLastMessage >= 48 ? 'medium' : 'low'
      
      reminders.push({
        id: `overdue_${loop.id}`,
        userId,
        contactId: loop.contact.id,
        contactName: loop.contact.name,
        type: 'overdue',
        message: `You haven't responded to ${loop.contact.name} in ${Math.floor(hoursSinceLastMessage)} hours`,
        dueDate: now,
        status: 'pending',
        createdAt: now,
        priority
      })
    }
  })
  
  return reminders
}

// Check scheduled follow-ups
export function checkScheduledFollowups(userId: string): ScheduledFollowup[] {
  const now = new Date()
  
  // Only use localStorage on client-side
  if (typeof window === 'undefined') {
    // Server-side: return empty array for now
    // In production, this would query a database
    return []
  }
  
  const scheduledFollowups = JSON.parse(localStorage.getItem('scheduledFollowups') || '[]')
  
  return scheduledFollowups.filter((followup: ScheduledFollowup) => {
    const scheduledDate = new Date(followup.scheduledFor)
    return scheduledDate <= now && followup.status === 'pending'
  })
}

// Check communication contracts for due check-ins
export function checkCommunicationContracts(userId: string): Reminder[] {
  const now = new Date()
  
  // Only use localStorage on client-side
  if (typeof window === 'undefined') {
    // Server-side: return empty array for now
    // In production, this would query a database
    return []
  }
  
  const contracts = JSON.parse(localStorage.getItem('communicationContracts') || '[]')
  const reminders: Reminder[] = []
  
  contracts.forEach((contract: CommunicationContract) => {
    if (contract.status !== 'active') return
    
    const nextCheckin = new Date(contract.nextCheckin)
    if (nextCheckin <= now) {
      reminders.push({
        id: `contract_${contract.id}`,
        userId,
        contactId: contract.contactId,
        contactName: contract.contactName || 'Contact',
        type: 'checkin',
        message: `Scheduled check-in with ${contract.contactName || 'contact'} (${contract.frequency})`,
        dueDate: now,
        status: 'pending',
        createdAt: now,
        priority: 'medium'
      })
    }
  })
  
  return reminders
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
    
    // In a real implementation, this would:
    // 1. Check if user has push notifications enabled
    // 2. Send to their device(s)
    // 3. Handle different notification types
    
    return true
  } catch (error) {
    console.error('Error sending push notification:', error)
    return false
  }
}

// Send browser notification (works in browser)
export async function sendBrowserNotification(reminder: Reminder): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false
    
    // Check if browser notifications are supported
    if (!('Notification' in window)) {
      console.log('Browser notifications not supported')
      return false
    }
    
    // Check if permission is granted
    if (Notification.permission === 'granted') {
      new Notification('Loop Reminder', {
        body: reminder.message,
        icon: '/favicon.ico',
        tag: reminder.id,
        requireInteraction: true
      })
      return true
    } else if (Notification.permission !== 'denied') {
      // Request permission
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        new Notification('Loop Reminder', {
          body: reminder.message,
          icon: '/favicon.ico',
          tag: reminder.id,
          requireInteraction: true
        })
        return true
      }
    }
    
    return false
  } catch (error) {
    console.error('Error sending browser notification:', error)
    return false
  }
}

// Process all pending reminders
export async function processReminders(userId: string, openLoops: any[]): Promise<void> {
  // Check for overdue conversations
  const overdueReminders = checkForOverdueConversations(openLoops, userId)
  
  // Check scheduled follow-ups
  const scheduledFollowups = checkScheduledFollowups(userId)
  
  // Check communication contracts
  const contractReminders = checkCommunicationContracts(userId)
  
  // Combine all reminders
  const allReminders = [...overdueReminders, ...contractReminders]
  
  // Process overdue and contract reminders
  for (const reminder of allReminders) {
    console.log(`Processing reminder: ${reminder.message}`)
    
    // Send email reminder
    await sendEmailReminderWithResend(reminder)
    
    // Send push notification
    await sendPushNotification(reminder)
    
    // Send browser notification
    await sendBrowserNotification(reminder)
    
    // Mark as sent
    reminder.status = 'sent'
  }
  
  // Process scheduled follow-ups
  for (const followup of scheduledFollowups) {
    console.log(`📅 Scheduled follow-up due: ${followup.message}`)
    await sendScheduledFollowupEmail(followup)
    
    // Mark as sent
    followup.status = 'sent'
    
    // Update localStorage only on client-side
    if (typeof window !== 'undefined') {
      const existing = JSON.parse(localStorage.getItem('scheduledFollowups') || '[]')
      const updated = existing.map((f: any) => 
        f.id === followup.id ? { ...f, status: 'sent' } : f
      )
      localStorage.setItem('scheduledFollowups', JSON.stringify(updated))
    }
  }
  
  console.log(`✅ Processed ${allReminders.length} reminders and ${scheduledFollowups.length} follow-ups`)
}

// Schedule a reminder for later
export function scheduleReminder(
  userId: string,
  contactId: string,
  contactName: string,
  message: string,
  delayHours: number = 1
): void {
  // Only work on client-side
  if (typeof window === 'undefined') {
    console.log('scheduleReminder called on server-side, skipping')
    return
  }
  
  const reminder = {
    id: `scheduled_${Date.now()}`,
    userId,
    contactId,
    contactName,
    scheduledFor: new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString(),
    message,
    status: 'pending'
  }
  
  const existing = JSON.parse(localStorage.getItem('scheduledFollowups') || '[]')
  localStorage.setItem('scheduledFollowups', JSON.stringify([...existing, reminder]))
  
  console.log(`📅 Scheduled reminder for ${contactName} in ${delayHours} hour(s)`)
}

// Create a communication contract
export function createCommunicationContract(
  userId: string,
  contactId: string,
  contactName: string,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
  timeOfDay: string = '09:00',
  daysOfWeek: number[] = [1, 2, 3, 4, 5]
): void {
  // Only work on client-side
  if (typeof window === 'undefined') {
    console.log('createCommunicationContract called on server-side, skipping')
    return
  }
  
  const now = new Date()
  const nextCheckin = calculateNextCheckin(now, frequency, timeOfDay, daysOfWeek)
  
  const contract = {
    id: `contract_${Date.now()}`,
    userId,
    contactId,
    contactName,
    frequency,
    timeOfDay,
    daysOfWeek,
    lastCheckin: now.toISOString(),
    nextCheckin: nextCheckin.toISOString(),
    status: 'active'
  }
  
  const existing = JSON.parse(localStorage.getItem('communicationContracts') || '[]')
  localStorage.setItem('communicationContracts', JSON.stringify([...existing, contract]))
  
  console.log(`📋 Created communication contract with ${contactName} (${frequency})`)
}

// Calculate next check-in date based on frequency
function calculateNextCheckin(
  fromDate: Date,
  frequency: string,
  timeOfDay: string,
  daysOfWeek: number[]
): Date {
  const next = new Date(fromDate)
  const [hours, minutes] = timeOfDay.split(':').map(Number)
  
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
  }
  
  next.setHours(hours, minutes, 0, 0)
  return next
}

import { db } from './firebase'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { ReminderNotification } from './notifications'

export interface FirestoreReminder {
  id?: string
  userId: string
  contactId: string
  contactName: string
  message: string
  type: 'overdue' | 'question' | 'scheduled' | 'urgent'
  priority: 'high' | 'medium' | 'low'
  createdAt: Timestamp
  scheduledFor?: Timestamp
  sentAt?: Timestamp
  status: 'pending' | 'sent' | 'dismissed'
}

// Convert ReminderNotification to Firestore format
const toFirestore = (reminder: ReminderNotification, userId: string): Omit<FirestoreReminder, 'id'> => {
  const firestoreReminder: Omit<FirestoreReminder, 'id'> = {
    userId,
    contactId: reminder.contactId,
    contactName: reminder.contactName,
    message: reminder.message,
    type: reminder.type,
    priority: reminder.priority,
    createdAt: Timestamp.fromDate(reminder.createdAt),
    status: reminder.status
  }

  // Only add scheduledFor if it exists
  if (reminder.scheduledFor) {
    firestoreReminder.scheduledFor = Timestamp.fromDate(reminder.scheduledFor)
  }

  // Only add sentAt if it exists
  if (reminder.sentAt) {
    firestoreReminder.sentAt = Timestamp.fromDate(reminder.sentAt)
  }

  return firestoreReminder
}

// Convert Firestore format to ReminderNotification
const fromFirestore = (doc: any): ReminderNotification => ({
  id: doc.id,
  contactId: doc.contactId,
  contactName: doc.contactName,
  message: doc.message,
  type: doc.type,
  priority: doc.priority,
  createdAt: doc.createdAt.toDate(),
  scheduledFor: doc.scheduledFor?.toDate(),
  sentAt: doc.sentAt?.toDate(),
  status: doc.status
})

export class ReminderService {
  private static instance: ReminderService

  static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService()
    }
    return ReminderService.instance
  }

  async createReminder(reminder: ReminderNotification, userId: string): Promise<string> {
    try {
      console.log('Creating reminder:', { reminder, userId })
      const firestoreReminder = toFirestore(reminder, userId)
      console.log('Firestore reminder data:', firestoreReminder)
      const docRef = await addDoc(collection(db, 'reminders'), firestoreReminder)
      console.log('Reminder created with ID:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('Error creating reminder:', error)
      throw error
    }
  }

  async getReminders(userId: string): Promise<ReminderNotification[]> {
    try {
      const q = query(
        collection(db, 'reminders'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Error fetching reminders:', error)
      return []
    }
  }

  async updateReminder(reminderId: string, updates: Partial<ReminderNotification>): Promise<void> {
    try {
      const docRef = doc(db, 'reminders', reminderId)
      const firestoreUpdates: any = {}
      
      if (updates.status) firestoreUpdates.status = updates.status
      if (updates.sentAt) firestoreUpdates.sentAt = Timestamp.fromDate(updates.sentAt)
      if (updates.scheduledFor) firestoreUpdates.scheduledFor = Timestamp.fromDate(updates.scheduledFor)
      
      await updateDoc(docRef, firestoreUpdates)
    } catch (error) {
      console.error('Error updating reminder:', error)
      throw error
    }
  }

  async deleteReminder(reminderId: string): Promise<void> {
    try {
      const docRef = doc(db, 'reminders', reminderId)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error deleting reminder:', error)
      throw error
    }
  }

  async clearAllReminders(userId: string): Promise<void> {
    try {
      const q = query(collection(db, 'reminders'), where('userId', '==', userId))
      const querySnapshot = await getDocs(q)
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
    } catch (error) {
      console.error('Error clearing all reminders:', error)
      throw error
    }
  }

  async getPendingReminders(userId: string): Promise<ReminderNotification[]> {
    try {
      const q = query(
        collection(db, 'reminders'),
        where('userId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Error fetching pending reminders:', error)
      return []
    }
  }
} 