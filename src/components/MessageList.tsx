'use client';

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@clerk/nextjs'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Message } from '@/types/firebase'
import { format } from 'date-fns'

interface MessageListProps {
  contactId: string
}

export function MessageList({ contactId }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const { userId } = useAuth()

  useEffect(() => {
    if (!userId || !contactId) return

    // Set up real-time listener for messages
    const q = query(
      collection(db, 'messages'),
      where('contactId', '==', contactId),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message))
      setMessages(newMessages)
      setLoading(false)
    }, (error) => {
      console.error('Error listening to messages:', error)
      setLoading(false)
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [userId, contactId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-4 rounded-lg ${
                message.aiGenerated ? 'bg-muted' : 'bg-primary text-primary-foreground'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium">
                  {message.aiGenerated ? 'AI Assistant' : 'You'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(message.createdAt.toDate(), 'MMM d, h:mm a')}
                </div>
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.tone && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Tone: {message.tone}
                </div>
              )}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              No messages yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 