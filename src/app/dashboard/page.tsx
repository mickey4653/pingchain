'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoopDashboard } from "@/components/LoopDashboard";
import { ContactList } from "@/components/ContactList";
import { MessageList } from "@/components/MessageList";
import { StreakDisplay } from "@/components/StreakDisplay";
import { ContractList } from "@/components/ContractList";
import { ContractForm } from "@/components/ContractForm";
import { MessageAssistant } from "@/components/MessageAssistant";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  console.log('Dashboard page loaded, user:', user?.id, 'isSignedIn:', isSignedIn)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">PingChain</h1>
          <p className="mt-2 text-lg text-gray-600">
            Never leave important conversations hanging.
          </p>
        </div>

        {/* Main Dashboard with Tabs */}
        <Tabs defaultValue="loop-dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="loop-dashboard">Loop Dashboard</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          {/* Loop Dashboard Tab */}
          <TabsContent value="loop-dashboard" className="space-y-6">
            <LoopDashboard userId={user.id} />
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
        </Tabs>
      </div>
    </div>
  );
} 