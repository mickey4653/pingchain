import { adminDb as db } from '@/lib/firebase-admin'
import { ConversationMemory, MemoryEntry, ContextSummary } from './types'

export class MemoryStore {
  private static instance: MemoryStore
  private cache: Map<string, ConversationMemory> = new Map()

  static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore()
    }
    return MemoryStore.instance
  }

  /**
   * Store a new memory entry for a conversation
   */
  async storeMemory(
    userId: string,
    contactId: string,
    entry: Omit<MemoryEntry, 'id' | 'timestamp'>
  ): Promise<string> {
    const memoryRef = db.collection('conversation_memories')
      .doc(userId)
      .collection('contacts')
      .doc(contactId)
      .collection('memories')

    const memoryEntry: MemoryEntry = {
      id: '', // Will be set by Firestore
      timestamp: new Date(),
      ...entry
    }

    const docRef = await memoryRef.add(memoryEntry)
    
    // Update cache
    const cacheKey = `${userId}:${contactId}`
    const existingMemory = this.cache.get(cacheKey)
    if (existingMemory) {
      existingMemory.entries.push({ ...memoryEntry, id: docRef.id })
      this.cache.set(cacheKey, existingMemory)
    }

    return docRef.id
  }

  /**
   * Retrieve conversation memory for a contact
   */
  async getMemory(userId: string, contactId: string): Promise<ConversationMemory> {
    const cacheKey = `${userId}:${contactId}`
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    const memoryRef = db.collection('conversation_memories')
      .doc(userId)
      .collection('contacts')
      .doc(contactId)
      .collection('memories')

    const snapshot = await memoryRef
      .orderBy('timestamp', 'desc')
      .limit(100) // Limit to recent memories
      .get()

    const entries: MemoryEntry[] = []
    snapshot.forEach(doc => {
      entries.push({
        id: doc.id,
        ...doc.data()
      } as MemoryEntry)
    })

    const memory: ConversationMemory = {
      userId,
      contactId,
      entries,
      lastUpdated: new Date(),
      contextSummary: await this.generateContextSummary(entries)
    }

    // Cache the result
    this.cache.set(cacheKey, memory)
    return memory
  }

  /**
   * Search memories by content or context
   */
  async searchMemories(
    userId: string,
    contactId: string,
    query: string,
    limit: number = 10
  ): Promise<MemoryEntry[]> {
    const memory = await this.getMemory(userId, contactId)
    
    const searchTerms = query.toLowerCase().split(' ')
    
    return memory.entries
      .filter(entry => {
        const content = `${entry.content} ${entry.context} ${entry.emotionalContext} ${entry.topics.join(' ')}`.toLowerCase()
        return searchTerms.some(term => content.includes(term))
      })
      .slice(0, limit)
  }

  /**
   * Get relevant memories for a specific context
   */
  async getRelevantMemories(
    userId: string,
    contactId: string,
    context: string,
    limit: number = 5
  ): Promise<MemoryEntry[]> {
    const memory = await this.getMemory(userId, contactId)
    
    // Simple relevance scoring based on topic overlap
    const contextTopics = context.toLowerCase().split(' ')
    
    const scoredMemories = memory.entries.map(entry => {
      const entryTopics = entry.topics.map(t => t.toLowerCase())
      const overlap = contextTopics.filter(topic => 
        entryTopics.some(entryTopic => entryTopic.includes(topic) || topic.includes(entryTopic))
      ).length
      
      return {
        entry,
        score: overlap / Math.max(contextTopics.length, entryTopics.length)
      }
    })

    return scoredMemories
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.entry)
  }

  /**
   * Update context summary for a conversation
   */
  async updateContextSummary(
    userId: string,
    contactId: string
  ): Promise<ContextSummary> {
    const memory = await this.getMemory(userId, contactId)
    const summary = await this.generateContextSummary(memory.entries)
    
    // Store updated summary
    await db.collection('conversation_memories')
      .doc(userId)
      .collection('contacts')
      .doc(contactId)
      .set({
        contextSummary: summary,
        lastUpdated: new Date()
      }, { merge: true })

    // Update cache
    const cacheKey = `${userId}:${contactId}`
    if (this.cache.has(cacheKey)) {
      const cachedMemory = this.cache.get(cacheKey)!
      cachedMemory.contextSummary = summary
      this.cache.set(cacheKey, cachedMemory)
    }

    return summary
  }

  /**
   * Generate context summary from memory entries
   */
  private async generateContextSummary(entries: MemoryEntry[]): Promise<ContextSummary> {
    if (entries.length === 0) {
      return {
        keyTopics: [],
        emotionalPatterns: [],
        communicationStyle: 'neutral',
        relationshipStrength: 50,
        lastInteraction: null,
        pendingItems: []
      }
    }

    // Analyze recent entries (last 20)
    const recentEntries = entries.slice(0, 20)
    
    // Extract key topics
    const topicFrequency: { [key: string]: number } = {}
    recentEntries.forEach(entry => {
      entry.topics.forEach(topic => {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + 1
      })
    })

    const keyTopics = Object.entries(topicFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic)

    // Analyze emotional patterns
    const emotionalPatterns = this.analyzeEmotionalPatterns(recentEntries)
    
    // Determine communication style
    const communicationStyle = this.analyzeCommunicationStyle(recentEntries)
    
    // Calculate relationship strength
    const relationshipStrength = this.calculateRelationshipStrength(recentEntries)
    
    // Get last interaction
    const lastInteraction = entries[0]?.timestamp || null
    
    // Identify pending items
    const pendingItems = this.identifyPendingItems(recentEntries)

    return {
      keyTopics,
      emotionalPatterns,
      communicationStyle,
      relationshipStrength,
      lastInteraction,
      pendingItems
    }
  }

  /**
   * Analyze emotional patterns in conversations
   */
  private analyzeEmotionalPatterns(entries: MemoryEntry[]): string[] {
    const emotions: { [key: string]: number } = {}
    
    entries.forEach(entry => {
      if (entry.emotionalContext) {
        const emotion = entry.emotionalContext.toLowerCase()
        emotions[emotion] = (emotions[emotion] || 0) + 1
      }
    })

    return Object.entries(emotions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion)
  }

  /**
   * Analyze communication style patterns
   */
  private analyzeCommunicationStyle(entries: MemoryEntry[]): string {
    const styles: { [key: string]: number } = {}
    
    entries.forEach(entry => {
      if (entry.communicationStyle) {
        const style = entry.communicationStyle.toLowerCase()
        styles[style] = (styles[style] || 0) + 1
      }
    })

    const dominantStyle = Object.entries(styles)
      .sort(([,a], [,b]) => b - a)[0]

    return dominantStyle ? dominantStyle[0] : 'neutral'
  }

  /**
   * Calculate relationship strength based on interaction patterns
   */
  private calculateRelationshipStrength(entries: MemoryEntry[]): number {
    if (entries.length === 0) return 50

    let score = 50 // Base score
    
    // Factor in interaction frequency
    const daysSinceFirst = entries.length > 0 
      ? (Date.now() - entries[entries.length - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24)
      : 0
    
    if (daysSinceFirst > 0) {
      const frequencyScore = Math.min(entries.length / daysSinceFirst * 10, 20)
      score += frequencyScore
    }
    
    // Factor in emotional engagement
    const emotionalEntries = entries.filter(e => e.emotionalContext && e.emotionalContext !== 'neutral')
    const emotionalScore = (emotionalEntries.length / entries.length) * 20
    score += emotionalScore
    
    // Factor in response quality
    const qualityEntries = entries.filter(e => e.responseQuality && e.responseQuality > 0.7)
    const qualityScore = (qualityEntries.length / entries.length) * 10
    score += qualityScore

    return Math.min(Math.max(score, 0), 100)
  }

  /**
   * Identify pending items from conversations
   */
  private identifyPendingItems(entries: MemoryEntry[]): string[] {
    const pendingItems: string[] = []
    
    entries.forEach(entry => {
      if (entry.content.toLowerCase().includes('follow up') || 
          entry.content.toLowerCase().includes('remind') ||
          entry.content.toLowerCase().includes('schedule') ||
          entry.content.toLowerCase().includes('meeting')) {
        pendingItems.push(entry.content)
      }
    })

    return pendingItems.slice(0, 3) // Limit to 3 items
  }

  /**
   * Clear cache for a specific conversation
   */
  clearCache(userId: string, contactId: string): void {
    const cacheKey = `${userId}:${contactId}`
    this.cache.delete(cacheKey)
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear()
  }
} 