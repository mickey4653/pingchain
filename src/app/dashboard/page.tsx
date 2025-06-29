"use client"

import { useState, useEffect } from 'react'
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
import { EmotionalIntelligence } from '@/components/dashboard/EmotionalIntelligence'
import { TeamHealth } from '@/components/dashboard/TeamHealth'
import { ConversationMemory } from '@/components/dashboard/ConversationMemory'
import { AIAnalytics } from '@/components/dashboard/AIAnalytics'
import { ReminderManager } from '@/components/ReminderManager'
import { useNotifications } from '@/hooks/useNotifications'
import { Heart, Users, BarChart3, MessageSquare, Clock, Settings, Brain, Zap } from 'lucide-react'
import { TeamManagement } from '@/components/dashboard/TeamManagement'

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const { reminders, loading: remindersLoading } = useNotifications()

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
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="loop-dashboard" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="emotional" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Emotional IQ
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Health
          </TabsTrigger>
          <TabsTrigger value="team-management" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Management
          </TabsTrigger>
          <TabsTrigger value="memory" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Memory
          </TabsTrigger>
          <TabsTrigger value="ai-analytics" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            AI Analytics
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            Contacts
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            Messages
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Reminders
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Loop Dashboard Tab */}
        <TabsContent value="loop-dashboard" className="space-y-6">
          <LoopDashboard userId={user.id} />
        </TabsContent>

        {/* Emotional Intelligence Tab */}
        <TabsContent value="emotional" className="space-y-6">
          <EmotionalIntelligence />
        </TabsContent>

        {/* Team Health Tab */}
        <TabsContent value="team" className="space-y-6">
          <TeamHealth />
        </TabsContent>

        {/* Team Management Tab */}
        <TabsContent value="team-management" className="space-y-6">
          <TeamManagement />
        </TabsContent>

        {/* Conversation Memory Tab */}
        <TabsContent value="memory" className="space-y-6">
          <ConversationMemory contactId={selectedContactId || undefined} />
        </TabsContent>

        {/* AI Analytics Tab */}
        <TabsContent value="ai-analytics" className="space-y-6">
          <AIAnalytics />
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ContactList userId={user.id} onContactSelect={setSelectedContactId} />
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
          {selectedContactId ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MessageList contactId={selectedContactId} />
              <MessageAssistant 
                contactId={selectedContactId} 
                onMessageSent={async (messageContent) => {
                  try {
                    // Send message to Firebase
                    const response = await fetch('/api/messages', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        content: messageContent,
                        contactId: selectedContactId,
                        platform: 'EMAIL'
                      })
                    })
                    
                    if (response.ok) {
                      // Refresh the page to update the dashboard
                      window.location.reload()
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

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="space-y-6">
          <ReminderManager reminders={reminders} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
} 