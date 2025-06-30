'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Send, Brain } from 'lucide-react'

interface MessageAssistantProps {
  contactId: string
  contactName: string
  onMessageSent?: (message: string) => void
}

export function MessageAssistant({ contactId, contactName, onMessageSent }: MessageAssistantProps) {
  const [message, setMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiResponse, setAiResponse] = useState<string>('')

  console.log('MessageAssistant props:', { contactId, contactName })

  const generateResponse = async () => {
    setIsGenerating(true)
    setAiResponse('')

    try {
      const requestData = {
        contact: contactName || 'Contact',
        previousMessages: message.trim() ? [{ content: message, direction: 'outgoing' }] : [],
        tone: 'friendly',
        context: message.trim() ? 'Generate a helpful and professional response' : 'Generate a friendly check-in message',
        useAI: false // Use smart templates for now
      }

      console.log('Sending request to AI API:', requestData)
      console.log('Contact name being used:', contactName)

      const response = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const data = await response.json()
        setAiResponse(data.suggestion)
      } else {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(`Failed to generate response: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error generating response:', error)
      setAiResponse('Sorry, I encountered an error generating a response. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const sendMessage = (content: string) => {
    if (onMessageSent) {
      onMessageSent(content)
    }
    setMessage('')
    setAiResponse('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Message Assistant
          {contactName && (
            <Badge variant="outline" className="text-xs">
              {contactName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            rows={3}
            disabled={isGenerating}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => sendMessage(message)}
            disabled={!message.trim() || isGenerating}
            className="flex-1"
            variant="secondary"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
          
          <Button
            onClick={generateResponse}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Response
              </>
            )}
          </Button>
        </div>

        {/* AI Response */}
        {aiResponse && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">AI Response</h4>
              <Badge variant="outline" className="text-xs">
                AI Generated
              </Badge>
            </div>
            
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {aiResponse}
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => sendMessage(aiResponse)}
                className="flex-1"
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Response
              </Button>
              <Button
                variant="outline"
                onClick={() => setAiResponse('')}
                size="sm"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMessage('Hi! How are you doing?')
              }}
            >
              Check-in
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMessage('Thanks for your message! I\'ll get back to you soon.')
              }}
            >
              Quick Reply
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMessage('I appreciate you reaching out. Let\'s catch up soon!')
              }}
            >
              Friendly Response
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 