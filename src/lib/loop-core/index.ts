// Loop Core - Main Orchestrator
// Integrates all modular systems into a cohesive communication assistant

import { PlatformManager, PlatformAdapter, PlatformMessage } from '../platforms'
import { ConversationMemoryManager, OpenLoop, Question } from '../conversation-memory'
import { EmotionalIntelligenceAnalyzer, EmotionalProfile } from '../emotional-intelligence'
import { TeamCommunicationManager, TeamMessage } from '../team-features'

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
    emotionalIntelligence: boolean
    conversationMemory: boolean
    teamFeatures: boolean
  }
}

export interface LoopInsight {
  id: string
  type: 'reminder' | 'relationship' | 'team' | 'communication'
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
  private emotionalAnalyzer: EmotionalIntelligenceAnalyzer
  private teamManager: TeamCommunicationManager
  private config: LoopConfig
  private insights: LoopInsight[] = []
  private isRunning = false
  
  constructor(config: LoopConfig) {
    this.config = config
    this.platformManager = new PlatformManager()
    this.memoryManager = new ConversationMemoryManager()
    this.emotionalAnalyzer = new EmotionalIntelligenceAnalyzer()
    this.teamManager = new TeamCommunicationManager()
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
      
      // Analyze emotional intelligence
      if (this.config.analysis.emotionalIntelligence) {
        await this.emotionalAnalyzer.analyzeMessage(
          message.contactId,
          message.content,
          message.timestamp
        )
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
    
    // Get emotional intelligence insights
    if (this.config.analysis.emotionalIntelligence) {
      const profiles = await this.emotionalAnalyzer.getAllProfiles()
      
      profiles.forEach(profile => {
        if (profile.relationshipHealth.overallScore < 40) {
          allInsights.push({
            id: `relationship_${profile.contactId}`,
            type: 'relationship',
            title: 'Relationship Needs Attention',
            description: `Relationship health score: ${profile.relationshipHealth.overallScore}/100`,
            priority: 'medium',
            actionable: true,
            data: { contactId: profile.contactId, healthScore: profile.relationshipHealth.overallScore },
            timestamp: profile.lastAnalysis
          })
        }
      })
    }
    
    // Get team insights
    if (this.config.analysis.teamFeatures) {
      const teamHealth = await this.teamManager.getTeamHealth()
      
      if (teamHealth.overallScore < 50) {
        allInsights.push({
          id: 'team_health',
          type: 'team',
          title: 'Team Communication Health',
          description: `Team health score: ${teamHealth.overallScore}/100`,
          priority: 'medium',
          actionable: true,
          data: { teamHealth },
          timestamp: new Date()
        })
      }
    }
    
    // Sort by priority and timestamp
    return allInsights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.timestamp.getTime() - a.timestamp.getTime()
    })
  }
  
  // Get dashboard data
  async getDashboardData(): Promise<{
    openLoops: OpenLoop[]
    pendingQuestions: Question[]
    emotionalProfiles: EmotionalProfile[]
    teamHealth: any
    insights: LoopInsight[]
  }> {
    const [
      openLoops,
      pendingQuestions,
      emotionalProfiles,
      teamHealth,
      insights
    ] = await Promise.all([
      this.memoryManager.getOpenLoops(),
      this.memoryManager.getPendingQuestions(),
      this.emotionalAnalyzer.getAllProfiles(),
      this.teamManager.getTeamHealth(),
      this.getInsights()
    ])
    
    return {
      openLoops,
      pendingQuestions,
      emotionalProfiles,
      teamHealth,
      insights
    }
  }
  
  // Register platform adapter
  registerPlatform(adapter: PlatformAdapter): void {
    this.platformManager.registerAdapter(adapter)
  }
  
  // Generate insights from message
  private async generateInsights(message: PlatformMessage): Promise<void> {
    // Check for urgent keywords
    const urgentWords = ['urgent', 'asap', 'emergency', 'deadline', 'important']
    const hasUrgentWords = urgentWords.some(word => 
      message.content.toLowerCase().includes(word)
    )
    
    if (hasUrgentWords) {
      this.insights.push({
        id: `urgent_${message.id}`,
        type: 'reminder',
        title: 'Urgent Message Detected',
        description: `Message contains urgent keywords: "${message.content.substring(0, 100)}..."`,
        priority: 'high',
        actionable: true,
        data: { messageId: message.id, contactId: message.contactId },
        timestamp: message.timestamp
      })
    }
    
    // Check for questions
    if (message.content.includes('?')) {
      this.insights.push({
        id: `question_${message.id}`,
        type: 'reminder',
        title: 'Question Asked',
        description: `Question detected: "${message.content.substring(0, 100)}..."`,
        priority: 'medium',
        actionable: true,
        data: { messageId: message.id, contactId: message.contactId },
        timestamp: message.timestamp
      })
    }
    
    // Keep only recent insights (last 100)
    if (this.insights.length > 100) {
      this.insights = this.insights.slice(-100)
    }
  }
  
  // Start periodic analysis
  private startPeriodicAnalysis(): void {
    setInterval(async () => {
      if (!this.isRunning) return
      
      try {
        // Run periodic analysis every 5 minutes
        console.log('🔄 Running periodic analysis...')
        
        // Get all insights
        const insights = await this.getInsights()
        
        // Process high priority insights
        const highPriorityInsights = insights.filter(insight => insight.priority === 'high')
        
        if (highPriorityInsights.length > 0) {
          console.log(`⚠️ Found ${highPriorityInsights.length} high priority insights`)
          // Here you would trigger notifications or other actions
        }
        
      } catch (error) {
        console.error('Error in periodic analysis:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes
  }
} 