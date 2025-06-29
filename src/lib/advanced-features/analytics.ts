import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'

export interface AnalyticsMetrics {
  totalContacts: number
  totalMessages: number
  responseRate: number
  averageResponseTime: number
  engagementScore: number
  topPerformingContacts: Array<{
    id: string
    name: string
    messageCount: number
    responseRate: number
    lastContact: Date
  }>
  messageTrends: Array<{
    date: string
    sent: number
    received: number
    responseRate: number
  }>
  platformBreakdown: Array<{
    platform: string
    count: number
    percentage: number
  }>
  teamPerformance: Array<{
    memberId: string
    name: string
    messagesSent: number
    responseRate: number
    averageResponseTime: number
  }>
  conversationInsights: Array<{
    contactId: string
    contactName: string
    conversationCount: number
    averageLength: number
    sentiment: 'positive' | 'neutral' | 'negative'
    lastActivity: Date
  }>
  workflowMetrics: Array<{
    workflowId: string
    name: string
    executions: number
    successRate: number
    averageExecutionTime: number
  }>
  crmMetrics: Array<{
    crmType: string
    syncedContacts: number
    lastSync: Date
    syncStatus: 'success' | 'error' | 'pending'
  }>
}

export interface TimeRange {
  start: Date
  end: Date
}

export class AnalyticsService {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async getMetrics(timeRange: TimeRange): Promise<AnalyticsMetrics> {
    const [contacts, messages, teams, workflows, crmData] = await Promise.all([
      this.getContactMetrics(timeRange),
      this.getMessageMetrics(timeRange),
      this.getTeamMetrics(timeRange),
      this.getWorkflowMetrics(timeRange),
      this.getCRMMetrics(timeRange)
    ])

    return {
      totalContacts: contacts.total,
      totalMessages: messages.total,
      responseRate: messages.responseRate,
      averageResponseTime: messages.averageResponseTime,
      engagementScore: this.calculateEngagementScore(contacts, messages),
      topPerformingContacts: contacts.topPerforming,
      messageTrends: messages.trends,
      platformBreakdown: messages.platformBreakdown,
      teamPerformance: teams.performance,
      conversationInsights: messages.conversationInsights,
      workflowMetrics: workflows.metrics,
      crmMetrics: crmData.metrics
    }
  }

