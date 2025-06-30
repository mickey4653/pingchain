// Loop Core - Main Orchestrator
// Integrates all modular systems into a cohesive communication assistant

import { PlatformManager, PlatformAdapter, PlatformMessage } from '../platforms'
import { ConversationMemoryManager, OpenLoop, Question } from '../conversation-memory'

export interface LoopConfig {
  platforms: {
    enabled: string[]
    syncInterval: number // minutes
  }
  notifications: {
    email: boolean
    browser: boolean
    reminders: boolean
  }
  analysis: {
    conversationMemory: boolean
  }
}

export interface LoopInsight {
  id: string
  type: 'reminder' | 'relationship' | 'communication'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionable: boolean
  data: Record<string, any>
  timestamp: Date
}

// Main Loop Core Class
export class LoopCore {
  private platformManager: PlatformManager
  private memoryManager: ConversationMemoryManager
  private config: LoopConfig
  private insights: LoopInsight[] = []
  private isRunning = false
  
  constructor(config: LoopConfig) {
    this.config = config
    this.platformManager = new PlatformManager()
    this.memoryManager = new ConversationMemoryManager()
  }
  
  // Initialize and start the Loop system
  async start(): Promise<void> {
    if (this.isRunning) return
    
    console.log('🚀 Starting Loop Core...')
    
    try {
      // Connect to all platforms
      await this.platformManager.connectAll()
      
      // Start platform synchronization
      if (this.config.platforms.syncInterval > 0) {
        await this.platformManager.startAllSync()
      }
      
      this.isRunning = true
      console.log('✅ Loop Core started successfully')
      
      // Start periodic analysis
      this.startPeriodicAnalysis()
      
    } catch (error) {
      console.error('❌ Failed to start Loop Core:', error)
      throw error
    }
  }
  
  // Stop the Loop system
  async stop(): Promise<void> {
    if (!this.isRunning) return
    
    console.log('🛑 Stopping Loop Core...')
    
    try {
      await this.platformManager.stopAllSync()
      this.isRunning = false
      console.log('✅ Loop Core stopped successfully')
    } catch (error) {
      console.error('❌ Error stopping Loop Core:', error)
    }
  }
  
  // Process incoming message from any platform
  async processMessage(message: PlatformMessage): Promise<void> {
    if (!this.isRunning) return
    
    try {
      // Update conversation memory
      if (this.config.analysis.conversationMemory) {
        await this.memoryManager.updateContext(message.contactId, {
          id: message.id,
          contactId: message.contactId,
          content: message.content,
          timestamp: message.timestamp,
          direction: message.direction,
          platform: message.platform
        })
      }
      
      // Generate insights
      await this.generateInsights(message)
      
    } catch (error) {
      console.error('Error processing message:', error)
    }
  }
  
  // Get all insights for dashboard
  async getInsights(): Promise<LoopInsight[]> {
    const allInsights: LoopInsight[] = []
    
    // Get conversation insights
    const openLoops = await this.memoryManager.getOpenLoops()
    const pendingQuestions = await this.memoryManager.getPendingQuestions()
    
    // Convert open loops to insights
    openLoops.forEach(loop => {
      allInsights.push({
        id: `loop_${loop.id}`,
        type: 'reminder',
        title: 'Open Loop Detected',
        description: `You haven't responded to: "${loop.content.substring(0, 100)}..."`,
        priority: loop.priority,
        actionable: true,
        data: { loopId: loop.id, contactId: loop.contactId },
        timestamp: loop.createdAt
      })
    })
    
    // Convert pending questions to insights
    pendingQuestions.forEach(question => {
      allInsights.push({
        id: `question_${question.id}`,
        type: 'reminder',
        title: 'Unanswered Question',
        description: `Question: "${question.question}"`,
        priority: question.urgency === 'urgent' ? 'high' : 'medium',
        actionable: true,
        data: { questionId: question.id, contactId: question.contactId },
        timestamp: question.askedAt
      })
    })
    
    return allInsights
  }
  
  // Get dashboard data
  async getDashboardData(): Promise<{
    openLoops: OpenLoop[]
    pendingQuestions: Question[]
    insights: LoopInsight[]
  }> {
    const [openLoops, pendingQuestions, insights] = await Promise.all([
      this.memoryManager.getOpenLoops(),
      this.memoryManager.getPendingQuestions(),
      this.getInsights()
    ])
    
    return {
      openLoops,
      pendingQuestions,
      insights
    }
  }
  
  // Register a new platform adapter
  registerPlatform(adapter: PlatformAdapter): void {
    this.platformManager.registerAdapter(adapter)
  }
  
  private async generateInsights(message: PlatformMessage): Promise<void> {
    // Generate insights based on message content and context
    const insights: LoopInsight[] = []
    
    // Check for urgent keywords
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'important']
    const hasUrgentKeywords = urgentKeywords.some(keyword => 
      message.content.toLowerCase().includes(keyword)
    )
    
    if (hasUrgentKeywords) {
      insights.push({
        id: `urgent_${message.id}`,
        type: 'reminder',
        title: 'Urgent Message Detected',
        description: 'Message contains urgent keywords',
        priority: 'high',
        actionable: true,
        data: { messageId: message.id, contactId: message.contactId },
        timestamp: message.timestamp
      })
    }
    
    // Check for questions that need responses
    if (message.content.includes('?')) {
      insights.push({
        id: `question_${message.id}`,
        type: 'reminder',
        title: 'Question Requires Response',
        description: 'Message contains a question',
        priority: 'medium',
        actionable: true,
        data: { messageId: message.id, contactId: message.contactId },
        timestamp: message.timestamp
      })
    }
    
    // Add insights to the collection
    this.insights.push(...insights)
  }
  
  private startPeriodicAnalysis(): void {
    // Run periodic analysis every 5 minutes
    setInterval(async () => {
      try {
        const insights = await this.getInsights()
        console.log(`Generated ${insights.length} insights`)
      } catch (error) {
        console.error('Error in periodic analysis:', error)
      }
    }, 5 * 60 * 1000)
  }
} 