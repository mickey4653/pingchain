'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@clerk/nextjs'
import { collection, query, where, orderBy, onSnapshot, limit, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Contact, Message, Contract } from '@/types/firebase'
import { format, differenceInHours, differenceInDays } from 'date-fns'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Flame,
  Loader2,
  MessageSquare,
  Send,
  TrendingUp,
  Users,
  Bell,
  Heart,
  TestTube
} from 'lucide-react'
import { generateMessageSuggestion } from '@/lib/openai'
import { generateSmartTemplateMessage } from '@/lib/huggingface'
import { analyzeConversation, generateContextAwareSuggestion } from '@/lib/conversation-analysis'
import { processReminders } from '@/lib/reminders'

interface LoopDashboardProps {
  userId: string
}

interface OpenLoop {
  id: string
  contact: Contact
  message: Message
  daysSinceLastMessage: number
  suggestedResponse?: string
  isGenerating?: boolean
}

interface PendingReply {
  id: string
  contact: Contact
  message: Message
  hoursSinceReceived: number
  urgency: 'high' | 'medium' | 'low'
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

export function LoopDashboard({ userId }: LoopDashboardProps) {
  const [contacts, setContacts] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [openLoops, setOpenLoops] = useState<OpenLoop[]>([])
  const [pendingReplies, setPendingReplies] = useState<PendingReply[]>([])
  const [checkInsSent, setCheckInsSent] = useState<number>(0)
  const [currentStreak, setCurrentStreak] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const { toast } = useToast()
  const toastShownRef = useRef(false)
  const [editingMessage, setEditingMessage] = useState<{id: string, content: string} | null>(null)
  const [snoozedLoops, setSnoozedLoops] = useState<Set<string>>(new Set())
  const [conversationHealth, setConversationHealth] = useState<{[contactId: string]: 'excellent' | 'good' | 'needs_attention' | 'at_risk'}>({})
  const [reminderCount, setReminderCount] = useState<number>(0)
  const [avgResponseTime, setAvgResponseTime] = useState<string>('')

  // Log component load once
  useEffect(() => {
    console.log('LoopDashboard component loaded with userId:', userId)
  }, [userId])

  // Test toast on component load (only once)
  useEffect(() => {
    if (!toastShownRef.current) {
      toast({
        title: 'Loop Dashboard Loaded',
        description: 'Dashboard is ready to track your conversations',
      })
      toastShownRef.current = true
    }
  }, [toast])

  // Fetch data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Try to load test data first
        const testContacts = localStorage.getItem('pingchain-test-contacts')
        const testMessages = localStorage.getItem('pingchain-test-messages')
        
        if (testContacts && testMessages) {
          // Use test data
          const contacts = JSON.parse(testContacts)
          const messages = JSON.parse(testMessages)
          
          setContacts(contacts)
          setMessages(messages)
          
          console.log('Loaded test data:', { contacts: contacts.length, messages: messages.length })
        } else {
          // Load real data from API
          try {
            const [contactsRes, messagesRes] = await Promise.all([
              fetch('/api/contacts'),
              fetch('/api/messages')
            ])
            
            if (contactsRes.ok) {
              const contactsData = await contactsRes.json()
              setContacts(contactsData)
            } else {
              console.error('Failed to fetch contacts:', contactsRes.status)
              setContacts([])
            }
            
            if (messagesRes.ok) {
              const messagesData = await messagesRes.json()
              setMessages(messagesData)
            } else {
              console.error('Failed to fetch messages:', messagesRes.status)
              setMessages([])
            }
          } catch (apiError) {
            console.error('API error, using empty data:', apiError)
            setContacts([])
            setMessages([])
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setContacts([])
        setMessages([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Process data whenever currentTime changes (every second)
  useEffect(() => {
    if (contacts.length === 0 || messages.length === 0) return

    const newOpenLoops: OpenLoop[] = []
    const newPendingReplies: PendingReply[] = []
    const newConversationHealth: {[contactId: string]: 'excellent' | 'good' | 'needs_attention' | 'at_risk'} = {}

    contacts.forEach(contact => {
      const contactMessages = messages.filter(m => m.contactId === contact.id)
      if (contactMessages.length === 0) return

      // Analyze conversation health
      const analysis = analyzeConversation(contactMessages, contact.id)
      newConversationHealth[contact.id] = analysis.conversationHealth

      const lastMessage = contactMessages[0]
      const secondsSinceLastMessage = (new Date().getTime() - getMessageDate(lastMessage).getTime()) / 1000
      const minutesSinceLastMessage = secondsSinceLastMessage / 60
      const daysSinceLastMessage = secondsSinceLastMessage / (24 * 60 * 60)
      
      console.log(`Contact: ${contact.name}, Seconds since last message: ${secondsSinceLastMessage}`)
      console.log(`Message status: ${lastMessage.status}, AI generated: ${lastMessage.aiGenerated}`)
      console.log(`Conversation health: ${analysis.conversationHealth}, Engagement score: ${analysis.engagementScore}`)

      // Open loops: conversations that haven't been active for 24+ hours (86400 seconds)
      if (secondsSinceLastMessage >= 86400) {
        console.log(`Adding to Open Loops: ${contact.name} (${secondsSinceLastMessage}s old)`)
        newOpenLoops.push({
          id: `${contact.id}_${lastMessage.id}`,
          contact,
          message: lastMessage,
          daysSinceLastMessage
        })
      }

      // Pending replies: messages from contacts (not from user) that need response
      // Messages where userId doesn't match the current user (meaning they're from the contact)
      if (lastMessage.userId !== userId && secondsSinceLastMessage <= 86400) { // Within 24 hours
        const urgency: 'high' | 'medium' | 'low' = 
          secondsSinceLastMessage <= 3600 ? 'high' : // Within 1 hour
          secondsSinceLastMessage <= 7200 ? 'medium' : // Within 2 hours
          'low'

        console.log(`Adding to Pending Replies: ${contact.name}, urgency: ${urgency} (${secondsSinceLastMessage}s old)`)
        newPendingReplies.push({
          id: lastMessage.id,
          contact,
          message: lastMessage,
          hoursSinceReceived: secondsSinceLastMessage / 3600, // Convert to hours for display
          urgency
        })
      }
    })

    console.log(`Final Open Loops: ${newOpenLoops.length}`)
    console.log(`Final Pending Replies: ${newPendingReplies.length}`)

    setOpenLoops(newOpenLoops)
    setPendingReplies(newPendingReplies)
    setConversationHealth(newConversationHealth)

    // Process reminders every 5 minutes
    const now = new Date()
    const lastReminderCheck = localStorage.getItem('lastReminderCheck')
    const lastCheckTime = lastReminderCheck ? new Date(lastReminderCheck) : new Date(0)
    
    if (now.getTime() - lastCheckTime.getTime() > 5 * 60 * 1000) { // 5 minutes
      processReminders(userId, newOpenLoops).then(() => {
        localStorage.setItem('lastReminderCheck', now.toISOString())
        console.log('Reminders processed')
      })
    }
  }, [contacts, messages, userId])

  // Timer effect to move messages from pending replies to open loops
  useEffect(() => {
    const timer = setInterval(() => {
      setPendingReplies(prev => {
        const now = new Date()
        const updatedReplies = prev.filter(reply => {
          const hoursSinceReceived = (now.getTime() - getMessageDate(reply.message).getTime()) / (1000 * 60 * 60)
          return hoursSinceReceived <= 24 // Keep in pending replies for 24 hours
        })
        
        // Move expired pending replies to open loops
        const expiredReplies = prev.filter(reply => {
          const hoursSinceReceived = (now.getTime() - getMessageDate(reply.message).getTime()) / (1000 * 60 * 60)
          return hoursSinceReceived > 24
        })
        
        if (expiredReplies.length > 0) {
          setOpenLoops(prev => [
            ...expiredReplies.map(reply => ({
              id: `expired_${reply.id}`,
              contact: reply.contact,
              message: reply.message,
              daysSinceLastMessage: 1
            })),
            ...prev
          ])
          
          console.log(`Moved ${expiredReplies.length} expired pending replies to open loops`)
        }
        
        return updatedReplies
      })
    }, 60000) // Check every minute
    
    return () => clearInterval(timer)
  }, [])

  const handleGenerateResponse = async (openLoop: OpenLoop) => {
    console.log('Generating response for:', openLoop.contact.name)
    
    setOpenLoops(prev => prev.map(loop => 
      loop.id === openLoop.id ? { ...loop, isGenerating: true } : loop
    ))

    try {
      // Get conversation analysis for context-aware suggestions
      const contactMessages = messages.filter(m => m.contactId === openLoop.contact.id)
      const analysis = analyzeConversation(contactMessages, openLoop.contact.id)
      
      // Generate context-aware suggestion
      const contextSuggestion = generateContextAwareSuggestion(analysis, openLoop.message.content)
      console.log('Context suggestion:', contextSuggestion)
      
      // Use Hugging Face smart template system with context
      const suggestion = generateSmartTemplateMessage({
        contact: openLoop.contact.name,
        previousMessages: [openLoop.message.content],
        tone: 'friendly',
        context: contextSuggestion
      })

      console.log('Generated suggestion:', suggestion)

      setOpenLoops(prev => prev.map(loop => 
        loop.id === openLoop.id 
          ? { ...loop, suggestedResponse: suggestion, isGenerating: false }
          : loop
      ))

      toast({
        title: 'Response Generated',
        description: contextSuggestion,
      })
    } catch (error) {
      console.error('Error generating response:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate response suggestion',
        variant: 'destructive',
      })
      setOpenLoops(prev => prev.map(loop => 
        loop.id === openLoop.id ? { ...loop, isGenerating: false } : loop
      ))
    }
  }

  const handleSendMessage = async (message: string, contactId: string) => {
    console.log('Sending message:', message, 'to contact:', contactId)
    
    try {
      // Send message via API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          contactId: contactId,
          platform: 'EMAIL' // Default platform
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Message sent successfully:', result)
        
        // Remove the suggested response from the UI
        setOpenLoops(prev => prev.map(loop => 
          loop.contact.id === contactId 
            ? { ...loop, suggestedResponse: undefined }
            : loop
        ))
        
        // Refresh messages to show the new message
        const messagesRes = await fetch('/api/messages')
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json()
          setMessages(messagesData)
        }
        
        toast({
          title: 'Message Sent',
          description: 'Your message has been sent successfully',
        })
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      })
    }
  }

  const handleEditMessage = (message: string, loopId: string) => {
    console.log('Editing message:', message)
    setEditingMessage({ id: loopId, content: message })
  }

  const handleSaveEdit = (loopId: string) => {
    if (!editingMessage || editingMessage.id !== loopId) return
    
    setOpenLoops(prev => prev.map(loop => 
      loop.id === loopId 
        ? { ...loop, suggestedResponse: editingMessage.content }
        : loop
    ))
    
    setEditingMessage(null)
    toast({
      title: 'Message Edited',
      description: 'Your message has been updated',
    })
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
  }

  const handleSnoozeMessage = (contactId: string, loopId: string) => {
    console.log('Snoozing message for contact:', contactId)
    
    // Add to snoozed list
    setSnoozedLoops(prev => new Set([...prev, loopId]))
    
    // Remove from open loops
    setOpenLoops(prev => prev.filter(loop => loop.id !== loopId))
    
    // Set a reminder for 1 hour later
    setTimeout(() => {
      setSnoozedLoops(prev => {
        const newSet = new Set(prev)
        newSet.delete(loopId)
        return newSet
      })
      
      // Re-add to open loops after snooze period
      const originalLoop = contacts.find(c => c.id === contactId) && 
        messages.find(m => m.contactId === contactId)
      
      if (originalLoop) {
        setOpenLoops(prev => [...prev, {
          id: loopId,
          contact: contacts.find(c => c.id === contactId)!,
          message: messages.find(m => m.contactId === contactId)!,
          daysSinceLastMessage: 0
        }])
      }
      
      toast({
        title: 'Reminder',
        description: `Time to follow up with ${contacts.find(c => c.id === contactId)?.name}`,
      })
    }, 60 * 60 * 1000) // 1 hour
    
    toast({
      title: 'Message Snoozed',
      description: 'This conversation will be reminded in 1 hour',
    })
  }

  const handleReplyNow = (contactId: string, messageContent: string) => {
    console.log('Replying now to contact:', contactId, 'message:', messageContent)
    
    // Remove from pending replies
    setPendingReplies(prev => prev.filter(reply => reply.contact.id !== contactId))
    
    // Add to open loops as a high priority item
    const contact = contacts.find(c => c.id === contactId)
    const message = messages.find(m => m.contactId === contactId && m.userId !== userId)
    
    if (contact && message) {
      setOpenLoops(prev => [{
        id: `reply_now_${contactId}`,
        contact,
        message,
        daysSinceLastMessage: 0
      }, ...prev])
    }
    
    toast({
      title: 'Reply Mode',
      description: 'Message moved to Open Loops for immediate response',
    })
  }

  const handleRemindLater = (contactId: string) => {
    console.log('Setting reminder for contact:', contactId)
    
    // Remove from pending replies
    setPendingReplies(prev => prev.filter(reply => reply.contact.id !== contactId))
    
    // Schedule a reminder for 1 hour later
    const contact = contacts.find(c => c.id === contactId)
    const message = messages.find(m => m.contactId === contactId && m.userId !== userId)
    
    if (contact && message) {
      const reminder = {
        id: `reminder_${contactId}_${Date.now()}`,
        contactId,
        contactName: contact.name,
        message: message.content,
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        status: 'pending'
      }
      
      const existingReminders = JSON.parse(localStorage.getItem('scheduledFollowups') || '[]')
      localStorage.setItem('scheduledFollowups', JSON.stringify([...existingReminders, reminder]))
    }
    
    toast({
      title: 'Reminder Set',
      description: `You'll be reminded about ${contact?.name} in 1 hour`,
    })
  }

  const handleQuickCheckIn = () => {
    console.log('Quick Check-In clicked')
    alert('Quick Check-In clicked!') // Simple test
    toast({
      title: 'Quick Check-In',
      description: 'Navigate to Messages tab to send a check-in',
    })
  }

  const handleScheduleReminder = () => {
    console.log('Schedule Reminder clicked')
    alert('Schedule Reminder clicked!') // Simple test
    toast({
      title: 'Schedule Reminder',
      description: 'Navigate to Contacts tab to set up communication contracts',
    })
  }

  const handleViewContacts = () => {
    console.log('View Contacts clicked')
    alert('View Contacts clicked!') // Simple test
    // This would navigate to the contacts tab
    toast({
      title: 'View Contacts',
      description: 'Navigate to Contacts tab to manage your contacts',
    })
  }

  const handleQuickAction = async (action: string) => {
    console.log(`Quick action triggered: ${action}`)
    
    switch (action) {
      case 'send-reminder':
        // Send a quick check-in to all contacts with open loops
        for (const loop of openLoops.slice(0, 3)) { // Limit to 3 to avoid spam
          const message = `Hi ${loop.contact.name}! Just checking in on our conversation. How are things going?`
          await handleSendMessage(message, loop.contact.id)
        }
        toast({
          title: 'Reminders Sent',
          description: `Sent check-ins to ${Math.min(openLoops.length, 3)} contacts`,
        })
        break
        
      case 'schedule-followup':
        // Schedule follow-ups for tomorrow
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        // Store scheduled follow-ups in localStorage for now
        const scheduledFollowups = JSON.parse(localStorage.getItem('scheduledFollowups') || '[]')
        const newFollowups = openLoops.slice(0, 5).map(loop => ({
          contactId: loop.contact.id,
          contactName: loop.contact.name,
          scheduledFor: tomorrow.toISOString(),
          message: `Hi ${loop.contact.name}! Following up on our conversation.`
        }))
        
        localStorage.setItem('scheduledFollowups', JSON.stringify([...scheduledFollowups, ...newFollowups]))
        
        toast({
          title: 'Follow-ups Scheduled',
          description: `Scheduled ${newFollowups.length} follow-ups for tomorrow`,
        })
        break
        
      case 'generate-response':
        // Generate responses for all open loops
        for (const loop of openLoops.slice(0, 3)) { // Limit to 3
          const suggestion = generateSmartTemplateMessage({
            contact: loop.contact.name,
            previousMessages: [loop.message.content],
            tone: 'friendly'
          })
          
          setOpenLoops(prev => prev.map(l => 
            l.id === loop.id 
              ? { ...l, suggestedResponse: suggestion }
              : l
          ))
        }
        
        toast({
          title: 'Responses Generated',
          description: `Generated responses for ${Math.min(openLoops.length, 3)} conversations`,
        })
        break
        
      default:
        toast({
          title: 'Action Completed',
          description: `Quick action "${action}" has been completed`,
        })
    }
  }

  // Test functions - commented out for production
  /*
  const handleTestReminder = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: 'Test Contact',
          hoursSinceLastMessage: 25,
          lastMessage: 'Hey, how are things going with the project?'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Test Email Sent!",
          description: "Check your email for the test reminder.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send test email",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addTestData = () => {
    // Add test contacts
    const testContacts = [
      { id: 'john-smith', name: 'John Smith', email: 'john@example.com', phone: '+1234567890' },
      { id: 'sarah-johnson', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '+1234567891' },
      { id: 'mike-wilson', name: 'Mike Wilson', email: 'mike@example.com', phone: '+1234567892' },
      { id: 'lisa-brown', name: 'Lisa Brown', email: 'lisa@example.com', phone: '+1234567893' }
    ]

    // Add test messages with different timestamps
    const now = new Date()
    const testMessages = [
      {
        id: 'msg1',
        contactId: 'john-smith',
        content: 'Hey! How is the project coming along?',
        timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 48 hours ago
        type: 'received',
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000)
      },
      {
        id: 'msg2',
        contactId: 'sarah-johnson', 
        content: 'Thanks for the update! Looking forward to seeing the results.',
        timestamp: new Date(now.getTime() - 72 * 60 * 60 * 1000), // 72 hours ago
        type: 'received',
        createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000)
      },
      {
        id: 'msg3',
        contactId: 'mike-wilson',
        content: 'Can we schedule a call next week?',
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
        type: 'received',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      },
      {
        id: 'msg4',
        contactId: 'lisa-brown',
        content: 'The proposal looks great! Let me know when you want to discuss.',
        timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
        type: 'received',
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000)
      }
    ]

    // Store in localStorage for demo purposes
    localStorage.setItem('pingchain-test-contacts', JSON.stringify(testContacts))
    localStorage.setItem('pingchain-test-messages', JSON.stringify(testMessages))
    
    // Update state immediately
    setContacts(testContacts)
    setMessages(testMessages)
    
    toast({
      title: "Test Data Added!",
      description: "Test contacts and messages loaded successfully.",
    })
  }

  const clearTestData = () => {
    localStorage.removeItem('pingchain-test-contacts')
    localStorage.removeItem('pingchain-test-messages')
    
    // Clear state
    setContacts([])
    setMessages([])
    setOpenLoops([])
    setPendingReplies([])
    
    toast({
      title: "Test Data Cleared!",
      description: "Dashboard reset to empty state.",
    })
  }
  */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{openLoops.length}</div>
                <div className="text-sm text-muted-foreground">Open Loops</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{currentStreak}</div>
                <div className="text-sm text-muted-foreground">Current Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{checkInsSent}</div>
                <div className="text-sm text-muted-foreground">Check-Ins Sent</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{pendingReplies.length}</div>
                <div className="text-sm text-muted-foreground">Pending Replies</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Loops Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <span>Open Loops</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openLoops.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>All conversations are up to date!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {openLoops.map((loop) => {
                if (!loop || !loop.contact || !loop.message) return null
                
                return (
                  <div
                    key={loop.id}
                    className="p-4 bg-muted rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{loop.contact.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {loop.daysSinceLastMessage >= 1 
                            ? `${Math.floor(loop.daysSinceLastMessage)} days since last message`
                            : `${Math.round(loop.daysSinceLastMessage * 24)} hours since last message`
                          }
                        </div>
                        {/* Conversation Health Indicator */}
                        <div className="flex items-center space-x-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${
                            conversationHealth[loop.contact.id] === 'excellent' ? 'bg-green-500' :
                            conversationHealth[loop.contact.id] === 'good' ? 'bg-blue-500' :
                            conversationHealth[loop.contact.id] === 'needs_attention' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <span className={`text-xs font-medium ${
                            conversationHealth[loop.contact.id] === 'excellent' ? 'text-green-600' :
                            conversationHealth[loop.contact.id] === 'good' ? 'text-blue-600' :
                            conversationHealth[loop.contact.id] === 'needs_attention' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {conversationHealth[loop.contact.id]?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateResponse(loop)}
                        disabled={loop.isGenerating}
                      >
                        {loop.isGenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <MessageSquare className="w-4 h-4 mr-2" />
                        )}
                        Generate Response
                      </Button>
                    </div>

                    <div className="text-sm">
                      <div className="font-medium">Last message:</div>
                      <div className="text-muted-foreground">{loop.message.content}</div>
                    </div>

                    {loop.suggestedResponse && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Suggested response:</div>
                        {editingMessage?.id === loop.id ? (
                          <div className="space-y-2">
                            <label htmlFor={`edit-${loop.id}`} className="sr-only">Edit message</label>
                            <Textarea
                              id={`edit-${loop.id}`}
                              value={editingMessage.content}
                              onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
                              rows={3}
                              placeholder="Edit your message here..."
                            />
                            <div className="flex space-x-2">
                              <Button size="sm" onClick={() => handleSaveEdit(loop.id)}>
                                Save
                              </Button>
                              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground bg-background p-3 rounded">
                            {loop.suggestedResponse}
                          </div>
                        )}
                        {editingMessage?.id !== loop.id && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleSendMessage(loop.suggestedResponse!, loop.contact.id)}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Send
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditMessage(loop.suggestedResponse!, loop.id)}>
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleSnoozeMessage(loop.contact.id, loop.id)}>
                              Snooze
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Replies Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span>Pending Replies</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingReplies.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>No pending replies!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReplies.map((reply) => {
                if (!reply || !reply.contact || !reply.message) return null
                
                return (
                  <div
                    key={reply.id}
                    className={`p-4 rounded-lg space-y-2 ${
                      reply.urgency === 'high' ? 'bg-red-50 border border-red-200' :
                      reply.urgency === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{reply.contact.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {(() => {
                            const secondsSinceReceived = (new Date().getTime() - getMessageDate(reply.message).getTime()) / 1000
                            return `${Math.round(secondsSinceReceived)} seconds ago`
                          })()}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        reply.urgency === 'high' ? 'bg-red-100 text-red-800' :
                        reply.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {reply.urgency} priority
                      </div>
                    </div>

                    <div className="text-sm">
                      <div className="font-medium">Message:</div>
                      <div className="text-muted-foreground">{reply.message.content}</div>
                    </div>

                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => handleReplyNow(reply.contact.id, reply.message.content)}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Reply Now
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRemindLater(reply.contact.id)}>
                        <Clock className="w-4 h-4 mr-2" />
                        Remind Later
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-16 flex-col space-y-2" onClick={() => handleQuickAction('send-reminder')}>
              <MessageSquare className="w-6 h-6" />
              <span>Send Quick Check-In</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-2" onClick={() => handleQuickAction('schedule-followup')}>
              <Clock className="w-6 h-6" />
              <span>Schedule Reminder</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-2" onClick={() => handleQuickAction('generate-response')}>
              <MessageSquare className="w-6 h-6" />
              <span>Generate Response</span>
            </Button>
          </div>
          
          {/* Test Section */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">🧪 Testing Tools</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Test overdue conversation
                  const testMessage = {
                    id: 'test_overdue',
                    content: 'Test overdue message',
                    contactId: 'test_contact',
                    userId: userId,
                    status: 'SENT',
                    aiGenerated: false,
                    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
                    updatedAt: new Date()
                  }
                  console.log('Test overdue message created:', testMessage)
                  toast({
                    title: 'Test Data Created',
                    description: 'Overdue conversation test data logged to console',
                  })
                }}
              >
                Create Overdue Test
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Test scheduled follow-up
                  const testFollowup = {
                    id: 'test_followup',
                    contactId: 'test_contact',
                    contactName: 'Test Contact',
                    scheduledFor: new Date().toISOString(),
                    message: 'Test scheduled follow-up',
                    status: 'pending'
                  }
                  const existing = JSON.parse(localStorage.getItem('scheduledFollowups') || '[]')
                  localStorage.setItem('scheduledFollowups', JSON.stringify([...existing, testFollowup]))
                  toast({
                    title: 'Test Follow-up Created',
                    description: 'Scheduled follow-up added for testing',
                  })
                }}
              >
                Create Follow-up Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminders Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-orange-500" />
            <span>Reminders & Follow-ups</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Overdue Conversations */}
            {openLoops.filter(loop => {
              if (!loop || !loop.message || !loop.contact) return false
              try {
                const hoursSinceLastMessage = (new Date().getTime() - getMessageDate(loop.message).getTime()) / (1000 * 60 * 60)
                return hoursSinceLastMessage >= 24
              } catch (error) {
                console.error('Error calculating hours since last message:', error)
                return false
              }
            }).map((loop) => {
              if (!loop || !loop.contact || !loop.message) return null
              
              try {
                const hoursSince = Math.floor((new Date().getTime() - getMessageDate(loop.message).getTime()) / (1000 * 60 * 60))
                return (
                  <div key={`overdue_${loop.id}`} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-red-800">Overdue Response</div>
                        <div className="text-sm text-red-600">
                          {loop.contact.name} - {hoursSince} hours ago
                        </div>
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => handleGenerateResponse(loop)}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Respond Now
                      </Button>
                    </div>
                  </div>
                )
              } catch (error) {
                console.error('Error rendering overdue loop:', error)
                return null
              }
            })}