  private async getContactMetrics(timeRange: TimeRange) {
    const contactsRef = collection(db, 'contacts')
    const q = query(
      contactsRef,
      where('userId', '==', this.userId),
      where('createdAt', '>=', Timestamp.fromDate(timeRange.start)),
      where('createdAt', '<=', Timestamp.fromDate(timeRange.end))
    )

    const snapshot = await getDocs(q)
    const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Calculate top performing contacts based on message count and response rate
    const contactPerformance = await Promise.all(
      contacts.map(async (contact) => {
        const messagesRef = collection(db, 'messages')
        const messagesQuery = query(
          messagesRef,
          where('contactId', '==', contact.id),
          where('timestamp', '>=', Timestamp.fromDate(timeRange.start)),
          where('timestamp', '<=', Timestamp.fromDate(timeRange.end))
        )
        const messagesSnapshot = await getDocs(messagesQuery)
        const contactMessages = messagesSnapshot.docs.map(doc => doc.data())

        const sentMessages = contactMessages.filter(m => m.senderId === this.userId)
        const receivedMessages = contactMessages.filter(m => m.senderId !== this.userId)
        const responseRate = sentMessages.length > 0 ? (receivedMessages.length / sentMessages.length) * 100 : 0

        return {
          id: contact.id,
          name: contact.name || contact.email,
          messageCount: contactMessages.length,
          responseRate,
          lastContact: contactMessages.length > 0 ? contactMessages[contactMessages.length - 1].timestamp.toDate() : new Date()
        }
      })
    )

    return {
      total: contacts.length,
      topPerforming: contactPerformance
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 10)
    }
  }

  private async getMessageMetrics(timeRange: TimeRange) {
    const messagesRef = collection(db, 'messages')
    const q = query(
      messagesRef,
      where('userId', '==', this.userId),
      where('timestamp', '>=', Timestamp.fromDate(timeRange.start)),
      where('timestamp', '<=', Timestamp.fromDate(timeRange.end)),
      orderBy('timestamp', 'desc')
    )

    const snapshot = await getDocs(q)
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    const sentMessages = messages.filter(m => m.senderId === this.userId)
    const receivedMessages = messages.filter(m => m.senderId !== this.userId)
    const responseRate = sentMessages.length > 0 ? (receivedMessages.length / sentMessages.length) * 100 : 0

    // Calculate average response time
    const responseTimes: number[] = []
    for (const sent of sentMessages) {
      const responses = receivedMessages.filter(r => 
        r.contactId === sent.contactId && 
        r.timestamp.toDate() > sent.timestamp.toDate()
      )
      if (responses.length > 0) {
        const firstResponse = responses.reduce((earliest, current) => 
          current.timestamp.toDate() < earliest.timestamp.toDate() ? current : earliest
        )
        const responseTime = firstResponse.timestamp.toDate().getTime() - sent.timestamp.toDate().getTime()
        responseTimes.push(responseTime)
      }
    }
    const averageResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0

    // Generate trends data
    const trends = this.generateTrends(messages, timeRange)

    // Platform breakdown
    const platformCounts = messages.reduce((acc, message) => {
      const platform = message.platform || 'unknown'
      acc[platform] = (acc[platform] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalMessages = messages.length
    const platformBreakdown = Object.entries(platformCounts).map(([platform, count]) => ({
      platform,
      count,
      percentage: (count / totalMessages) * 100
    }))

    // Conversation insights
    const conversationInsights = await this.generateConversationInsights(messages)

    return {
      total: messages.length,
      responseRate,
      averageResponseTime,
      trends,
      platformBreakdown,
      conversationInsights
    }
  }

  private async getTeamMetrics(timeRange: TimeRange) {
    // Get team members and their performance
    const teamsRef = collection(db, 'teams')
    const teamsQuery = query(teamsRef, where('members', 'array-contains', this.userId))
    const teamsSnapshot = await getDocs(teamsQuery)
    
    const teamPerformance: Array<{
      memberId: string
      name: string
      messagesSent: number
      responseRate: number
      averageResponseTime: number
    }> = []

    for (const teamDoc of teamsSnapshot.docs) {
      const team = teamDoc.data()
      for (const memberId of team.members || []) {
        if (memberId !== this.userId) {
          const messagesRef = collection(db, 'messages')
          const memberMessagesQuery = query(
            messagesRef,
            where('userId', '==', memberId),
            where('timestamp', '>=', Timestamp.fromDate(timeRange.start)),
            where('timestamp', '<=', Timestamp.fromDate(timeRange.end))
          )
          const memberMessagesSnapshot = await getDocs(memberMessagesQuery)
          const memberMessages = memberMessagesSnapshot.docs.map(doc => doc.data())

          const sentMessages = memberMessages.filter(m => m.senderId === memberId)
          const receivedMessages = memberMessages.filter(m => m.senderId !== memberId)
          const responseRate = sentMessages.length > 0 ? (receivedMessages.length / sentMessages.length) * 100 : 0

          teamPerformance.push({
            memberId,
            name: `Team Member ${memberId.slice(0, 8)}`,
            messagesSent: sentMessages.length,
            responseRate,
            averageResponseTime: 0 // Simplified for now
          })
        }
      }
    }

    return { performance: teamPerformance }
  }

  private async getWorkflowMetrics(timeRange: TimeRange) {
    const workflowsRef = collection(db, 'workflows')
    const workflowsQuery = query(
      workflowsRef,
      where('userId', '==', this.userId),
      where('createdAt', '>=', Timestamp.fromDate(timeRange.start))
    )
    const workflowsSnapshot = await getDocs(workflowsQuery)
    const workflows = workflowsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    const workflowMetrics = await Promise.all(
      workflows.map(async (workflow) => {
        const executionsRef = collection(db, 'workflow_executions')
        const executionsQuery = query(
          executionsRef,
          where('workflowId', '==', workflow.id),
          where('executedAt', '>=', Timestamp.fromDate(timeRange.start)),
          where('executedAt', '<=', Timestamp.fromDate(timeRange.end))
        )
        const executionsSnapshot = await getDocs(executionsQuery)
        const executions = executionsSnapshot.docs.map(doc => doc.data())

        const successfulExecutions = executions.filter(e => e.status === 'completed')
        const successRate = executions.length > 0 ? (successfulExecutions.length / executions.length) * 100 : 0

        return {
          workflowId: workflow.id,
          name: workflow.name,
          executions: executions.length,
          successRate,
          averageExecutionTime: 0 // Simplified for now
        }
      })
    )

    return { metrics: workflowMetrics }
  }

  private async getCRMMetrics(timeRange: TimeRange) {
    const crmConnectionsRef = collection(db, 'crm_connections')
    const crmQuery = query(crmConnectionsRef, where('userId', '==', this.userId))
    const crmSnapshot = await getDocs(crmQuery)
    const crmConnections = crmSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    const crmMetrics = crmConnections.map(connection => ({
      crmType: connection.crmType,
      syncedContacts: connection.syncedContacts || 0,
      lastSync: connection.lastSync?.toDate() || new Date(),
      syncStatus: connection.syncStatus || 'pending'
    }))

    return { metrics: crmMetrics }
  }

  private calculateEngagementScore(contacts: any, messages: any): number {
    // Calculate engagement score based on multiple factors
    const contactEngagement = contacts.total > 0 ? Math.min(contacts.total / 100, 1) : 0
    const messageEngagement = messages.total > 0 ? Math.min(messages.total / 500, 1) : 0
    const responseEngagement = messages.responseRate / 100

    return ((contactEngagement + messageEngagement + responseEngagement) / 3) * 100
  }

  private generateTrends(messages: any[], timeRange: TimeRange) {
    const trends: Array<{
      date: string
      sent: number
      received: number
      responseRate: number
    }> = []

    const days = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24))
    
    for (let i = 0; i < days; i++) {
      const date = new Date(timeRange.start)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      const dayMessages = messages.filter(m => {
        const messageDate = m.timestamp.toDate().toISOString().split('T')[0]
        return messageDate === dateStr
      })

      const sent = dayMessages.filter(m => m.senderId === this.userId).length
      const received = dayMessages.filter(m => m.senderId !== this.userId).length
      const responseRate = sent > 0 ? (received / sent) * 100 : 0

      trends.push({
        date: dateStr,
        sent,
        received,
        responseRate
      })
    }

    return trends
  }

  private async generateConversationInsights(messages: any[]) {
    const contactGroups = messages.reduce((acc, message) => {
      if (!acc[message.contactId]) {
        acc[message.contactId] = []
      }
      acc[message.contactId].push(message)
      return acc
    }, {} as Record<string, any[]>)

    const insights = Object.entries(contactGroups).map(([contactId, contactMessages]) => {
      const sortedMessages = contactMessages.sort((a, b) => 
        a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime()
      )

      // Simple sentiment analysis (in a real app, this would use AI)
      const sentiment = this.analyzeSentiment(contactMessages)
      
      return {
        contactId,
        contactName: contactMessages[0]?.contactName || 'Unknown Contact',
        conversationCount: contactMessages.length,
        averageLength: contactMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / contactMessages.length,
        sentiment,
        lastActivity: sortedMessages[sortedMessages.length - 1].timestamp.toDate()
      }
    })

    return insights.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()).slice(0, 10)
  }

  private analyzeSentiment(messages: any[]): 'positive' | 'neutral' | 'negative' {
    // Simple keyword-based sentiment analysis
    const positiveWords = ['great', 'good', 'awesome', 'excellent', 'love', 'thanks', 'thank you', 'happy']
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointed', 'angry', 'frustrated']

    let positiveCount = 0
    let negativeCount = 0

    messages.forEach(message => {
      const content = (message.content || '').toLowerCase()
      positiveWords.forEach(word => {
        if (content.includes(word)) positiveCount++
      })
      negativeWords.forEach(word => {
        if (content.includes(word)) negativeCount++
      })
    })

    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }
} 