// Emotional Intelligence & Relationship Health System
// Analyzes communication patterns, emotional engagement, and relationship health

export interface EmotionalProfile {
  contactId: string
  emotionalEngagement: number // 0-100
  communicationStyle: CommunicationStyle
  relationshipHealth: RelationshipHealth
  emotionalTriggers: string[]
  preferredTopics: string[]
  responsePatterns: ResponsePattern[]
  lastAnalysis: Date
}

export interface CommunicationStyle {
  formality: 'formal' | 'casual' | 'mixed'
  responsiveness: 'immediate' | 'within_hour' | 'within_day' | 'slow'
  verbosity: 'concise' | 'detailed' | 'very_detailed'
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy'
  punctuation: 'proper' | 'casual' | 'minimal'
}

export interface RelationshipHealth {
  overallScore: number // 0-100
  trustLevel: number // 0-100
  engagementLevel: number // 0-100
  communicationQuality: number // 0-100
  reciprocity: number // 0-100
  lastInteractionQuality: 'excellent' | 'good' | 'neutral' | 'poor'
  trend: 'improving' | 'stable' | 'declining'
}

export interface ResponsePattern {
  type: 'question' | 'statement' | 'reaction' | 'action'
  frequency: number
  averageResponseTime: number // minutes
  emotionalTone: 'positive' | 'neutral' | 'negative'
  engagement: 'high' | 'medium' | 'low'
}

// Emotional Intelligence Analyzer
export class EmotionalIntelligenceAnalyzer {
  private profiles: Map<string, EmotionalProfile> = new Map()
  
  async analyzeMessage(contactId: string, message: string, timestamp: Date): Promise<void> {
    let profile = this.profiles.get(contactId)
    
    if (!profile) {
      profile = this.createInitialProfile(contactId)
    }
    
    // Analyze communication style
    profile.communicationStyle = this.analyzeCommunicationStyle(message)
    
    // Update emotional engagement
    profile.emotionalEngagement = this.calculateEmotionalEngagement(message, profile)
    
    // Update relationship health
    profile.relationshipHealth = this.calculateRelationshipHealth(profile)
    
    // Extract emotional triggers and topics
    profile.emotionalTriggers = this.extractEmotionalTriggers(message)
    profile.preferredTopics = this.extractTopics(message)
    
    // Update response patterns
    this.updateResponsePatterns(profile, message, timestamp)
    
    profile.lastAnalysis = new Date()
    this.profiles.set(contactId, profile)
  }
  
  async getEmotionalProfile(contactId: string): Promise<EmotionalProfile | null> {
    return this.profiles.get(contactId) || null
  }
  
  async getAllProfiles(): Promise<EmotionalProfile[]> {
    return Array.from(this.profiles.values())
  }
  
  async getRelationshipInsights(contactId: string): Promise<string[]> {
    const profile = this.profiles.get(contactId)
    if (!profile) return []
    
    const insights: string[] = []
    
    // Engagement insights
    if (profile.emotionalEngagement < 30) {
      insights.push("Low emotional engagement detected. Consider more personal topics.")
    } else if (profile.emotionalEngagement > 80) {
      insights.push("High emotional engagement! Great relationship health.")
    }
    
    // Communication style insights
    if (profile.communicationStyle.formality === 'formal') {
      insights.push("Prefers formal communication. Maintain professional tone.")
    } else if (profile.communicationStyle.formality === 'casual') {
      insights.push("Prefers casual communication. Feel free to be more relaxed.")
    }
    
    // Response time insights
    const avgResponseTime = this.calculateAverageResponseTime(profile.responsePatterns)
    if (avgResponseTime < 5) {
      insights.push("Very responsive! They value quick communication.")
    } else if (avgResponseTime > 60) {
      insights.push("Slow responder. Be patient and don't take it personally.")
    }
    
    // Relationship health insights
    if (profile.relationshipHealth.overallScore < 40) {
      insights.push("Relationship needs attention. Consider reaching out more frequently.")
    } else if (profile.relationshipHealth.overallScore > 80) {
      insights.push("Excellent relationship health! Keep up the great communication.")
    }
    
    return insights
  }
  
