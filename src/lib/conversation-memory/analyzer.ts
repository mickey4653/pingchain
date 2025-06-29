import { MemoryEntry, MemoryAnalysis, MemoryInsight, ContextSummary } from './types'
import { MemoryStore } from './memory-store'

export class MemoryAnalyzer {
  private memoryStore: MemoryStore

  constructor() {
    this.memoryStore = MemoryStore.getInstance()
  }

  /**
   * Analyze conversation patterns and generate insights
   */
  async analyzeConversation(
    userId: string,
    contactId: string
  ): Promise<MemoryAnalysis> {
    const memory = await this.memoryStore.getMemory(userId, contactId)
    const entries = memory.entries

    if (entries.length === 0) {
      return {
        totalInteractions: 0,
        averageResponseTime: 0,
        topTopics: [],
        emotionalTrends: [],
        communicationEvolution: [],
        relationshipMilestones: []
      }
    }

    return {
      totalInteractions: entries.length,
      averageResponseTime: this.calculateAverageResponseTime(entries),
      topTopics: this.analyzeTopTopics(entries),
      emotionalTrends: this.analyzeEmotionalTrends(entries),
      communicationEvolution: this.analyzeCommunicationEvolution(entries),
      relationshipMilestones: this.identifyMilestones(entries)
    }
  }

