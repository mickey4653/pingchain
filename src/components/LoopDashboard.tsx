'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Bell, TestTube } from 'lucide-react'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { OpenLoops } from '@/components/dashboard/OpenLoops'
import { Contact, Message } from '@/types/firebase'
import { 
  processDashboardData, 
  calculateStats, 
  getMessageDate,
  addTestData,
  clearTestData,
  loadTestData,
  OpenLoop
} from '@/lib/dashboard-data'
import { generateSmartTemplateMessage } from '@/lib/huggingface'
import { scheduleReminder, createCommunicationContract } from '@/lib/reminders'
import { PendingReplies } from '@/components/dashboard/PendingReplies'
import { MessageAssistant } from '@/components/MessageAssistant'

interface LoopDashboardProps {
  userId: string
}

export function LoopDashboard({ userId }: LoopDashboardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  // Refresh function to reload data
  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      const [contactsRes, messagesRes] = await Promise.all([
        fetch('/api/contacts'),
        fetch('/api/messages')
      ])
      
      let firebaseContacts: Contact[] = []
      let firebaseMessages: Message[] = []
      
      if (contactsRes.ok) {
        firebaseContacts = await contactsRes.json()
      }
      
      if (messagesRes.ok) {
        firebaseMessages = await messagesRes.json()
      }
      
      // If we have Firebase data, use it (prioritize over test data)
      if (firebaseContacts.length > 0 || firebaseMessages.length > 0) {
        setContacts(firebaseContacts)
        setMessages(firebaseMessages)
      } else {
        // Fall back to test data if no Firebase data exists
        const testData = loadTestData()
        
        if (testData.contacts.length > 0 || testData.messages.length > 0) {
          setContacts(testData.contacts)
          setMessages(testData.messages)
        } else {
          setContacts([])
          setMessages([])
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
      toast({
        title: "Error",
        description: "Failed to refresh dashboard data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Process data with useMemo to prevent infinite re-renders
  const { openLoops, pendingReplies } = useMemo(() => {
    const result = processDashboardData(contacts, messages)
    return result
  }, [contacts, messages])
  
  const stats = useMemo(() => 
    calculateStats(contacts, messages), 
    [contacts, messages]
  )

  // Load data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Always try to load from Firebase first
        const [contactsRes, messagesRes] = await Promise.all([
          fetch('/api/contacts'),
          fetch('/api/messages')
        ])
        
        let firebaseContacts: Contact[] = []
        let firebaseMessages: Message[] = []
        
        if (contactsRes.ok) {
          firebaseContacts = await contactsRes.json()
        }
        
        if (messagesRes.ok) {
          firebaseMessages = await messagesRes.json()
        }
        
        // If we have Firebase data, use it (prioritize over test data)
        if (firebaseContacts.length > 0 || firebaseMessages.length > 0) {
          setContacts(firebaseContacts)
          setMessages(firebaseMessages)
        } else {
          // Fall back to test data if no Firebase data exists
          const testData = loadTestData()
          
          if (testData.contacts.length > 0 || testData.messages.length > 0) {
            setContacts(testData.contacts)
            setMessages(testData.messages)
          } else {
            setContacts([])
            setMessages([])
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId, toast])

  // Handlers
  const handleReplyNow = (contactId: string, messageContent: string) => {
    // Find the contact for this message
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) {
      toast({
        title: "Contact Not Found",
        description: "Could not find the contact for this message.",
        variant: "destructive",
      })
      return
    }

    // Set the selected contact and open message composer
    setSelectedContact(contact)
    
    // Scroll to the message assistant section
    const messageAssistant = document.getElementById('message-assistant')
    if (messageAssistant) {
      messageAssistant.scrollIntoView({ behavior: 'smooth' })
    }
    
    toast({
      title: "Message Composer Opened",
      description: `Ready to reply to ${contact.name}`,
    })
  }

  const handleGenerateResponse = async (loop: OpenLoop) => {
    try {
      const suggestion = await generateSmartTemplateMessage({
        contact: loop.contact.name,
        previousMessages: [loop.message.content],
        tone: 'friendly'
      })
      
      // Set the selected contact and pre-fill the message
      setSelectedContact(loop.contact)
      
      // Store the generated response in localStorage for the MessageAssistant to pick up
      localStorage.setItem('generated-response', suggestion)
      
      // Scroll to the message assistant section
      const messageAssistant = document.getElementById('message-assistant')
      if (messageAssistant) {
        messageAssistant.scrollIntoView({ behavior: 'smooth' })
      }
      
      toast({
        title: "Response Generated",
        description: `Generated response for ${loop.contact.name}. You can edit it before sending.`,
        duration: 5000,
      })
    } catch (error) {
      console.error('Error generating response:', error)
      toast({
        title: "Error",
        description: "Failed to generate response.",
        variant: "destructive",
      })
    }
  }

  const handleGenerateResponseForContact = async (contact: Contact | null) => {
    if (!contact) {
      toast({
        title: "No Contact Selected",
        description: "Please select a contact first.",
        variant: "destructive",
      })
      return
    }

    try {
      const contactMessages = messages.filter(m => m.contactId === contact.id)
      const recentMessages = contactMessages.slice(-5)
      
      if (recentMessages.length === 0) {
        toast({
          title: "No Messages Found",
          description: "No recent messages found for this contact.",
          variant: "destructive",
        })
        return
      }

      const lastMessage = recentMessages[recentMessages.length - 1]
      const suggestion = await generateSmartTemplateMessage({
        contact: contact.name,
        previousMessages: recentMessages.map(m => m.content),
        tone: 'friendly'
      })
      
      toast({
        title: "Response Generated",
        description: suggestion.substring(0, 100) + "...",
      })
    } catch (error) {
      console.error('Error generating response:', error)
      toast({
        title: "Error",
        description: "Failed to generate response.",
        variant: "destructive",
      })
    }
  }

  const handleSendMessage = async (message: string, contactId: string) => {
    try {
      // If it's a quick check-in, generate a contextual message
      let messageToSend = message
      if (message === "Hi! Just checking in on our conversation.") {
        // Find the contact and their last message for context
        const contact = contacts.find(c => c.id === contactId)
        const contactMessages = messages.filter(m => m.contactId === contactId)
        const lastMessage = contactMessages[contactMessages.length - 1]
        
        if (contact && lastMessage) {
          try {
            const contextualCheckIn = await generateSmartTemplateMessage({
              contact: contact.name,
              previousMessages: [lastMessage.content],
              tone: 'friendly'
            })
            messageToSend = contextualCheckIn
          } catch (error) {
            // Fallback to original message if generation fails
            console.error('Error generating contextual check-in:', error)
          }
        }
      }
      
      // Check if we're using test data
      const testMessages = JSON.parse(localStorage.getItem('pingchain-test-messages') || '[]')
      
      if (testMessages.length > 0) {
        // We're using test data, add message to test data
        const newMessage = {
          id: `msg_${Date.now()}`,
          contactId,
          content: messageToSend,
          status: 'SENT' as any,
          aiGenerated: false,
          platform: 'EMAIL' as const,
          userId: 'user_2yZRvoAOjZEn9yJYvIMjZiG4tD6',
          createdAt: { toDate: () => new Date() } as any,
          updatedAt: { toDate: () => new Date() } as any
        }
        
        const updatedMessages = [...testMessages, newMessage]
        localStorage.setItem('pingchain-test-messages', JSON.stringify(updatedMessages))
        setMessages(updatedMessages)
        
        toast({
          title: "Message Sent",
          description: "Your message has been sent successfully.",
        })
      } else {
        // We're using real data, send to API
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: messageToSend,
            contactId,
            platform: 'EMAIL'
          })
        })

        if (response.ok) {
          // Message sent successfully, now refresh data
          await refreshData()
          
          toast({
            title: "Message Sent",
            description: "Your message has been sent successfully.",
          })
        } else {
          throw new Error('Failed to send message')
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      })
    }
  }

  const handleScheduleReminder = (contactId: string, contactName: string, message: string) => {
    try {
      // Schedule the reminder using the reminders library
      scheduleReminder(userId, contactId, contactName, message, 1)
      
      // Also add to the reminder processing queue
      const reminder = {
        id: `scheduled_${Date.now()}`,
        userId,
        contactId,
        contactName,
        scheduledFor: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        message,
        status: 'pending' as const
      }
      
      // Store in localStorage for the reminder system
      if (typeof window !== 'undefined') {
        const existing = JSON.parse(localStorage.getItem('scheduledFollowups') || '[]')
        localStorage.setItem('scheduledFollowups', JSON.stringify([...existing, reminder]))
      }
      
      toast({
        title: "Reminder Scheduled",
        description: `Reminder set for ${contactName} in 1 hour.`,
      })
    } catch (error) {
      console.error('Error scheduling reminder:', error)
      toast({
        title: "Error",
        description: "Failed to schedule reminder.",
        variant: "destructive",
      })
    }
  }

  const handleCreateContract = (contactId: string, contactName: string) => {
    createCommunicationContract(userId, contactId, contactName, 'weekly')
    toast({
      title: "Contract Created",
      description: `Weekly check-in contract created with ${contactName}.`,
    })
  }

  const handleAddTestData = () => {
    const testData = addTestData()
    setContacts(testData.contacts)
    setMessages(testData.messages)
    toast({
      title: "Test Data Added!",
      description: "Test contacts and messages loaded successfully.",
    })
  }

  const handleClearTestData = () => {
    const emptyData = clearTestData()
    setContacts(emptyData.contacts)
    setMessages(emptyData.messages)
    setSelectedContact(null)
    toast({
      title: "Test Data Cleared!",
      description: "Dashboard reset to empty state.",
    })
  }

  const handleAddRealTestData = async () => {
    try {
      const response = await fetch('/api/test-data', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          toast({
            title: "Real Test Data Added!",
            description: "Test data added to Firebase successfully.",
          })
          
          // Refresh the dashboard to load the new data
          window.location.reload()
        } else {
          toast({
            title: "Test Data Already Exists",
            description: result.message,
            variant: "destructive",
          })
        }
      } else {
        throw new Error('Failed to add test data')
      }
    } catch (error) {
      console.error('Error adding real test data:', error)
      toast({
        title: "Error",
        description: "Failed to add real test data to Firebase.",
        variant: "destructive",
      })
    }
  }

  const handleClearFirebaseData = async () => {
    try {
      const response = await fetch('/api/test-data', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Firebase Data Cleared!",
          description: `Cleared ${result.deletedContacts} contacts and ${result.deletedMessages} messages.`,
        })
        
        // Refresh the dashboard to load the empty state
        window.location.reload()
      } else {
        throw new Error('Failed to clear Firebase data')
      }
    } catch (error) {
      console.error('Error clearing Firebase data:', error)
      toast({
        title: "Error",
        description: "Failed to clear Firebase data.",
        variant: "destructive",
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
      {/* Stats Cards */}
      <StatsCards 
        openLoops={stats.openLoops}
        currentStreak={stats.currentStreak}
        checkInsSent={stats.checkInsSent}
        pendingReplies={pendingReplies}
      />

      {/* Reminder Card */}
      {pendingReplies.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-orange-900">Quick Reminder</h3>
              <p className="text-sm text-orange-700">
                You have {pendingReplies.length} message{pendingReplies.length !== 1 ? 's' : ''} waiting for a reply
              </p>
              {pendingReplies[0] && (
                <p className="text-xs text-orange-600 mt-1">
                  Most urgent: {pendingReplies[0].contact.name} ({pendingReplies[0].hoursSinceReceived}s ago)
                </p>
              )}
            </div>
            <Button
              onClick={() => {
                if (pendingReplies[0]) {
                  handleReplyNow(pendingReplies[0].contact.id, pendingReplies[0].message.content)
                }
              }}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700"
            >
              Reply Now
            </Button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions
        contacts={contacts}
        selectedContact={selectedContact}
        setSelectedContact={setSelectedContact}
        onGenerateResponse={handleGenerateResponseForContact}
        onScheduleReminder={handleScheduleReminder}
        onCreateContract={handleCreateContract}
      />

      {/* Pending Replies */}
      <PendingReplies
        pendingReplies={pendingReplies}
        onReplyNow={handleReplyNow}
        onScheduleReminder={handleScheduleReminder}
        getMessageDate={getMessageDate}
      />

      {/* Open Loops */}
      <OpenLoops
        openLoops={openLoops}
        onGenerateResponse={handleGenerateResponse}
        onSendMessage={handleSendMessage}
        getMessageDate={getMessageDate}
      />

      {/* Message Assistant for Replying */}
      {selectedContact && (
        <div id="message-assistant">
          <MessageAssistant
            contactId={selectedContact.id}
            previousMessages={messages.filter(m => m.contactId === selectedContact.id)}
            onMessageSent={async (messageContent) => {
              try {
                // Check if we're using test data
                const testContacts = JSON.parse(localStorage.getItem('pingchain-test-contacts') || '[]')
                const testMessages = JSON.parse(localStorage.getItem('pingchain-test-messages') || '[]')
                
                if (testContacts.length > 0 || testMessages.length > 0) {
                  // We're using test data, so update the test data instead of fetching from API
                  const newMessage = {
                    id: `msg_${Date.now()}`,
                    contactId: selectedContact.id,
                    content: messageContent,
                    status: 'SENT' as any,
                    aiGenerated: false,
                    platform: 'EMAIL' as const,
                    userId: 'user_2yZRvoAOjZEn9yJYvIMjZiG4tD6',
                    createdAt: { toDate: () => new Date() } as any,
                    updatedAt: { toDate: () => new Date() } as any
                  }
                  
                  // Add the new message to test data
                  const updatedTestMessages = [...testMessages, newMessage]
                  localStorage.setItem('pingchain-test-messages', JSON.stringify(updatedTestMessages))
                  
                  // Update state with new test data
                  setMessages(prevMessages => updatedTestMessages)
                  setContacts(testContacts)
                  
                  toast({
                    title: "Message Sent!",
                    description: "Your message has been sent successfully.",
                  })
                } else {
                  // We're using real data, send message to Firebase first
                  const response = await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      content: messageContent,
                      contactId: selectedContact.id,
                      platform: 'EMAIL'
                    })
                  })
                  
                  if (response.ok) {
                    // Message sent successfully, now refresh data
                    await refreshData()
                    
                    toast({
                      title: "Message Sent!",
                      description: "Your message has been sent successfully.",
                    })
                  } else {
                    throw new Error('Failed to send message')
                  }
                }
              } catch (error) {
                console.error('Error sending message:', error)
                toast({
                  title: "Error",
                  description: "Failed to send message.",
                  variant: "destructive",
                })
              }
            }}
          />
        </div>
      )}

      {/* Test Data Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Dashboard Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={handleAddTestData} variant="outline">
              Add Test Data
            </Button>
            <Button onClick={handleClearTestData} variant="outline">
              Clear Test Data
            </Button>
            <Button onClick={handleAddRealTestData} variant="outline">
              Add Real Test Data
            </Button>
            <Button onClick={handleClearFirebaseData} variant="outline">
              Clear Firebase Data
            </Button>
            <Button onClick={refreshData} variant="outline">
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 