// Conversation Memory & Context System
// Tracks conversation history, open loops, and context

export interface ConversationContext {
  contactId: string
  lastInteraction: Date
  conversationHistory: Message[]
  openLoops: OpenLoop[]
  pendingQuestions: Question[]
  relationshipScore: number // 0-100
  communicationStyle: 'formal' | 'casual' | 'mixed'
  topics: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
}

export interface OpenLoop {
  id: string
  contactId: string
  messageId: string
  content: string
  createdAt: Date
  priority: 'high' | 'medium' | 'low'
  category: 'question' | 'request' | 'promise' | 'followup'
  status: 'open' | 'in_progress' | 'resolved'
}

export interface Question {
  id: string
  contactId: string
  messageId: string
  question: string
  askedAt: Date
  answered: boolean
  answerMessageId?: string
  urgency: 'urgent' | 'normal' | 'low'
}

export interface Message {
  id: string
  contactId: string
  content: string
  timestamp: Date
  direction: 'inbound' | 'outbound'
  platform: string
  sentiment?: number // -1 to 1
  topics?: string[]
  questions?: string[]
}

// Conversation Memory Manager
export class ConversationMemoryManager {
  private contexts: Map<string, ConversationContext> = new Map()
  
  async updateContext(contactId: string, message: Message): Promise<void> {
    let context = this.contexts.get(contactId)
    
    if (!context) {
      context = {
        contactId,
        lastInteraction: new Date(),
        conversationHistory: [],
        openLoops: [],
        pendingQuestions: [],
        relationshipScore: 50,
        communicationStyle: 'mixed',
        topics: [],
        sentiment: 'neutral'
      }
    }
    
    // Update conversation history
    context.conversationHistory.push(message)
    context.lastInteraction = message.timestamp
    
    // Extract questions
    const questions = this.extractQuestions(message.content)
    if (questions.length > 0) {
      questions.forEach(question => {
        context!.pendingQuestions.push({
          id: `q_${Date.now()}_${Math.random()}`,
          contactId,
          messageId: message.id,
          question,
          askedAt: message.timestamp,
          answered: false,
          urgency: this.assessQuestionUrgency(question)
        })
      })
    }
    
    // Update topics and sentiment
    context.topics = this.extractTopics(message.content)
    context.sentiment = this.analyzeSentiment(message.content)
    
    // Update relationship score
    context.relationshipScore = this.calculateRelationshipScore(context)
    
    this.contexts.set(contactId, context)
  }
  
  async getOpenLoops(contactId?: string): Promise<OpenLoop[]> {
    if (contactId) {
      const context = this.contexts.get(contactId)
      return context?.openLoops || []
    }
    
    const allLoops: OpenLoop[] = []
    for (const context of this.contexts.values()) {
      allLoops.push(...context.openLoops)
    }
    return allLoops
  }
  
  async getPendingQuestions(contactId?: string): Promise<Question[]> {
    if (contactId) {
      const context = this.contexts.get(contactId)
      return context?.pendingQuestions.filter(q => !q.answered) || []
    }
    
    const allQuestions: Question[] = []
    for (const context of this.contexts.values()) {
      allQuestions.push(...context.pendingQuestions.filter(q => !q.answered))
    }
    return allQuestions
  }
  
  async markQuestionAnswered(questionId: string, answerMessageId: string): Promise<void> {
    for (const context of this.contexts.values()) {
      const question = context.pendingQuestions.find(q => q.id === questionId)
      if (question) {
        question.answered = true
        question.answerMessageId = answerMessageId
        break
      }
    }
  }
  
  private extractQuestions(content: string): string[] {
    const questionPatterns = [
      /\?$/m, // Ends with question mark
      /^(what|when|where|who|why|how|can|could|would|will|do|does|did|is|are|was|were)/i, // Question words
      /^(are you|do you|can you|could you|would you)/i // Direct questions
    ]
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim())
    return sentences.filter(sentence => 
      questionPatterns.some(pattern => pattern.test(sentence.trim()))
    )
  }
  
  private assessQuestionUrgency(question: string): 'urgent' | 'normal' | 'low' {
    const urgentWords = ['urgent', 'asap', 'immediately', 'now', 'deadline', 'emergency']
    const lowWords = ['whenever', 'sometime', 'no rush', 'take your time']
    
    const lowerQuestion = question.toLowerCase()
    
    if (urgentWords.some(word => lowerQuestion.includes(word))) return 'urgent'
    if (lowWords.some(word => lowerQuestion.includes(word))) return 'low'
    return 'normal'
  }
  
  private extractTopics(content: string): string[] {
    // Simple topic extraction - in production, use NLP
    const topics = ['work', 'personal', 'family', 'health', 'finance', 'travel', 'food']
    return topics.filter(topic => content.toLowerCase().includes(topic))
  }
  
  private analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['great', 'good', 'awesome', 'excellent', 'love', 'happy', 'thanks']
    const negativeWords = ['bad', 'terrible', 'hate', 'angry', 'sad', 'disappointed']
    
    const lowerContent = content.toLowerCase()
    const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length
    const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length
    
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }
  
  private calculateRelationshipScore(context: ConversationContext): number {
    let score = 50 // Base score
    
    // Factor in sentiment
    if (context.sentiment === 'positive') score += 10
    if (context.sentiment === 'negative') score -= 10
    
    // Factor in communication frequency
    const daysSinceLastInteraction = (Date.now() - context.lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceLastInteraction < 1) score += 5
    if (daysSinceLastInteraction > 7) score -= 5
    
    // Factor in open loops (more open loops = lower score)
    score -= context.openLoops.length * 2
    
    return Math.max(0, Math.min(100, score))
  }
} 