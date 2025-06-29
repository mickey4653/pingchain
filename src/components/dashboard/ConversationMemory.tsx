"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Brain, Clock, TrendingUp, TrendingDown, MessageSquare, Calendar, Target, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react'
import { ConversationMemory, MemoryEntry, MemoryAnalysis, MemoryInsight } from '@/lib/conversation-memory/types'

interface ConversationMemoryProps {
  contactId?: string
  loading?: boolean
}

export function ConversationMemory({ contactId, loading = false }: ConversationMemoryProps) {
  const [memory, setMemory] = useState<ConversationMemory | null>(null)
  const [analysis, setAnalysis] = useState<MemoryAnalysis | null>(null)
  const [insights, setInsights] = useState<MemoryInsight[]>([])
  const [selectedEntry, setSelectedEntry] = useState<MemoryEntry | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (contactId) {
      loadMemoryData()
    }
  }, [contactId])

  const loadMemoryData = async () => {
    if (!contactId) return
    
    setIsLoading(true)
    try {
      // Load memory
      const memoryResponse = await fetch(`/api/memory/store?contactId=${contactId}`)
      if (memoryResponse.ok) {
        const memoryData = await memoryResponse.json()
        setMemory(memoryData.memory)
      }

      // Load analysis
      const analysisResponse = await fetch(`/api/memory/analyze?contactId=${contactId}&type=analysis`)
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json()
        setAnalysis(analysisData.analysis)
      }

      // Load insights
      const insightsResponse = await fetch(`/api/memory/analyze?contactId=${contactId}&type=insights`)
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json()
        setInsights(insightsData.insights)
      }
    } catch (error) {
      console.error('Error loading memory data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'risk': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'trend': return <TrendingUp className="h-4 w-4 text-blue-600" />
      case 'pattern': return <Lightbulb className="h-4 w-4 text-yellow-600" />
      default: return <Brain className="h-4 w-4 text-gray-600" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'bg-green-100 text-green-800'
      case 'risk': return 'bg-red-100 text-red-800'
      case 'trend': return 'bg-blue-100 text-blue-800'
      case 'pattern': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600'
      case 'negative': return 'text-red-600'
      case 'neutral': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Conversation Memory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading conversation memory...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!contactId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Conversation Memory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a contact to view conversation memory.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Memory Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Memory Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memory ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{memory.entries.length}</div>
                <div className="text-sm text-muted-foreground">Total Memories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{memory.contextSummary.relationshipStrength}%</div>
                <div className="text-sm text-muted-foreground">Relationship Strength</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{memory.contextSummary.keyTopics.length}</div>
                <div className="text-sm text-muted-foreground">Key Topics</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{memory.contextSummary.pendingItems.length}</div>
                <div className="text-sm text-muted-foreground">Pending Items</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No memory data available for this contact.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Interaction Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Interactions</span>
                    <span className="text-sm font-medium">{analysis.totalInteractions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Response Time</span>
                    <span className="text-sm font-medium">{analysis.averageResponseTime.toFixed(1)} hours</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Top Topics</h4>
                <div className="space-y-2">
                  {analysis.topTopics.slice(0, 5).map((topic) => (
                    <div key={topic.topic} className="flex justify-between">
                      <span className="text-sm">{topic.topic}</span>
                      <Badge variant="outline" className="text-xs">{topic.frequency}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {analysis.relationshipMilestones.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Relationship Milestones</h4>
                <div className="space-y-2">
                  {analysis.relationshipMilestones.slice(0, 5).map((milestone, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{milestone.date.toLocaleDateString()}</span>
                      <span>{milestone.milestone}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.title} className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    {getInsightIcon(insight.type)}
                    <h4 className="font-medium">{insight.title}</h4>
                    <Badge className={getInsightColor(insight.type)}>
                      {insight.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(insight.confidence * 100)}% confidence
                    </Badge>
                    {insight.actionable && (
                      <Badge variant="outline" className="text-xs">
                        Actionable
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{insight.timestamp.toLocaleDateString()}</span>
                    <span>{insight.relatedMemories.length} related memories</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Memory Entries */}
      {memory && memory.entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Memories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {memory.entries.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedEntry?.id === entry.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {entry.timestamp.toLocaleString()}
                        </span>
                        {entry.sentiment && (
                          <Badge className={getSentimentColor(entry.sentiment)}>
                            {entry.sentiment}
                          </Badge>
                        )}
                        {entry.urgency && (
                          <Badge className={getUrgencyColor(entry.urgency)}>
                            {entry.urgency}
                          </Badge>
                        )}
                        {entry.category && (
                          <Badge variant="outline">
                            {entry.category}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm mb-2">{entry.content}</p>
                      
                      {entry.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {entry.topics.slice(0, 3).map((topic) => (
                            <Badge key={topic} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                          {entry.topics.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{entry.topics.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {entry.responseQuality && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Quality:</span>
                          <Progress value={entry.responseQuality * 100} className="w-16 h-1" />
                          <span>{Math.round(entry.responseQuality * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Entry Details */}
      {selectedEntry && (
        <Card>
          <CardHeader>
            <CardTitle>Memory Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Content</h4>
                <p className="text-sm text-muted-foreground">{selectedEntry.content}</p>
              </div>
              
              {selectedEntry.context && (
                <div>
                  <h4 className="font-medium mb-2">Context</h4>
                  <p className="text-sm text-muted-foreground">{selectedEntry.context}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Metadata</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timestamp</span>
                      <span>{selectedEntry.timestamp.toLocaleString()}</span>
                    </div>
                    {selectedEntry.emotionalContext && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Emotional Context</span>
                        <span>{selectedEntry.emotionalContext}</span>
                      </div>
                    )}
                    {selectedEntry.communicationStyle && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Communication Style</span>
                        <span>{selectedEntry.communicationStyle}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Topics</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedEntry.topics.map((topic) => (
                      <Badge key={topic} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {selectedEntry.actionItems && selectedEntry.actionItems.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Action Items</h4>
                  <div className="space-y-1">
                    {selectedEntry.actionItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 