            {/* Scheduled Follow-ups */}
            {(() => {
              const scheduledFollowups = JSON.parse(localStorage.getItem('scheduledFollowups') || '[]')
              const dueFollowups = scheduledFollowups.filter((followup: any) => {
                if (!followup || !followup.scheduledFor) return false
                const scheduledDate = new Date(followup.scheduledFor)
                return scheduledDate <= new Date() && followup.status === 'pending'
              })
              
              return dueFollowups.map((followup: any) => {
                if (!followup || !followup.contactName) return null
                
                return (
                  <div key={followup.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-800">Scheduled Follow-up</div>
                        <div className="text-sm text-blue-600">
                          {followup.contactName} - Due now
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => {
                        const contact = contacts.find(c => c.id === followup.contactId)
                        if (contact) {
                          handleSendMessage(followup.message, followup.contactId)
                          // Mark as sent
                          const updatedFollowups = scheduledFollowups.map((f: any) => 
                            f.id === followup.id ? { ...f, status: 'sent' } : f
                          )
                          localStorage.setItem('scheduledFollowups', JSON.stringify(updatedFollowups))
                        }
                      }}>
                        <Send className="w-4 h-4 mr-2" />
                        Send Now
                      </Button>
                    </div>
                  </div>
                )
              })
            })()}

