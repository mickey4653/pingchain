'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Brain, Send, Sparkles, Settings, Clock, Target, MessageSquare } from 'lucide-react'
import { AIResponse, AIModel } from '@/lib/ai/enhanced-ai'

interface MessageAssistantProps {
  contactId: string
  onMessageSent?: (message: string) => void
}

export function MessageAssistant({ contactId, onMessageSent }: MessageAssistantProps) {
  const [message, setMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [selectedModel, setSelectedModel] = useState('gpt-4')
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    loadAvailableModels()
  }, [])

  const loadAvailableModels = async () => {
    try {
      const response = await fetch('/api/ai/enhanced?action=models')
      if (response.ok) {
        const data = await response.json()
        setAvailableModels(data.models)
      }
    } catch (error) {
      console.error('Error loading models:', error)
    }
  }

  const generateResponse = async () => {
    if (!message.trim()) return

    setIsGenerating(true)
    setAiResponse(null)

    try {
      const response = await fetch('/api/ai/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          message,
          modelName: selectedModel
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiResponse(data.response)
      } else {
        throw new Error('Failed to generate response')
      }
    } catch (error) {
      console.error('Error generating response:', error)
      setAiResponse({
        content: 'Sorry, I encountered an error generating a response. Please try again.',
        confidence: 0,
        reasoning: 'Error occurred during generation',
        suggestedActions: [],
        emotionalContext: 'neutral',
        followUpQuestions: [],
        modelUsed: 'error',
        contextUsed: false
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const sendMessage = (content: string) => {
    if (onMessageSent) {
      onMessageSent(content)
    }
    setMessage('')
    setAiResponse(null)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100'
    if (confidence >= 0.6) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Message Assistant
          {aiResponse?.contextUsed && (
            <Badge variant="outline" className="text-xs">
              Context-Aware
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Selection */}
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">AI Model:</span>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.name} value={model.name}>
                  <div className="flex items-center gap-2">
                    <span>{model.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {model.provider}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            Advanced
          </Button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Model Capabilities</h4>
            {availableModels.find(m => m.name === selectedModel) && (
              <div className="flex flex-wrap gap-1">
                {availableModels.find(m => m.name === selectedModel)!.capabilities.map((capability) => (
                  <Badge key={capability} variant="secondary" className="text-xs">
                    {capability}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

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

        {/* Generate Button */}
        <Button
          onClick={generateResponse}
          disabled={!message.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating Response...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Response
            </>
          )}
        </Button>

        {/* AI Response */}
        {aiResponse && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">AI Response</h4>
              <div className="flex items-center gap-2">
                <Badge className={getConfidenceBgColor(aiResponse.confidence)}>
                  {Math.round(aiResponse.confidence * 100)}% confidence
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {aiResponse.modelUsed}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {/* Main Response */}
              <div className="p-3 bg-white rounded border">
                <p className="text-sm">{aiResponse.content}</p>
              </div>

              {/* Confidence Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Confidence</span>
                  <span className={getConfidenceColor(aiResponse.confidence)}>
                    {Math.round(aiResponse.confidence * 100)}%
                  </span>
                </div>
                <Progress value={aiResponse.confidence * 100} className="h-2" />
              </div>

              {/* Reasoning */}
              {aiResponse.reasoning && (
                <div className="text-xs text-muted-foreground">
                  <strong>Reasoning:</strong> {aiResponse.reasoning}
                </div>
              )}

              {/* Suggested Actions */}
              {aiResponse.suggestedActions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <Target className="h-3 w-3" />
                    Suggested Actions:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {aiResponse.suggestedActions.map((action, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up Questions */}
              {aiResponse.followUpQuestions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <MessageSquare className="h-3 w-3" />
                    Follow-up Questions:
                  </div>
                  <div className="space-y-1">
                    {aiResponse.followUpQuestions.map((question, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        • {question}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => sendMessage(aiResponse.content)}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Response
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAiResponse(null)}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMessage("Thanks for your message. I'll get back to you soon.")}
              disabled={isGenerating}
            >
              Quick Thanks
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMessage("I appreciate you reaching out. Let me follow up on this.")}
              disabled={isGenerating}
            >
              Follow-up
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 