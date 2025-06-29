'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@clerk/nextjs'
import type { Message } from '@/types/firebase'
import { Loader2, Send, Sparkles, Wand2 } from 'lucide-react'
import { analyzeTone, generateMessageSuggestion } from '@/lib/openai'

interface MessageAssistantProps {
  contactId: string
  previousMessages?: Message[]
  onMessageSent?: (messageContent: string) => void
}

export function MessageAssistant({ contactId, previousMessages = [], onMessageSent }: MessageAssistantProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [tone, setTone] = useState<string>()
  const { userId } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userId || !message.trim()) {
      return
    }

    setLoading(true)
    try {
      await onMessageSent?.(message.trim())
      
      setMessage('')
      setTone(undefined)
      
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent successfully.',
      })
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeTone = async () => {
    if (!message.trim()) return

    setIsAnalyzing(true)
    try {
      const analysis = await analyzeTone(message)
      setTone(analysis.tone)
      if (analysis.suggestions.length > 0) {
        toast({
          title: 'Tone Analysis',
          description: analysis.suggestions[0],
        })
      }
    } catch (error) {
      console.error('Error analyzing tone:', error)
      toast({
        title: 'Error',
        description: 'Failed to analyze message tone',
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSuggestMessage = async () => {
    if (!message.trim()) return

    setIsAnalyzing(true)
    try {
      const suggestion = await generateMessageSuggestion({
        contact: contactId,
        previousMessages: previousMessages.map(m => m.content),
        tone: tone || 'friendly'
      })
      setMessage(suggestion)
    } catch (error) {
      console.error('Error generating suggestion:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate message suggestion',
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Message Assistant</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[100px]"
              disabled={loading}
            />
            {tone && (
              <div className="text-sm text-muted-foreground">
                Tone: {tone}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAnalyzeTone}
                disabled={loading || !message.trim() || isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Analyze Tone
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSuggestMessage}
                disabled={loading || !message.trim() || isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Suggest
              </Button>
            </div>
            <Button 
              type="submit" 
              disabled={loading || !message.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 