  /**
   * Generate insights from conversation memory
   */
  async generateInsights(
    userId: string,
    contactId: string
  ): Promise<MemoryInsight[]> {
    const memory = await this.memoryStore.getMemory(userId, contactId)
    const entries = memory.entries
    const insights: MemoryInsight[] = []

    if (entries.length < 3) {
      return insights
    }

    // Analyze response patterns
    const responseInsight = this.analyzeResponsePatterns(entries)
    if (responseInsight) insights.push(responseInsight)

    // Analyze topic evolution
    const topicInsight = this.analyzeTopicEvolution(entries)
    if (topicInsight) insights.push(topicInsight)

    // Analyze emotional patterns
    const emotionalInsight = this.analyzeEmotionalPatterns(entries)
    if (emotionalInsight) insights.push(emotionalInsight)

    // Analyze communication style changes
    const styleInsight = this.analyzeStyleChanges(entries)
    if (styleInsight) insights.push(styleInsight)

    // Identify opportunities
    const opportunityInsight = this.identifyOpportunities(entries)
    if (opportunityInsight) insights.push(opportunityInsight)

    // Identify risks
    const riskInsight = this.identifyRisks(entries)
    if (riskInsight) insights.push(riskInsight)

    return insights.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Calculate average response time between messages
   */
  private calculateAverageResponseTime(entries: MemoryEntry[]): number {
    if (entries.length < 2) return 0

    let totalTime = 0
    let responseCount = 0

    for (let i = 1; i < entries.length; i++) {
      const timeDiff = entries[i - 1].timestamp.getTime() - entries[i].timestamp.getTime()
      if (timeDiff > 0 && timeDiff < 7 * 24 * 60 * 60 * 1000) { // Less than 7 days
        totalTime += timeDiff
        responseCount++
      }
    }

    return responseCount > 0 ? totalTime / responseCount / (1000 * 60 * 60) : 0 // Return in hours
  }

  /**
   * Analyze top topics from conversations
   */
  private analyzeTopTopics(entries: MemoryEntry[]): Array<{ topic: string; frequency: number }> {
    const topicFrequency: { [key: string]: number } = {}

    entries.forEach(entry => {
      entry.topics.forEach(topic => {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + 1
      })
    })

    return Object.entries(topicFrequency)
      .map(([topic, frequency]) => ({ topic, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
  }

  /**
   * Analyze emotional trends over time
   */
  private analyzeEmotionalTrends(entries: MemoryEntry[]): Array<{ emotion: string; trend: 'increasing' | 'decreasing' | 'stable' }> {
    const emotions: { [key: string]: number[] } = {}

    // Group emotions by time periods
    entries.forEach(entry => {
      if (entry.emotionalContext) {
        const emotion = entry.emotionalContext.toLowerCase()
        if (!emotions[emotion]) {
          emotions[emotion] = []
        }
        emotions[emotion].push(entry.timestamp.getTime())
      }
    })

    return Object.entries(emotions)
      .map(([emotion, timestamps]) => {
        if (timestamps.length < 3) return null

        // Split into early and late periods
        const sorted = timestamps.sort((a, b) => a - b)
        const midPoint = Math.floor(sorted.length / 2)
        const earlyCount = midPoint
        const lateCount = sorted.length - midPoint

        let trend: 'increasing' | 'decreasing' | 'stable'
        if (lateCount > earlyCount * 1.5) {
          trend = 'increasing'
        } else if (earlyCount > lateCount * 1.5) {
          trend = 'decreasing'
        } else {
          trend = 'stable'
        }

        return { emotion, trend }
      })
      .filter(Boolean) as Array<{ emotion: string; trend: 'increasing' | 'decreasing' | 'stable' }>
  }

  /**
   * Analyze communication style evolution
   */
  private analyzeCommunicationEvolution(entries: MemoryEntry[]): Array<{ period: string; style: string }> {
    if (entries.length < 4) return []

    const periods = [
      { name: 'Early', start: 0, end: Math.floor(entries.length * 0.33) },
      { name: 'Middle', start: Math.floor(entries.length * 0.33), end: Math.floor(entries.length * 0.66) },
      { name: 'Recent', start: Math.floor(entries.length * 0.66), end: entries.length }
    ]

    return periods.map(period => {
      const periodEntries = entries.slice(period.start, period.end)
      const styleFrequency: { [key: string]: number } = {}

      periodEntries.forEach(entry => {
        if (entry.communicationStyle) {
          const style = entry.communicationStyle.toLowerCase()
          styleFrequency[style] = (styleFrequency[style] || 0) + 1
        }
      })

      const dominantStyle = Object.entries(styleFrequency)
        .sort(([,a], [,b]) => b - a)[0]

      return {
        period: period.name,
        style: dominantStyle ? dominantStyle[0] : 'neutral'
      }
    })
  }

  /**
   * Identify relationship milestones
   */
  private identifyMilestones(entries: MemoryEntry[]): Array<{ date: Date; milestone: string }> {
    const milestones: Array<{ date: Date; milestone: string }> = []

    // First interaction
    if (entries.length > 0) {
      milestones.push({
        date: entries[entries.length - 1].timestamp,
        milestone: 'First interaction'
      })
    }

    // Significant emotional moments
    entries.forEach(entry => {
      if (entry.emotionalContext && 
          ['excited', 'happy', 'concerned', 'frustrated'].includes(entry.emotionalContext.toLowerCase())) {
        milestones.push({
          date: entry.timestamp,
          milestone: `Emotional moment: ${entry.emotionalContext}`
        })
      }
    })

    // High-quality responses
    entries.forEach(entry => {
      if (entry.responseQuality && entry.responseQuality > 0.8) {
        milestones.push({
          date: entry.timestamp,
          milestone: 'High-quality interaction'
        })
      }
    })

    return milestones
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10) // Limit to 10 milestones
  }

  /**
   * Analyze response patterns
   */
  private analyzeResponsePatterns(entries: MemoryEntry[]): MemoryInsight | null {
    const responseTimes = []
    
    for (let i = 1; i < entries.length; i++) {
      const timeDiff = entries[i - 1].timestamp.getTime() - entries[i].timestamp.getTime()
      if (timeDiff > 0) {
        responseTimes.push(timeDiff / (1000 * 60 * 60)) // Convert to hours
      }
    }

    if (responseTimes.length === 0) return null

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    const recentAvg = responseTimes.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, responseTimes.length)

    if (recentAvg < avgResponseTime * 0.7) {
      return {
        type: 'trend',
        title: 'Improving Response Time',
        description: `Response time has improved by ${Math.round((1 - recentAvg / avgResponseTime) * 100)}% recently`,
        confidence: 0.8,
        actionable: false,
        relatedMemories: entries.slice(-5).map(e => e.id),
        timestamp: new Date()
      }
    }

    return null
  }

  /**
   * Analyze topic evolution
   */
  private analyzeTopicEvolution(entries: MemoryEntry[]): MemoryInsight | null {
    const earlyTopics = new Set(entries.slice(0, Math.floor(entries.length / 2)).flatMap(e => e.topics))
    const recentTopics = new Set(entries.slice(Math.floor(entries.length / 2)).flatMap(e => e.topics))

    const newTopics = Array.from(recentTopics).filter(topic => !earlyTopics.has(topic))
    const droppedTopics = Array.from(earlyTopics).filter(topic => !recentTopics.has(topic))

    if (newTopics.length > 2) {
      return {
        type: 'pattern',
        title: 'Expanding Conversation Topics',
        description: `Conversation has expanded to include new topics: ${newTopics.slice(0, 3).join(', ')}`,
        confidence: 0.7,
        actionable: true,
        relatedMemories: entries.slice(-3).map(e => e.id),
        timestamp: new Date()
      }
    }

    return null
  }

  /**
   * Analyze emotional patterns
   */
  private analyzeEmotionalPatterns(entries: MemoryEntry[]): MemoryInsight | null {
    const emotions = entries
      .filter(e => e.emotionalContext)
      .map(e => e.emotionalContext!.toLowerCase())

    const positiveEmotions = emotions.filter(e => ['happy', 'excited', 'positive'].includes(e))
    const negativeEmotions = emotions.filter(e => ['frustrated', 'concerned', 'negative'].includes(e))

    if (positiveEmotions.length > negativeEmotions.length * 2) {
      return {
        type: 'pattern',
        title: 'Positive Emotional Pattern',
        description: 'Conversations show predominantly positive emotions',
        confidence: 0.8,
        actionable: false,
        relatedMemories: entries.slice(-5).map(e => e.id),
        timestamp: new Date()
      }
    }

    if (negativeEmotions.length > positiveEmotions.length * 2) {
      return {
        type: 'risk',
        title: 'Negative Emotional Pattern',
        description: 'Conversations show predominantly negative emotions',
        confidence: 0.8,
        actionable: true,
        relatedMemories: entries.slice(-5).map(e => e.id),
        timestamp: new Date()
      }
    }

    return null
  }

  /**
   * Analyze communication style changes
   */
  private analyzeStyleChanges(entries: MemoryEntry[]): MemoryInsight | null {
    const styles = entries
      .filter(e => e.communicationStyle)
      .map(e => e.communicationStyle!)

    if (styles.length < 4) return null

    const earlyStyles = styles.slice(0, Math.floor(styles.length / 2))
    const recentStyles = styles.slice(Math.floor(styles.length / 2))

    const earlyFormal = earlyStyles.filter(s => s.toLowerCase().includes('formal')).length
    const recentFormal = recentStyles.filter(s => s.toLowerCase().includes('formal')).length

    if (recentFormal < earlyFormal * 0.5) {
      return {
        type: 'trend',
        title: 'Communication Becoming More Casual',
        description: 'Communication style has become more casual over time',
        confidence: 0.7,
        actionable: false,
        relatedMemories: entries.slice(-3).map(e => e.id),
        timestamp: new Date()
      }
    }

    return null
  }

  /**
   * Identify opportunities
   */
  private identifyOpportunities(entries: MemoryEntry[]): MemoryInsight | null {
    const recentEntries = entries.slice(-5)
    const highQualityEntries = recentEntries.filter(e => e.responseQuality && e.responseQuality > 0.8)

    if (highQualityEntries.length >= 3) {
      return {
        type: 'opportunity',
        title: 'High-Quality Interaction Pattern',
        description: 'Recent interactions show high quality. Consider deepening the relationship.',
        confidence: 0.9,
        actionable: true,
        relatedMemories: highQualityEntries.map(e => e.id),
        timestamp: new Date()
      }
    }

    return null
  }

  /**
   * Identify risks
   */
  private identifyRisks(entries: MemoryEntry[]): MemoryInsight | null {
    const recentEntries = entries.slice(-3)
    const lowQualityEntries = recentEntries.filter(e => e.responseQuality && e.responseQuality < 0.4)

    if (lowQualityEntries.length >= 2) {
      return {
        type: 'risk',
        title: 'Declining Interaction Quality',
        description: 'Recent interactions show declining quality. Consider addressing communication issues.',
        confidence: 0.8,
        actionable: true,
        relatedMemories: lowQualityEntries.map(e => e.id),
        timestamp: new Date()
      }
    }

    return null
  }
} 