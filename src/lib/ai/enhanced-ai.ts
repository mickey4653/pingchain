import { MemoryStore } from '@/lib/conversation-memory/memory-store'
import { MemoryAnalyzer } from '@/lib/conversation-memory/analyzer'
import { ConversationMemory, MemoryEntry } from '@/lib/conversation-memory/types'
import { generateOpenAIResponse } from '@/lib/openai'
import { generateAnthropicResponse } from '@/lib/anthropic'

export interface AIContext {
  userId: string
  contactId: string
  currentMessage: string
  conversationHistory: MemoryEntry[]
  relationshipContext: {
    strength: number
    communicationStyle: string
    emotionalPatterns: string[]
    keyTopics: string[]
    recentSentiment: string
  }
  personalityProfile: {
    formality: 'formal' | 'casual' | 'professional' | 'friendly'
    verbosity: 'concise' | 'detailed' | 'balanced'
    emotionalTone: 'positive' | 'neutral' | 'supportive' | 'enthusiastic'
    responseStyle: 'direct' | 'empathetic' | 'analytical' | 'collaborative'
  }
}

export interface AIResponse {
  content: string
  confidence: number
  reasoning: string
  suggestedActions: string[]
  emotionalContext: string
  followUpQuestions: string[]
  modelUsed: string
  contextUsed: boolean
}

export interface AIModel {
  name: string
  provider: 'openai' | 'anthropic' | 'huggingface'
  capabilities: string[]
  maxContextLength: number
  costPerToken: number
}

export class EnhancedAI {
  private memoryStore: MemoryStore
  private memoryAnalyzer: MemoryAnalyzer
  private availableModels: AIModel[]

  constructor() {
    this.memoryStore = MemoryStore.getInstance()
    this.memoryAnalyzer = new MemoryAnalyzer()
    this.availableModels = [
      {
        name: 'gpt-4',
        provider: 'openai',
        capabilities: ['context-aware', 'personality-adaptation', 'sentiment-analysis'],
        maxContextLength: 8192,
        costPerToken: 0.00003
      },
      {
        name: 'claude-3-sonnet',
        provider: 'anthropic',
        capabilities: ['context-aware', 'personality-adaptation', 'sentiment-analysis', 'reasoning'],
        maxContextLength: 200000,
        costPerToken: 0.000015
      },
      {
        name: 'gpt-3.5-turbo',
        provider: 'openai',
        capabilities: ['context-aware', 'basic-personality'],
        maxContextLength: 4096,
        costPerToken: 0.000002
      }
    ]
  }

  /**
   * Generate context-aware AI response
   */
  async generateResponse(
    userId: string,
    contactId: string,
    message: string,
    modelName: string = 'gpt-4'
  ): Promise<AIResponse> {
    try {
      // Build comprehensive context
      const context = await this.buildContext(userId, contactId, message)
      
      // Select appropriate model
      const model = this.selectModel(modelName, context)
      
      // Generate response based on model
      const response = await this.generateWithModel(model, context)
      
      // Store the interaction in memory
      await this.storeInteraction(userId, contactId, message, response, context)
      
      return response
    } catch (error) {
      console.error('Error generating AI response:', error)
      return this.generateFallbackResponse(message)
    }
  }

  /**
   * Build comprehensive context for AI response
   */
  private async buildContext(userId: string, contactId: string, message: string): Promise<AIContext> {
    // Get conversation memory
    const memory = await this.memoryStore.getMemory(userId, contactId)
    
    // Analyze relationship context
    const analysis = await this.memoryAnalyzer.analyzeConversation(userId, contactId)
    
    // Determine personality profile based on communication history
    const personalityProfile = this.analyzePersonality(memory.entries)
    
    // Get recent conversation history (last 10 entries)
    const recentHistory = memory.entries.slice(0, 10)
    
    // Analyze current message sentiment
    const currentSentiment = await this.analyzeSentiment(message)
    
    return {
      userId,
      contactId,
      currentMessage: message,
      conversationHistory: recentHistory,
      relationshipContext: {
        strength: memory.contextSummary.relationshipStrength,
        communicationStyle: memory.contextSummary.communicationStyle,
        emotionalPatterns: memory.contextSummary.emotionalPatterns,
        keyTopics: memory.contextSummary.keyTopics,
        recentSentiment: currentSentiment
      },
      personalityProfile
    }
  }

