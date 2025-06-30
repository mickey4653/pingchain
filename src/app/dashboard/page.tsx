"use client"

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoopDashboard } from '@/components/LoopDashboard'
import { ContactList } from '@/components/ContactList'
import { ContractList } from '@/components/ContractList'
import { ContractForm } from '@/components/ContractForm'
import { MessageList } from '@/components/MessageList'
import { MessageAssistant } from '@/components/MessageAssistant'
import { StreakDisplay } from '@/components/StreakDisplay'
import { NotificationSettings } from '@/components/NotificationSettings'
import { MessageSquare, Heart, Clock, Settings } from 'lucide-react'
import type { Contact } from '@/types/firebase'

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const loopDashboardRef = useRef<{ refreshData: () => void }>(null);

  console.log('Dashboard page loaded, user:', user?.id, 'isSignedIn:', isSignedIn)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Manage your communication loops and relationships</p>
      </div>

      {/* Main Dashboard with Tabs */}
      <Tabs defaultValue="loop-dashboard" className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="loop-dashboard" className="flex items-center gap-2 whitespace-nowrap">
            <MessageSquare className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2 whitespace-nowrap">
            Contacts
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2 whitespace-nowrap">
            Messages
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 whitespace-nowrap">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Loop Dashboard Tab */}
        <TabsContent value="loop-dashboard" className="space-y-6">
          <LoopDashboard 
            userId={user.id} 
            ref={loopDashboardRef}
          />
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ContactList 
              userId={user.id} 
              onContactSelect={(contactId, contact) => {
                setSelectedContactId(contactId);
                setSelectedContact(contact);
              }} 
            />
            {selectedContactId && (
              <div className="space-y-6">
                <StreakDisplay userId={user.id} />
                <ContractList contactId={selectedContactId} />
                <ContractForm contactId={selectedContactId} />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          {selectedContact ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MessageList contactId={selectedContact.id} />
              <MessageAssistant 
                contactId={selectedContact.id}
                contactName={selectedContact.name}
                onMessageSent={async (messageContent) => {
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
                      // Update the LoopDashboard data instead of reloading the page
                      if (loopDashboardRef.current?.refreshData) {
                        loopDashboardRef.current.refreshData()
                      }
                      
                      // Show success message
                      console.log('Message sent successfully! Check the Overview tab to see it in Open Loops.')
                    } else {
                      throw new Error('Failed to send message')
                    }
                  } catch (error) {
                    console.error('Error sending message:', error)
                  }
                }}
              />
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <p>Select a contact from the Contacts tab to view messages</p>
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
} 