            {/* No reminders message */}
            {openLoops.filter(loop => {
              if (!loop || !loop.message || !loop.contact) return false
              try {
                const hoursSinceLastMessage = (new Date().getTime() - getMessageDate(loop.message).getTime()) / (1000 * 60 * 60)
                return hoursSinceLastMessage >= 24
              } catch (error) {
                return false
              }
            }).length === 0 && (() => {
              const scheduledFollowups = JSON.parse(localStorage.getItem('scheduledFollowups') || '[]')
              const dueFollowups = scheduledFollowups.filter((followup: any) => {
                const scheduledDate = new Date(followup.scheduledFor)
                return scheduledDate <= new Date() && followup.status === 'pending'
              })
              return dueFollowups.length === 0
            })() && (
              <div className="text-center text-muted-foreground py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p>No overdue responses or scheduled follow-ups!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversation Health Section */}
      {contacts && contacts.length > 0 && messages && messages.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Conversation Health Analysis
            </CardTitle>
            <CardDescription>
              Track engagement and response patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contacts.map((contact: any) => {
                if (!contact || !contact.name) return null
                
                const contactMessages = messages.filter((msg: any) => 
                  msg.contactId === contact.name.toLowerCase().replace(' ', '-')
                )
                const lastMessage = contactMessages[contactMessages.length - 1]
                const hoursSince = lastMessage ? 
                  (new Date().getTime() - getMessageDate(lastMessage).getTime()) / (1000 * 60 * 60) : 0
                
                let healthStatus = 'excellent'
                if (hoursSince > 72) healthStatus = 'at_risk'
                else if (hoursSince > 48) healthStatus = 'needs_attention'
                else if (hoursSince > 24) healthStatus = 'good'
                
                return (
                  <div key={contact.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{contact.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {lastMessage ? 
                          `Last message: ${hoursSince.toFixed(1)} hours ago` : 
                          'No messages yet'
                        }
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      healthStatus === 'excellent' ? 'bg-green-100 text-green-800' :
                      healthStatus === 'good' ? 'bg-blue-100 text-blue-800' :
                      healthStatus === 'needs_attention' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {healthStatus.replace('_', ' ')}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Data Section - For Testing */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Dashboard Features
          </CardTitle>
          <CardDescription>
            Add test data to see all dashboard functionality in action
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => {
              // Add test contacts
              const testContacts = [
                {
                  id: '1',
                  name: 'John Smith',
                  email: 'john@example.com',
                  phone: '+1234567890',
                  platform: 'EMAIL',
                  category: 'WORK',
                  userId: userId,
                  createdAt: new Date(),
                  updatedAt: new Date()
                },
                {
                  id: '2',
                  name: 'Sarah Johnson',
                  email: 'sarah@example.com',
                  phone: '+1234567891',
                  platform: 'WHATSAPP',
                  category: 'PERSONAL',
                  userId: userId,
                  createdAt: new Date(),
                  updatedAt: new Date()
                },
                {
                  id: '3',
                  name: 'Mike Wilson',
                  email: 'mike@example.com',
                  phone: '+1234567892',
                  platform: 'SLACK',
                  category: 'WORK',
                  userId: userId,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              ]
              
              // Add test messages with different scenarios
              const testMessages = [
                // Recent message from contact (should appear in Pending Replies)
                {
                  id: '1',
                  content: 'Hey, can we schedule a meeting for tomorrow?',
                  contactId: '1',
                  userId: 'contact_1', // Different userId = from contact
                  status: 'RECEIVED',
                  aiGenerated: false,
                  createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
                  updatedAt: new Date()
                },
                // Old message from contact (should appear in Open Loops)
                {
                  id: '2',
                  content: 'What do you think about the project proposal?',
                  contactId: '2',
                  userId: 'contact_2', // Different userId = from contact
                  status: 'RECEIVED',
                  aiGenerated: false,
                  createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
                  updatedAt: new Date()
                },
                // Very old message (should appear in Open Loops)
                {
                  id: '3',
                  content: 'Thanks for the update!',
                  contactId: '3',
                  userId: 'contact_3', // Different userId = from contact
                  status: 'RECEIVED',
                  aiGenerated: false,
                  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                  updatedAt: new Date()
                },
                // Old message from user (should appear in Open Loops)
                {
                  id: '4',
                  content: 'I sent you an email yesterday',
                  contactId: '1',
                  userId: userId, // Same userId = from user
                  status: 'SENT',
                  aiGenerated: false,
                  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                  updatedAt: new Date()
                },
                // Another recent message from contact (should appear in Pending Replies)
                {
                  id: '5',
                  content: 'Do you have time for a quick call?',
                  contactId: '2',
                  userId: 'contact_2', // Different userId = from contact
                  status: 'RECEIVED',
                  aiGenerated: false,
                  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                  updatedAt: new Date()
                },
                // Another old message from user (should appear in Open Loops)
                {
                  id: '6',
                  content: 'Let me know when you have time to discuss this',
                  contactId: '3',
                  userId: userId, // Same userId = from user
                  status: 'SENT',
                  aiGenerated: false,
                  createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
                  updatedAt: new Date()
                },
                // Recent message from user (should NOT appear in either)
                {
                  id: '7',
                  content: 'Just sent you a message',
                  contactId: '1',
                  userId: userId, // Same userId = from user
                  status: 'SENT',
                  aiGenerated: false,
                  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                  updatedAt: new Date()
                }
              ]
              
              localStorage.setItem('pingchain-test-contacts', JSON.stringify(testContacts))
              localStorage.setItem('pingchain-test-messages', JSON.stringify(testMessages))
              
              // Reload the page to refresh data
              window.location.reload()
              
              toast({
                title: 'Test Data Added',
                description: 'Sample contacts and messages loaded for testing',
              })
            }}
            variant="outline" size="sm">
              Add Test Data
            </Button>
            <Button onClick={() => {
              localStorage.removeItem('pingchain-test-contacts')
              localStorage.removeItem('pingchain-test-messages')
              localStorage.removeItem('scheduledFollowups')
              window.location.reload()
              toast({
                title: 'Test Data Cleared',
                description: 'All test data removed',
              })
            }}
            variant="outline" size="sm">
              Clear Test Data
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>• <strong>Add Test Data:</strong> Creates sample contacts and messages to test all features</p>
            <p>• <strong>Clear Test Data:</strong> Removes all test data and shows empty state</p>
            <p>• <strong>Test Scenarios:</strong> Recent messages (Pending Replies), old messages (Open Loops)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 