  /**
   * Select appropriate AI model based on context and requirements
   */
  private selectModel(modelName: string, context: AIContext): AIModel {
    const requestedModel = this.availableModels.find(m => m.name === modelName)
    
    if (!requestedModel) {
      // Fallback to best available model
      return this.availableModels[0]
    }
    
    // Check if model can handle the context length
    const contextLength = this.calculateContextLength(context)
    if (contextLength > requestedModel.maxContextLength) {
      // Find model with sufficient context length
      const suitableModel = this.availableModels.find(m => m.maxContextLength >= contextLength)
      return suitableModel || this.availableModels[0]
    }
    
    return requestedModel
  }

  /**
   * Generate response using selected model
   */
  private async generateWithModel(model: AIModel, context: AIContext): Promise<AIResponse> {
    const prompt = this.buildPrompt(context, model)
    
    let response: AIResponse
    
    switch (model.provider) {
      case 'openai':
        response = await this.generateOpenAIResponse(prompt, model.name)
        break
      case 'anthropic':
        response = await this.generateAnthropicResponse(prompt, model.name)
        break
      default:
        response = await this.generateOpenAIResponse(prompt, 'gpt-4')
    }
    
    response.modelUsed = model.name
    response.contextUsed = true
    
    return response
  }

  /**
   * Build comprehensive prompt for AI model
   */
  private buildPrompt(context: AIContext, model: AIModel): string {
    const { personalityProfile, relationshipContext, conversationHistory } = context
    
    let prompt = `You are an AI communication assistant helping maintain relationships. 

CONTEXT:
- Relationship Strength: ${relationshipContext.strength}%
- Communication Style: ${relationshipContext.communicationStyle}
- Key Topics: ${relationshipContext.keyTopics.join(', ')}
- Recent Sentiment: ${relationshipContext.recentSentiment}

PERSONALITY PROFILE:
- Formality: ${personalityProfile.formality}
- Verbosity: ${personalityProfile.verbosity}
- Emotional Tone: ${personalityProfile.emotionalTone}
- Response Style: ${personalityProfile.responseStyle}

RECENT CONVERSATION HISTORY:
${conversationHistory.map(entry => 
  `- ${entry.timestamp.toLocaleDateString()}: ${entry.content} (${entry.emotionalContext || 'neutral'})`
).join('\n')}

CURRENT MESSAGE:
"${context.currentMessage}"

INSTRUCTIONS:
1. Generate a response that matches the personality profile
2. Consider the relationship context and history
3. Maintain appropriate formality and tone
4. Address any action items or follow-ups needed
5. Provide reasoning for your response approach

RESPONSE FORMAT:
{
  "content": "Your response here",
  "confidence": 0.85,
  "reasoning": "Why this response is appropriate",
  "suggestedActions": ["action1", "action2"],
  "emotionalContext": "positive/neutral/concerned",
  "followUpQuestions": ["question1", "question2"]
}`

    return prompt
  }

  /**
   * Generate response using OpenAI
   */
  private async generateOpenAIResponse(prompt: string, modelName: string): Promise<AIResponse> {
    try {
      const response = await generateOpenAIResponse(prompt, modelName)
      
      // Parse structured response
      const parsedResponse = this.parseAIResponse(response)
      
      return {
        ...parsedResponse,
        modelUsed: modelName,
        contextUsed: true
      }
    } catch (error) {
      console.error('OpenAI response generation failed:', error)
      return this.generateFallbackResponse(prompt)
    }
  }

  /**
   * Generate response using Anthropic
   */
  private async generateAnthropicResponse(prompt: string, modelName: string): Promise<AIResponse> {
    try {
      const response = await generateAnthropicResponse(prompt, modelName)
      
      // Parse structured response
      const parsedResponse = this.parseAIResponse(response)
      
      return {
        ...parsedResponse,
        modelUsed: modelName,
        contextUsed: true
      }
    } catch (error) {
      console.error('Anthropic response generation failed:', error)
      return this.generateFallbackResponse(prompt)
    }
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(response: string): AIResponse {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(response)
      return {
        content: parsed.content || response,
        confidence: parsed.confidence || 0.7,
        reasoning: parsed.reasoning || 'AI-generated response',
        suggestedActions: parsed.suggestedActions || [],
        emotionalContext: parsed.emotionalContext || 'neutral',
        followUpQuestions: parsed.followUpQuestions || [],
        modelUsed: 'unknown',
        contextUsed: true
      }
    } catch (error) {
      // Fallback to treating response as plain text
      return {
        content: response,
        confidence: 0.6,
        reasoning: 'Parsed as plain text response',
        suggestedActions: [],
        emotionalContext: 'neutral',
        followUpQuestions: [],
        modelUsed: 'unknown',
        contextUsed: true
      }
    }
  }

