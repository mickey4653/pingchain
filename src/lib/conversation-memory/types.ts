export interface MemoryEntry {
  id: string
  timestamp: Date
  content: string
  context: string
  emotionalContext?: string
  communicationStyle?: string
  topics: string[]
  responseQuality?: number
  actionItems?: string[]
  sentiment?: 'positive' | 'negative' | 'neutral'
  urgency?: 'low' | 'medium' | 'high'
  category?: 'personal' | 'professional' | 'social'
}

export interface ContextSummary {
  keyTopics: string[]
  emotionalPatterns: string[]
  communicationStyle: string
  relationshipStrength: number
  lastInteraction: Date | null
  pendingItems: string[]
}

export interface ConversationMemory {
  userId: string
  contactId: string
  entries: MemoryEntry[]
  lastUpdated: Date
  contextSummary: ContextSummary
}

export interface MemoryQuery {
  userId: string
  contactId: string
  query?: string
  context?: string
  limit?: number
  timeRange?: {
    start: Date
    end: Date
  }
  categories?: string[]
  sentiment?: string[]
}

export interface MemoryAnalysis {
  totalInteractions: number
  averageResponseTime: number
  topTopics: Array<{ topic: string; frequency: number }>
  emotionalTrends: Array<{ emotion: string; trend: 'increasing' | 'decreasing' | 'stable' }>
  communicationEvolution: Array<{ period: string; style: string }>
  relationshipMilestones: Array<{ date: Date; milestone: string }>
}

export interface MemoryInsight {
  type: 'pattern' | 'trend' | 'opportunity' | 'risk'
  title: string
  description: string
  confidence: number
  actionable: boolean
  relatedMemories: string[]
  timestamp: Date
} 