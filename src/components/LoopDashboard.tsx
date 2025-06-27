'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@clerk/nextjs'
import { collection, query, where, orderBy, onSnapshot, limit, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Contact, Message, Contract } from '@/types/firebase'
import { format, differenceInHours, differenceInDays } from 'date-fns'
import { 
  Loader2, 
  MessageSquare, 
  Clock, 
  Flame, 
  Send, 
  AlertCircle,
  CheckCircle,
  Calendar,
  TrendingUp,
  Users,
  Bell
} from 'lucide-react'
import { generateMessageSuggestion } from '@/lib/openai'
import { generateSmartTemplateMessage } from '@/lib/huggingface'

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

export function LoopDashboard({ userId }: LoopDashboardProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [openLoops, setOpenLoops] = useState<OpenLoop[]>([])
  const [pendingReplies, setPendingReplies] = useState<PendingReply[]>([])
  const [checkInsSent, setCheckInsSent] = useState<number>(0)
  const [currentStreak, setCurrentStreak] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const toastShownRef = useRef(false)
  const [editingMessage, setEditingMessage] = useState<{id: string, content: string} | null>(null)
  const [snoozedLoops, setSnoozedLoops] = useState<Set<string>>(new Set())

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
    if (!userId) return

    // Set up real-time listeners for contacts and messages
    const contactsQuery = query(
      collection(db, 'contacts'),
      where('userId', '==', userId)
    )

    const unsubscribeContacts = onSnapshot(contactsQuery, async (contactsSnapshot) => {
      const contacts = contactsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contact[]
      setContacts(contacts)

      // Get messages for all contacts
      const messagesQuery = query(
        collection(db, 'messages'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(100)
      )

      const unsubscribeMessages = onSnapshot(messagesQuery, (messagesSnapshot) => {
        const messages = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[]
        setMessages(messages)
        setCheckInsSent(messages.filter(m => m.aiGenerated).length)
        setLoading(false)
      })

      return () => unsubscribeMessages()
    })

    return () => unsubscribeContacts()
  }, [userId])

  // Process data whenever currentTime changes (every second)
  useEffect(() => {
    if (contacts.length === 0 || messages.length === 0) return

    const newOpenLoops: OpenLoop[] = []
    const newPendingReplies: PendingReply[] = []

    contacts.forEach(contact => {
      const contactMessages = messages.filter(m => m.contactId === contact.id)
      if (contactMessages.length === 0) return

      const lastMessage = contactMessages[0]
      const secondsSinceLastMessage = (new Date().getTime() - lastMessage.createdAt.toDate().getTime()) / 1000
      const minutesSinceLastMessage = secondsSinceLastMessage / 60
      const daysSinceLastMessage = secondsSinceLastMessage / (24 * 60 * 60)
      
      console.log(`Contact: ${contact.name}, Seconds since last message: ${secondsSinceLastMessage}`)
      console.log(`Message status: ${lastMessage.status}, AI generated: ${lastMessage.aiGenerated}`)

      // Open loops: conversations that haven't been active for 10+ seconds
      if (secondsSinceLastMessage >= 10) {
        console.log(`Adding to Open Loops: ${contact.name} (${secondsSinceLastMessage}s old)`)
        newOpenLoops.push({
          id: `${contact.id}_${lastMessage.id}`,
          contact,
          message: lastMessage,
          daysSinceLastMessage
        })
      }

      // Pending replies: messages received in last 60 seconds that need response
      if (lastMessage.status === 'SENT' && !lastMessage.aiGenerated) {
        if (secondsSinceLastMessage <= 60) { // 60 seconds
          const urgency: 'high' | 'medium' | 'low' = 
            secondsSinceLastMessage <= 30 ? 'high' : // 30 seconds
            secondsSinceLastMessage <= 45 ? 'medium' : // 45 seconds
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
      }
    })

    console.log(`Final Open Loops: ${newOpenLoops.length}`)
    console.log(`Final Pending Replies: ${newPendingReplies.length}`)

    setOpenLoops(newOpenLoops)
    setPendingReplies(newPendingReplies)
  }, [contacts, messages])

  const handleGenerateResponse = async (openLoop: OpenLoop) => {
    console.log('Generating response for:', openLoop.contact.name)
    
    setOpenLoops(prev => prev.map(loop => 
      loop.id === openLoop.id ? { ...loop, isGenerating: true } : loop
    ))

    try {
      // Use Hugging Face smart template system (free and reliable)
      const suggestion = generateSmartTemplateMessage({
        contact: openLoop.contact.name,
        previousMessages: [openLoop.message.content],
        tone: 'friendly'
      })

      console.log('Generated suggestion:', suggestion)

      setOpenLoops(prev => prev.map(loop => 
        loop.id === openLoop.id 
          ? { ...loop, suggestedResponse: suggestion, isGenerating: false }
          : loop
      ))

      toast({
        title: 'Response Generated',
        description: 'AI has suggested a follow-up message',
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
      // Add message to Firebase
      const messageRef = collection(db, 'messages')
      const newMessage = {
        content: message,
        contactId: contactId,
        userId: userId,
        status: 'SENT',
        aiGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await addDoc(messageRef, newMessage)
      
      // Remove the suggested response from the UI
      setOpenLoops(prev => prev.map(loop => 
        loop.contact.id === contactId 
          ? { ...loop, suggestedResponse: undefined }
          : loop
      ))
      
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent successfully',
      })
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
    toast({
      title: 'Reply Mode',
      description: 'Opening reply interface for this message',
    })
  }

  const handleRemindLater = (contactId: string) => {
    console.log('Setting reminder for contact:', contactId)
    toast({
      title: 'Reminder Set',
      description: 'You will be reminded about this message later',
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
              {openLoops.map((loop) => (
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
              ))}
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
              {pendingReplies.map((reply) => (
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
                          const secondsSinceReceived = (new Date().getTime() - reply.message.createdAt.toDate().getTime()) / 1000
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
              ))}
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
              <Calendar className="w-6 h-6" />
              <span>Schedule Reminder</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-2" onClick={() => handleQuickAction('generate-response')}>
              <MessageSquare className="w-6 h-6" />
              <span>Generate Response</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 