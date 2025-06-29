"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, TrendingUp, Users, MessageSquare, Clock, Target, 
  Activity, PieChart, LineChart, Calendar, Download, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus, Zap, Database, Workflow
} from 'lucide-react'
import { AnalyticsMetrics, TimeRange } from '@/lib/advanced-features/analytics'

interface AdvancedAnalyticsProps {
  userId?: string
  loading?: boolean
}

export function AdvancedAnalytics({ userId, loading = false }: AdvancedAnalyticsProps) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [timeRange, setTimeRange] = useState('30d')
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (userId) {
      loadAnalytics()
    }
  }, [userId, timeRange])

  const loadAnalytics = async () => {
    if (!userId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/analytics?userId=${userId}&timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportReport = async () => {
    if (!metrics) return
    
    const reportData = {
      generatedAt: new Date().toISOString(),
      timeRange,
      metrics
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100'
      case 'negative': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No analytics data available</p>
            <Button onClick={loadAnalytics} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Load Data
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Advanced Analytics Dashboard
            </CardTitle>
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadAnalytics}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                <p className="text-2xl font-bold">{metrics.totalContacts}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">{metrics.totalMessages}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">{metrics.responseRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Engagement Score</p>
                <p className="text-2xl font-bold">{metrics.engagementScore.toFixed(1)}%</p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Message Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Message Activity Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.messageTrends.slice(-7).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {new Date(trend.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">Sent: {trend.sent}</span>
                        <span className="text-sm">Received: {trend.received}</span>
                        <Badge variant="secondary">
                          {trend.responseRate.toFixed(1)}% response
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Platform Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Platform Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.platformBreakdown.map((platform, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium">{platform.platform}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{platform.count}</span>
                        <span className="text-sm text-muted-foreground">
                          ({platform.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Response Time Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Response Time</span>
                  <span className="text-lg font-bold">
                    {formatTime(metrics.averageResponseTime)}
                  </span>
                </div>
                <Progress value={Math.min(metrics.averageResponseTime / (24 * 60 * 60 * 1000) * 100, 100)} />
                <p className="text-sm text-muted-foreground">
                  Target: Under 24 hours for optimal engagement
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Performing Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.topPerformingContacts.slice(0, 10).map((contact, index) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {contact.messageCount} messages
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{contact.responseRate.toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">response rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.teamPerformance.length > 0 ? (
                <div className="space-y-3">
                  {metrics.teamPerformance.map((member, index) => (
                    <div key={member.memberId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-green-600">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.messagesSent} messages sent
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{member.responseRate.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">response rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No team performance data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Workflow Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.workflowMetrics.length > 0 ? (
                <div className="space-y-3">
                  {metrics.workflowMetrics.map((workflow, index) => (
                    <div key={workflow.workflowId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium">{workflow.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {workflow.executions} executions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{workflow.successRate.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">success rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No workflow data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRM Tab */}
        <TabsContent value="crm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                CRM Integration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.crmMetrics.length > 0 ? (
                <div className="space-y-3">
                  {metrics.crmMetrics.map((crm, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{crm.crmType}</p>
                          <p className="text-sm text-muted-foreground">
                            {crm.syncedContacts} contacts synced
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={crm.syncStatus === 'success' ? 'default' : 
                                  crm.syncStatus === 'error' ? 'destructive' : 'secondary'}
                        >
                          {crm.syncStatus}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {crm.lastSync.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No CRM integrations found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Conversation Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.conversationInsights.map((insight, index) => (
              <div key={insight.contactId} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{insight.contactName}</h4>
                  <Badge className={getSentimentColor(insight.sentiment)}>
                    {insight.sentiment}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{insight.conversationCount} conversations</p>
                  <p>Avg length: {insight.averageLength.toFixed(0)} chars</p>
                  <p>Last activity: {insight.lastActivity.toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 