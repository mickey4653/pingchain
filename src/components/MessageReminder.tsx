'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@clerk/nextjs'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Message, Contact } from '@/types/firebase'
import { format, differenceInHours } from 'date-fns'
import { Loader2, MessageSquare, Clock } from 'lucide-react'
import { generateMessageSuggestion } from '@/lib/openai'

interface MessageReminderProps {
  contactId: string
  contact: Contact
  onSendMessage: (message: string) => void
}

interface Reminder {
  id: string
  message: Message
  hoursSinceLastMessage: number
  suggestedResponse?: string
}

export function MessageReminder({ contactId, contact, onSendMessage }: MessageReminderProps) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string>()
  const { userId } = useAuth()
  const { toast } = useToast()

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
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message))

      // Find messages that need reminders
      const now = new Date()
      const newReminders = messages
        .filter(message => {
          const hoursSinceLastMessage = differenceInHours(
            now,
            message.createdAt.toDate()
          )
          return hoursSinceLastMessage >= 24 && message.status === 'SENT'
        })
        .map(message => ({
          id: message.id,
          message,
          hoursSinceLastMessage: differenceInHours(
            now,
            message.createdAt.toDate()
          )
        }))

      setReminders(newReminders)
      setLoading(false)
    }, (error) => {
      console.error('Error listening to messages:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [userId, contactId])

  const handleGenerateResponse = async (reminder: Reminder) => {
    setGenerating(reminder.id)
    try {
      const suggestion = await generateMessageSuggestion({
        contact: contact.name,
        previousMessages: [reminder.message.content],
        tone: 'friendly'
      })
      
      setReminders(prev => prev.map(r => 
        r.id === reminder.id 
          ? { ...r, suggestedResponse: suggestion }
          : r
      ))
    } catch (error) {
      console.error('Error generating response:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate response suggestion',
        variant: 'destructive',
      })
    } finally {
      setGenerating(undefined)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Message Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (reminders.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Message Reminders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="p-4 bg-muted rounded-lg space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {reminder.hoursSinceLastMessage} hours since last message
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateResponse(reminder)}
                  disabled={!!generating}
                >
                  {generating === reminder.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <MessageSquare className="w-4 h-4 mr-2" />
                  )}
                  Suggest Response
                </Button>
              </div>
              
              <div className="text-sm">
                <div className="font-medium">Last message:</div>
                <div className="text-muted-foreground">{reminder.message.content}</div>
              </div>

              {reminder.suggestedResponse && (
                <div className="mt-2">
                  <div className="text-sm font-medium">Suggested response:</div>
                  <div className="text-sm text-muted-foreground">
                    {reminder.suggestedResponse}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => onSendMessage(reminder.suggestedResponse!)}
                  >
                    Use This Response
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 