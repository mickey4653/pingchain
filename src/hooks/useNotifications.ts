import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { 
  NotificationOrchestrator, 
  NotificationConfig, 
  ReminderNotification,
  QuestionDetector 
} from '@/lib/notifications'
import { ReminderService } from '@/lib/reminders'

export function useNotifications() {
  const { userId } = useAuth()
  const [orchestrator, setOrchestrator] = useState<NotificationOrchestrator | null>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [userSettings, setUserSettings] = useState<NotificationConfig | null>(null)
  const [reminders, setReminders] = useState<ReminderNotification[]>([])
  const [loading, setLoading] = useState(true)

  // Load user settings from localStorage
  useEffect(() => {
    const loadUserSettings = () => {
      const savedSettings = localStorage.getItem('notificationSettings')
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        setUserSettings({
          browser: settings.browser || true,
          email: settings.email || false,
          emailProvider: settings.emailProvider || 'resend',
          userEmail: settings.userEmail || '',
          overdueThreshold: settings.overdueThreshold || 24,
          questionThreshold: settings.questionThreshold || 12,
          scheduledReminders: settings.scheduledReminders || true,
          highPriorityOnly: settings.highPriorityOnly || false
        })
      } else {
        // Default settings
        setUserSettings({
          browser: true,
          email: false,
          emailProvider: 'resend',
          userEmail: '',
          overdueThreshold: 24,
          questionThreshold: 12,
          scheduledReminders: true,
          highPriorityOnly: false
        })
      }
    }

    loadUserSettings()
  }, [])

  // Initialize notification system with user settings
  useEffect(() => {
    if (!userId || !userSettings) return

    const config: NotificationConfig = {
      browser: userSettings.browser,
      email: userSettings.email,
      emailProvider: userSettings.emailProvider,
      userEmail: userSettings.userEmail
    }

    const notificationOrchestrator = new NotificationOrchestrator(config)
    setOrchestrator(notificationOrchestrator)

    // Request browser notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setPermissionGranted(true)
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setPermissionGranted(permission === 'granted')
        })
      }
    }
  }, [userId, userSettings])

  // Load reminders from Firestore
  useEffect(() => {
    if (!userId) return

    const loadReminders = async () => {
      try {
        setLoading(true)
        const reminderService = ReminderService.getInstance()
        const userReminders = await reminderService.getReminders(userId)
        setReminders(userReminders)
      } catch (error) {
        console.error('Error loading reminders:', error)
        // Don't throw error, just log it and continue with empty reminders
        setReminders([])
      } finally {
        setLoading(false)
      }
    }

    loadReminders()
  }, [userId])

  // Create a reminder with Firestore persistence
  const createReminder = useCallback(async (
    contactId: string,
    contactName: string,
    message: string,
    type: ReminderNotification['type'] = 'overdue',
    priority: ReminderNotification['priority'] = 'medium',
    scheduledFor?: Date
  ): Promise<string | null> => {
    if (!orchestrator || !userId) return null

    // Check if we already have a similar reminder for this contact and type
    const existingReminder = reminders.find(
      r => r.contactId === contactId && r.type === type && r.status === 'pending'
    )
    
    if (existingReminder) {
      console.log(`Reminder already exists for ${contactName} (${type})`)
      return existingReminder.id
    }

    // Ensure scheduledFor is in the future for scheduled reminders
    let finalScheduledFor = scheduledFor
    if (type === 'scheduled') {
      const now = new Date()
      if (!scheduledFor || scheduledFor.getTime() <= now.getTime()) {
        // If no scheduledFor or it's in the past, set it to 1 hour from now
        finalScheduledFor = new Date(now.getTime() + 60 * 60 * 1000)
      }
    }

    // Generate a more unique ID
    const uniqueId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${contactId}_${type}`

    try {
      const reminder: ReminderNotification = {
        id: uniqueId,
        contactId,
        contactName,
        message,
        type,
        priority,
        createdAt: new Date(),
        scheduledFor: finalScheduledFor,
        status: 'pending'
      }

      // Save to Firestore
      const reminderService = ReminderService.getInstance()
      const firestoreId = await reminderService.createReminder(reminder, userId)
      
      // Update reminder with Firestore ID
      const savedReminder = { ...reminder, id: firestoreId }
      
      // Add to local state
      setReminders(prev => [savedReminder, ...prev])
      
      // Schedule the reminder
      orchestrator.getScheduler().scheduleReminder(savedReminder)
      orchestrator.getEffectivenessTracker().trackReminderSent(contactId)
      
      return firestoreId
    } catch (error) {
      console.error('Error creating reminder:', error)
      // Create a local-only reminder if Firestore fails
      const localReminder: ReminderNotification = {
        id: uniqueId,
        contactId,
        contactName,
        message,
        type,
        priority,
        createdAt: new Date(),
        scheduledFor: finalScheduledFor,
        status: 'pending'
      }
      
      // Add to local state only
      setReminders(prev => [localReminder, ...prev])
      
      return localReminder.id
    }
  }, [orchestrator, userId, reminders])

  // Update reminder status
  const updateReminder = useCallback(async (reminderId: string, updates: Partial<ReminderNotification>) => {
    try {
      const reminderService = ReminderService.getInstance()
      await reminderService.updateReminder(reminderId, updates)
      
      // Update local state
      setReminders(prev => prev.map(r => 
        r.id === reminderId ? { ...r, ...updates } : r
      ))
    } catch (error) {
      console.error('Error updating reminder:', error)
    }
  }, [])

  // Delete reminder
  const deleteReminder = useCallback(async (reminderId: string) => {
    try {
      const reminderService = ReminderService.getInstance()
      await reminderService.deleteReminder(reminderId)
      
      // Remove from local state
      setReminders(prev => prev.filter(r => r.id !== reminderId))
    } catch (error) {
      console.error('Error deleting reminder:', error)
    }
  }, [])

  // Clear all reminders
  const clearAllReminders = useCallback(async () => {
    try {
      const reminderService = ReminderService.getInstance()
      await reminderService.clearAllReminders(userId!)
      
      // Clear local state
      setReminders([])
    } catch (error) {
      console.error('Error clearing reminders:', error)
    }
  }, [userId])

  // Detect unanswered questions in messages
  const detectQuestions = useCallback((messages: string[]): string[] => {
    return QuestionDetector.extractQuestions(messages)
  }, [])

  // Get effectiveness stats for a contact
  const getEffectivenessStats = useCallback((contactId: string) => {
    if (!orchestrator) return null
    return orchestrator.getEffectivenessStats(contactId)
  }, [orchestrator])

  // Create overdue conversation reminder
  const createOverdueReminder = useCallback(async (
    contactId: string,
    contactName: string,
    lastMessage: string,
    hoursSinceLastMessage: number
  ): Promise<string | null> => {
    const message = `You haven't responded to ${contactName} in ${hoursSinceLastMessage} hours. Last message: "${lastMessage}"`
    
    const priority: ReminderNotification['priority'] = 
      hoursSinceLastMessage >= 72 ? 'high' : 
      hoursSinceLastMessage >= 48 ? 'medium' : 'low'

    return createReminder(contactId, contactName, message, 'overdue', priority)
  }, [createReminder])

  // Create question reminder
  const createQuestionReminder = useCallback(async (
    contactId: string,
    contactName: string,
    question: string
  ): Promise<string | null> => {
    const message = `${contactName} asked: "${question}" - You haven't responded yet.`
    return createReminder(contactId, contactName, message, 'question', 'high')
  }, [createReminder])

  // Create scheduled check-in reminder
  const createScheduledReminder = useCallback(async (
    contactId: string,
    contactName: string,
    scheduledFor: Date,
    message?: string
  ): Promise<string | null> => {
    const defaultMessage = `Scheduled check-in with ${contactName}`
    return createReminder(
      contactId, 
      contactName, 
      message || defaultMessage, 
      'scheduled', 
      'medium', 
      scheduledFor
    )
  }, [createReminder])

  return {
    createReminder,
    createOverdueReminder,
    createQuestionReminder,
    createScheduledReminder,
    updateReminder,
    deleteReminder,
    clearAllReminders,
    detectQuestions,
    getEffectivenessStats,
    permissionGranted,
    isReady: !!orchestrator,
    reminders,
    loading,
    userSettings
  }
} 