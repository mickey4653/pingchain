"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Brain, TrendingUp, TrendingDown, Clock, Target, MessageSquare, Settings, BarChart3 } from 'lucide-react'
import { AIModel } from '@/lib/ai/enhanced-ai'

interface AIUsageStats {
  totalRequests: number
  successfulRequests: number
  averageResponseTime: number
  modelUsage: { [key: string]: number }
  contextUsageRate: number
  averageConfidence: number
  topUseCases: Array<{ useCase: string; count: number }>
  recentActivity: Array<{
    timestamp: Date
    model: string
    confidence: number
    contextUsed: boolean
    contactId: string
  }>
}

interface AIAnalyticsProps {
  loading?: boolean
}

export function AIAnalytics({ loading = false }: AIAnalyticsProps) {
  const [stats, setStats] = useState<AIUsageStats | null>(null)
  const [models, setModels] = useState<AIModel[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d')

  useEffect(() => {
    loadAIData()
  }, [selectedTimeframe])

  const loadAIData = async () => {
    try {
      // Load available models
      const modelsResponse = await fetch('/api/ai/enhanced?action=models')
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json()
        setModels(modelsData.models)
      }

      // Load usage stats (mock data for now)
      const mockStats: AIUsageStats = {
        totalRequests: 156,
        successfulRequests: 142,
        averageResponseTime: 2.3,
        modelUsage: {
          'gpt-4': 45,
          'claude-3-sonnet': 38,
          'gpt-3.5-turbo': 73
        },
        contextUsageRate: 0.89,
        averageConfidence: 0.82,
        topUseCases: [
          { useCase: 'Response Generation', count: 89 },
          { useCase: 'Follow-up Messages', count: 34 },
          { useCase: 'Meeting Scheduling', count: 23 },
          { useCase: 'Question Answering', count: 10 }
        ],
        recentActivity: [
          {
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            model: 'gpt-4',
            confidence: 0.92,
            contextUsed: true,
            contactId: 'contact-123'
          },
          {
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            model: 'claude-3-sonnet',
            confidence: 0.88,
            contextUsed: true,
            contactId: 'contact-456'
          },
          {
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            model: 'gpt-3.5-turbo',
            confidence: 0.75,
            contextUsed: false,
            contactId: 'contact-789'
          }
        ]
      }
      setStats(mockStats)
    } catch (error) {
      console.error('Error loading AI data:', error)
    }
  }

  const getSuccessRate = () => {
    if (!stats) return 0
    return (stats.successfulRequests / stats.totalRequests) * 100
  }

  const getModelUsagePercentage = (modelName: string) => {
    if (!stats) return 0
    const total = Object.values(stats.modelUsage).reduce((sum, count) => sum + count, 0)
    return (stats.modelUsage[modelName] / total) * 100
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading AI analytics...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalRequests}</div>
                <div className="text-sm text-muted-foreground">Total Requests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{getSuccessRate().toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.averageResponseTime}s</div>
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{(stats.averageConfidence * 100).toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Avg Confidence</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No AI usage data available.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Model Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {stats && models.length > 0 ? (
            <div className="space-y-4">
              {models.map((model) => (
                <div key={model.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {model.provider}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        ${model.costPerToken.toFixed(6)}/token
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stats.modelUsage[model.name] || 0} requests
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Usage</span>
                      <span>{getModelUsagePercentage(model.name).toFixed(1)}%</span>
                    </div>
                    <Progress value={getModelUsagePercentage(model.name)} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No model usage data available.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Context Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Context Awareness</CardTitle>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {(stats.contextUsageRate * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Context Usage Rate</div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Context-Aware Responses</span>
                  <span>{Math.round(stats.contextUsageRate * 100)}%</span>
                </div>
                <Progress value={stats.contextUsageRate * 100} className="h-2" />
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {stats.contextUsageRate > 0.8 ? (
                  <span className="text-green-600">✓ Excellent context utilization</span>
                ) : stats.contextUsageRate > 0.6 ? (
                  <span className="text-yellow-600">⚠ Good context usage</span>
                ) : (
                  <span className="text-red-600">⚠ Low context usage</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No context usage data available.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Top Use Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {stats && stats.topUseCases.length > 0 ? (
            <div className="space-y-3">
              {stats.topUseCases.map((useCase, index) => (
                <div key={useCase.useCase} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{useCase.useCase}</span>
                    {index < 3 && (
                      <Badge variant="secondary" className="text-xs">
                        Top {index + 1}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{useCase.count}</span>
                    <span className="text-xs text-muted-foreground">requests</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No use case data available.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent AI Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {stats && stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{activity.model}</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.contactId.slice(-4)}
                        </Badge>
                        {activity.contextUsed && (
                          <Badge variant="outline" className="text-xs">
                            Context
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getConfidenceBgColor(activity.confidence)}>
                      {(activity.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No recent activity available.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium text-green-800">High Success Rate</div>
                <div className="text-xs text-green-600">
                  {getSuccessRate().toFixed(1)}% of AI requests are successful
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-blue-800">Fast Response Times</div>
                <div className="text-xs text-blue-600">
                  Average response time of {stats?.averageResponseTime}s
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
              <Target className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-sm font-medium text-purple-800">High Confidence</div>
                <div className="text-xs text-purple-600">
                  Average confidence of {(stats?.averageConfidence || 0) * 100}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 