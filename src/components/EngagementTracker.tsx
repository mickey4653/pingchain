'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@clerk/nextjs'
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Message, Contact } from '@/types/firebase'
import { format, differenceInDays } from 'date-fns'
import { Loader2, TrendingUp, Heart, MessageSquare } from 'lucide-react'
import { analyzeConversationContext } from '@/lib/openai'

interface EngagementTrackerProps {
  contactId: string
  contact: Contact
}

interface EngagementMetrics {
  messageFrequency: number // messages per day
  responseTime: number // average hours between messages
  sentiment: string // overall sentiment
  topics: string[] // common topics
  suggestions: string[] // improvement suggestions
}

export function EngagementTracker({ contactId, contact }: EngagementTrackerProps) {
  const [metrics, setMetrics] = useState<EngagementMetrics>()
  const [loading, setLoading] = useState(true)
  const { userId } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!userId || !contactId) return

    // Set up real-time listener for messages
    const q = query(
      collection(db, 'messages'),
      where('contactId', '==', contactId),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50) // Analyze last 50 messages
    )

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message))

      if (messages.length === 0) {
        setLoading(false)
        return
      }

      try {
        // Calculate basic metrics
        const now = new Date()
        const oldestMessage = messages[messages.length - 1].createdAt.toDate()
        const daysSinceFirstMessage = differenceInDays(now, oldestMessage)
        const messageFrequency = messages.length / Math.max(daysSinceFirstMessage, 1)

        // Calculate average response time
        let totalResponseTime = 0
        let responseCount = 0
        for (let i = 1; i < messages.length; i++) {
          const timeDiff = messages[i - 1].createdAt.toDate().getTime() - messages[i].createdAt.toDate().getTime()
          if (timeDiff < 24 * 60 * 60 * 1000) { // Only count responses within 24 hours
            totalResponseTime += timeDiff
            responseCount++
          }
        }
        const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount / (60 * 60 * 1000) : 0

        // Analyze conversation context
        const analysis = await analyzeConversationContext(
          messages.map(m => m.content)
        )

        setMetrics({
          messageFrequency,
          responseTime: averageResponseTime,
          sentiment: analysis.sentiment,
          topics: analysis.topics,
          suggestions: analysis.actionItems
        })
      } catch (error) {
        console.error('Error analyzing engagement:', error)
        toast({
          title: 'Error',
          description: 'Failed to analyze conversation patterns',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }, (error) => {
      console.error('Error listening to messages:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [userId, contactId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Engagement Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Message Frequency */}
          <div className="flex items-center space-x-4">
            <MessageSquare className="w-6 h-6 text-primary" />
            <div>
              <div className="font-medium">Message Frequency</div>
              <div className="text-sm text-muted-foreground">
                {metrics.messageFrequency.toFixed(1)} messages per day
              </div>
            </div>
          </div>

          {/* Response Time */}
          <div className="flex items-center space-x-4">
            <TrendingUp className="w-6 h-6 text-primary" />
            <div>
              <div className="font-medium">Average Response Time</div>
              <div className="text-sm text-muted-foreground">
                {metrics.responseTime.toFixed(1)} hours
              </div>
            </div>
          </div>

          {/* Sentiment */}
          <div className="flex items-center space-x-4">
            <Heart className="w-6 h-6 text-primary" />
            <div>
              <div className="font-medium">Conversation Sentiment</div>
              <div className="text-sm text-muted-foreground">
                {metrics.sentiment}
              </div>
            </div>
          </div>

          {/* Topics */}
          {metrics.topics.length > 0 && (
            <div>
              <div className="font-medium mb-2">Common Topics</div>
              <div className="flex flex-wrap gap-2">
                {metrics.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-muted rounded-full text-sm"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {metrics.suggestions.length > 0 && (
            <div>
              <div className="font-medium mb-2">Suggestions</div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {metrics.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 