  private createInitialProfile(contactId: string): EmotionalProfile {
    return {
      contactId,
      emotionalEngagement: 50,
      communicationStyle: {
        formality: 'mixed',
        responsiveness: 'within_day',
        verbosity: 'detailed',
        emojiUsage: 'moderate',
        punctuation: 'proper'
      },
      relationshipHealth: {
        overallScore: 50,
        trustLevel: 50,
        engagementLevel: 50,
        communicationQuality: 50,
        reciprocity: 50,
        lastInteractionQuality: 'neutral',
        trend: 'stable'
      },
      emotionalTriggers: [],
      preferredTopics: [],
      responsePatterns: [],
      lastAnalysis: new Date()
    }
  }
  
  private analyzeCommunicationStyle(message: string): CommunicationStyle {
    const words = message.split(' ')
    const sentences = message.split(/[.!?]+/).filter(s => s.trim())
    
    // Formality analysis
    const formalWords = ['therefore', 'consequently', 'furthermore', 'moreover', 'thus']
    const casualWords = ['hey', 'cool', 'awesome', 'yeah', 'okay', 'lol', 'omg']
    
    const formalCount = formalWords.filter(word => message.toLowerCase().includes(word)).length
    const casualCount = casualWords.filter(word => message.toLowerCase().includes(word)).length
    
    let formality: 'formal' | 'casual' | 'mixed'
    if (formalCount > casualCount) formality = 'formal'
    else if (casualCount > formalCount) formality = 'casual'
    else formality = 'mixed'
    
    // Verbosity analysis
    const avgWordsPerSentence = words.length / sentences.length
    let verbosity: 'concise' | 'detailed' | 'very_detailed'
    if (avgWordsPerSentence < 8) verbosity = 'concise'
    else if (avgWordsPerSentence < 15) verbosity = 'detailed'
    else verbosity = 'very_detailed'
    
    // Emoji usage
    const emojiCount = (message.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length
    let emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy'
    if (emojiCount === 0) emojiUsage = 'none'
    else if (emojiCount <= 2) emojiUsage = 'minimal'
    else if (emojiCount <= 5) emojiUsage = 'moderate'
    else emojiUsage = 'heavy'
    
    // Punctuation analysis
    const properPunctuation = /[.!?]$/.test(message) && /[A-Z]/.test(message[0])
    const minimalPunctuation = !/[.!?]/.test(message)
    let punctuation: 'proper' | 'casual' | 'minimal'
    if (properPunctuation) punctuation = 'proper'
    else if (minimalPunctuation) punctuation = 'minimal'
    else punctuation = 'casual'
    
    return {
      formality,
      responsiveness: 'within_day', // Would need conversation history to determine
      verbosity,
      emojiUsage,
      punctuation
    }
  }
  
  private calculateEmotionalEngagement(message: string, profile: EmotionalProfile): number {
    let engagement = profile.emotionalEngagement
    
    // Positive indicators
    const positiveIndicators = ['love', 'great', 'awesome', 'excellent', 'amazing', 'wonderful', 'happy', 'excited']
    const negativeIndicators = ['hate', 'terrible', 'awful', 'disappointed', 'sad', 'angry', 'frustrated']
    
    const positiveCount = positiveIndicators.filter(word => message.toLowerCase().includes(word)).length
    const negativeCount = negativeIndicators.filter(word => message.toLowerCase().includes(word)).length
    
    if (positiveCount > negativeCount) engagement += 10
    if (negativeCount > positiveCount) engagement -= 10
    
    // Question asking indicates engagement
    if (message.includes('?')) engagement += 5
    
    // Personal pronouns indicate engagement
    if (message.includes('you') || message.includes('your')) engagement += 5
    
    return Math.max(0, Math.min(100, engagement))
  }
  
  private calculateRelationshipHealth(profile: EmotionalProfile): RelationshipHealth {
    const health = profile.relationshipHealth
    
    // Update overall score based on emotional engagement
    health.overallScore = Math.round((health.overallScore + profile.emotionalEngagement) / 2)
    
    // Update engagement level
    health.engagementLevel = profile.emotionalEngagement
    
    // Update communication quality based on style consistency
    health.communicationQuality = this.calculateCommunicationQuality(profile)
    
    // Update trust level (simplified)
    health.trustLevel = Math.min(100, health.trustLevel + (profile.emotionalEngagement > 70 ? 5 : -2))
    
    // Update reciprocity (simplified)
    health.reciprocity = Math.min(100, health.reciprocity + (profile.emotionalEngagement > 60 ? 3 : -1))
    
    // Determine trend
    const recentEngagement = profile.emotionalEngagement
    if (recentEngagement > health.engagementLevel + 10) health.trend = 'improving'
    else if (recentEngagement < health.engagementLevel - 10) health.trend = 'declining'
    else health.trend = 'stable'
    
    // Update last interaction quality
    if (profile.emotionalEngagement > 80) health.lastInteractionQuality = 'excellent'
    else if (profile.emotionalEngagement > 60) health.lastInteractionQuality = 'good'
    else if (profile.emotionalEngagement > 40) health.lastInteractionQuality = 'neutral'
    else health.lastInteractionQuality = 'poor'
    
    return health
  }
  
  private calculateCommunicationQuality(profile: EmotionalProfile): number {
    let quality = 50
    
    // Factor in consistency
    if (profile.communicationStyle.formality !== 'mixed') quality += 10
    
    // Factor in engagement
    quality += profile.emotionalEngagement * 0.3
    
    // Factor in response patterns
    const avgResponseTime = this.calculateAverageResponseTime(profile.responsePatterns)
    if (avgResponseTime < 30) quality += 10
    if (avgResponseTime > 120) quality -= 10
    
    return Math.max(0, Math.min(100, quality))
  }
  
  private extractEmotionalTriggers(message: string): string[] {
    const triggers = ['deadline', 'urgent', 'important', 'family', 'work', 'money', 'health', 'relationship']
    return triggers.filter(trigger => message.toLowerCase().includes(trigger))
  }
  
  private extractTopics(message: string): string[] {
    const topics = ['work', 'personal', 'family', 'health', 'finance', 'travel', 'food', 'hobbies', 'politics']
    return topics.filter(topic => message.toLowerCase().includes(topic))
  }
  
  private updateResponsePatterns(profile: EmotionalProfile, message: string, timestamp: Date): void {
    const pattern: ResponsePattern = {
      type: message.includes('?') ? 'question' : 'statement',
      frequency: 1,
      averageResponseTime: 0,
      emotionalTone: this.analyzeEmotionalTone(message),
      engagement: profile.emotionalEngagement > 70 ? 'high' : profile.emotionalEngagement > 40 ? 'medium' : 'low'
    }
    
    profile.responsePatterns.push(pattern)
    
    // Keep only recent patterns (last 10)
    if (profile.responsePatterns.length > 10) {
      profile.responsePatterns = profile.responsePatterns.slice(-10)
    }
  }
  
  private analyzeEmotionalTone(message: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['great', 'good', 'awesome', 'excellent', 'love', 'happy', 'thanks']
    const negativeWords = ['bad', 'terrible', 'hate', 'angry', 'sad', 'disappointed']
    
    const lowerMessage = message.toLowerCase()
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length
    
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }
  
  private calculateAverageResponseTime(patterns: ResponsePattern[]): number {
    if (patterns.length === 0) return 0
    const totalTime = patterns.reduce((sum, pattern) => sum + pattern.averageResponseTime, 0)
    return totalTime / patterns.length
  }
} 