  /**
   * Analyze personality based on communication history
   */
  private analyzePersonality(entries: MemoryEntry[]) {
    if (entries.length === 0) {
      return {
        formality: 'professional' as const,
        verbosity: 'balanced' as const,
        emotionalTone: 'neutral' as const,
        responseStyle: 'direct' as const
      }
    }

    // Analyze formality
    const formalCount = entries.filter(e => e.communicationStyle === 'formal').length
    const casualCount = entries.filter(e => e.communicationStyle === 'casual').length
    const formality = formalCount > casualCount ? 'formal' : casualCount > formalCount ? 'casual' : 'professional'

    // Analyze verbosity
    const avgLength = entries.reduce((sum, e) => sum + e.content.length, 0) / entries.length
    const verbosity = avgLength > 200 ? 'detailed' : avgLength < 50 ? 'concise' : 'balanced'

    // Analyze emotional tone
    const positiveCount = entries.filter(e => e.sentiment === 'positive').length
    const negativeCount = entries.filter(e => e.sentiment === 'negative').length
    const emotionalTone = positiveCount > negativeCount * 2 ? 'positive' : 
                         negativeCount > positiveCount * 2 ? 'supportive' : 'neutral'

    // Analyze response style
    const empatheticCount = entries.filter(e => e.emotionalContext && ['concerned', 'frustrated'].includes(e.emotionalContext)).length
    const responseStyle = empatheticCount > entries.length * 0.3 ? 'empathetic' : 'direct'

    return {
      formality,
      verbosity,
      emotionalTone,
      responseStyle
    }
  }

  /**
   * Analyze sentiment of current message
   */
  private async analyzeSentiment(message: string): Promise<string> {
    // Simple keyword-based sentiment analysis
    const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'happy', 'excited', 'thanks', 'thank you']
    const negativeWords = ['bad', 'terrible', 'awful', 'frustrated', 'angry', 'disappointed', 'concerned', 'worried']
    
    const lowerMessage = message.toLowerCase()
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length
    
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }

  /**
   * Calculate context length for model selection
   */
  private calculateContextLength(context: AIContext): number {
    const historyLength = context.conversationHistory.reduce((sum, entry) => sum + entry.content.length, 0)
    const currentMessageLength = context.currentMessage.length
    const relationshipContextLength = JSON.stringify(context.relationshipContext).length
    const personalityLength = JSON.stringify(context.personalityProfile).length
    
    return historyLength + currentMessageLength + relationshipContextLength + personalityLength + 1000 // Buffer
  }

  /**
   * Store interaction in memory
   */
  private async storeInteraction(
    userId: string,
    contactId: string,
    message: string,
    response: AIResponse,
    context: AIContext
  ) {
    const memoryEntry = {
      content: message,
      context: `AI Response: ${response.content}`,
      emotionalContext: response.emotionalContext,
      communicationStyle: context.personalityProfile.formality,
      topics: this.extractTopics(message),
      responseQuality: response.confidence,
      actionItems: response.suggestedActions,
      sentiment: response.emotionalContext,
      urgency: 'medium' as const,
      category: 'professional' as const
    }

    await this.memoryStore.storeMemory(userId, contactId, memoryEntry)
  }

  /**
   * Extract topics from message
   */
  private extractTopics(message: string): string[] {
    const topics = ['Project', 'Meeting', 'Follow-up', 'Question', 'Feedback', 'Planning', 'Collaboration']
    const lowerMessage = message.toLowerCase()
    return topics.filter(topic => lowerMessage.includes(topic.toLowerCase()))
  }

  /**
   * Generate fallback response when AI fails
   */
  private generateFallbackResponse(message: string): AIResponse {
    return {
      content: "I understand your message. Let me get back to you with a proper response shortly.",
      confidence: 0.5,
      reasoning: 'Fallback response due to AI service unavailability',
      suggestedActions: ['Follow up later'],
      emotionalContext: 'neutral',
      followUpQuestions: [],
      modelUsed: 'fallback',
      contextUsed: false
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): AIModel[] {
    return this.availableModels
  }

  /**
   * Get model recommendations for specific use case
   */
  getModelRecommendations(useCase: string): AIModel[] {
    switch (useCase) {
      case 'complex-analysis':
        return this.availableModels.filter(m => m.capabilities.includes('reasoning'))
      case 'quick-response':
        return this.availableModels.filter(m => m.costPerToken < 0.00001)
      case 'context-heavy':
        return this.availableModels.filter(m => m.maxContextLength > 10000)
      default:
        return this.availableModels
    }
  }
} 