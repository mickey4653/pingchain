'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { ContactList } from '@/components/ContactList'
import { MessageList } from '@/components/MessageList'
import { MessageAssistant } from '@/components/MessageAssistant'
import { MessageReminder } from '@/components/MessageReminder'
import { EngagementTracker } from '@/components/EngagementTracker'
import { ContractList } from '@/components/ContractList'
import { ContractForm } from '@/components/ContractForm'
import { StreakDisplay } from '@/components/StreakDisplay'
import type { Contact } from '@/types/firebase'
import { getContacts } from '@/lib/firebase-service'

const features = [
  {
    name: 'Smart Reminders',
    description: 'Never forget to respond to important messages with intelligent follow-up reminders.',
  },
  {
    name: 'AI Message Drafting',
    description: 'Get help crafting thoughtful responses with AI-powered message suggestions.',
  },
  {
    name: 'Communication Insights',
    description: 'Track your communication patterns and improve your relationships over time.',
  },
]

export default function Home() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const { isSignedIn, userId, getToken } = useAuth()

  useEffect(() => {
    if (!userId) return

    // Set up real-time listener for contacts
    const unsubscribe = getContacts(userId, (newContacts) => {
      setContacts(newContacts)
    })

    // Cleanup subscription on unmount
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [userId])

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              PingChain
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Never leave important conversations hanging. A smart communication assistant that helps you maintain meaningful connections.
            </p>
          </div>

          <div className="mt-12">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.name}
                  className="pt-6"
                >
                  <div className="flow-root bg-white rounded-lg px-6 pb-8">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-primary rounded-md shadow-lg">
                          {/* Icon placeholder */}
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                        {feature.name}
                      </h3>
                      <p className="mt-5 text-base text-gray-500">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Contact List */}
          <div>
            <ContactList
              userId={userId!}
              onContactSelect={(contactId) => {
                const contact = contacts.find((c: Contact) => c.id === contactId)
                setSelectedContact(contact || null)
              }}
            />
          </div>

          {/* Middle Column - Messages and Reminders */}
          <div className="space-y-8">
            {selectedContact ? (
              <>
                <MessageList contactId={selectedContact.id} />
                <MessageReminder
                  contactId={selectedContact.id}
                  contact={selectedContact}
                  onSendMessage={async (messageContent) => {
                    try {
                      // Send message to Firebase
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
                        // Message sent successfully
                      } else {
                        throw new Error('Failed to send message')
                      }
                    } catch (error) {
                      // The MessageReminder component will handle its own error display
                    }
                  }}
                />
                <MessageAssistant
                  contactId={selectedContact.id}
                  onMessageSent={async (messageContent) => {
                    try {
                      // Send message to Firebase
                      const messageData = {
                        content: messageContent,
                        contactId: selectedContact.id,
                        platform: 'EMAIL'
                      }
                      
                      // Get the auth token from Clerk
                      const token = await getToken()
                      
                      const response = await fetch('/api/messages', {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          ...(token && { 'Authorization': `Bearer ${token}` })
                        },
                        body: JSON.stringify(messageData)
                      })
                      
                      if (response.ok) {
                        // Try to refresh the page to see if data updates
                        window.location.reload()
                      } else {
                        const errorText = await response.text()
                        throw new Error(`Failed to send message: ${response.status} - ${errorText}`)
                      }
                    } catch (error) {
                      // The MessageAssistant component will show its own error toast
                    }
                  }}
                />
              </>
            ) : (
              <div className="text-center text-gray-500">
                Select a contact to start messaging
              </div>
            )}
          </div>

          {/* Right Column - Contracts and Insights */}
          <div className="space-y-8">
            {selectedContact ? (
              <>
                <StreakDisplay
                  userId={userId!}
                />
                <EngagementTracker
                  contactId={selectedContact.id}
                  contact={selectedContact}
                />
                <ContractList contactId={selectedContact.id} />
                <ContractForm contactId={selectedContact.id} />
              </>
            ) : (
              <div className="text-center text-gray-500">
                Select a contact to view insights
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
