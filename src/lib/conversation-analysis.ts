export interface ConversationContext {
  contactId: string
  contactName: string
  openLoops: OpenLoop[]
  pendingResponses: PendingResponse[]
  conversationHealth: 'excellent' | 'good' | 'needs_attention' | 'at_risk'
  lastInteraction: Date
  responseTime: number // average response time in hours
  engagementScore: number // 0-100
}

export interface OpenLoop {
  id: string
  messageId: string
  question: string
  askedBy: 'user' | 'contact'
  createdAt: Date
  urgency: 'high' | 'medium' | 'low'
  context: string
}

export interface PendingResponse {
  id: string
  messageId: string
  question: string
  askedBy: 'contact'
  createdAt: Date
  urgency: 'high' | 'medium' | 'low'
  suggestedResponse?: string
}

// Helper function to handle both Firestore Timestamp and regular Date objects
function getMessageDate(message: any): Date {
  if (message.createdAt && typeof message.createdAt.toDate === 'function') {
    // Firestore Timestamp object
    return message.createdAt.toDate()
  } else if (message.createdAt instanceof Date) {
    // Regular Date object
    return message.createdAt
  } else if (typeof message.createdAt === 'string') {
    // ISO string
    return new Date(message.createdAt)
  } else {
    // Fallback to current date
    return new Date()
  }
}

// Analyze conversation for open loops and pending responses
export function analyzeConversation(messages: any[], contactId: string): ConversationContext {
  const contactMessages = messages.filter(m => m.contactId === contactId)
  const openLoops: OpenLoop[] = []
  const pendingResponses: PendingResponse[] = []
  
  // Questions that typically need responses
  const questionKeywords = [
    'what do you think', 'can you', 'could you', 'would you', 'when', 'where', 'how', 'why',
    'do you want', 'are you', 'is it', 'will you', 'should we', 'can we', 'what time',
    'what about', 'how about', 'what if', 'do you have', 'are you free', 'are you available'
  ]
  
  // Analyze each message for questions
  contactMessages.forEach((message, index) => {
    const content = message.content.toLowerCase()
    const isQuestion = questionKeywords.some(keyword => content.includes(keyword)) || 
                      content.includes('?')
    
    if (isQuestion) {
      const openLoop: OpenLoop = {
        id: `loop_${message.id}`,
        messageId: message.id,
        question: message.content,
        askedBy: message.userId ? 'user' : 'contact',
        createdAt: getMessageDate(message),
        urgency: determineUrgency(message, contactMessages),
        context: extractContext(message, contactMessages)
      }
      
      openLoops.push(openLoop)
      
      // If contact asked a question, it's a pending response
      if (openLoop.askedBy === 'contact') {
        pendingResponses.push({
          id: `pending_${message.id}`,
          messageId: message.id,
          question: message.content,
          askedBy: 'contact',
          createdAt: getMessageDate(message),
          urgency: openLoop.urgency
        })
      }
    }
  })
  
  // Calculate conversation health
  const conversationHealth = calculateConversationHealth(contactMessages, openLoops)
  const responseTime = calculateAverageResponseTime(contactMessages)
  const engagementScore = calculateEngagementScore(contactMessages, openLoops)
  
  return {
    contactId,
    contactName: contactMessages[0]?.contactName || 'Unknown',
    openLoops,
    pendingResponses,
    conversationHealth,
    lastInteraction: contactMessages[0] ? getMessageDate(contactMessages[0]) : new Date(),
    responseTime,
    engagementScore
  }
}

// Determine urgency based on content and time
function determineUrgency(message: any, allMessages: any[]): 'high' | 'medium' | 'low' {
  const content = message.content.toLowerCase()
  const hoursSinceMessage = (new Date().getTime() - getMessageDate(message).getTime()) / (1000 * 60 * 60)
  
  // High urgency keywords
  const highUrgencyKeywords = ['urgent', 'asap', 'emergency', 'important', 'deadline', 'critical']
  if (highUrgencyKeywords.some(keyword => content.includes(keyword))) {
    return 'high'
  }
  
  // Time-based urgency
  if (hoursSinceMessage > 48) return 'high'
  if (hoursSinceMessage > 24) return 'medium'
  
  return 'low'
}

// Extract context from conversation
function extractContext(message: any, allMessages: any[]): string {
  const content = message.content.toLowerCase()
  
  if (content.includes('meeting') || content.includes('call')) return 'meeting'
  if (content.includes('project') || content.includes('work')) return 'work'
  if (content.includes('weekend') || content.includes('holiday')) return 'personal'
  if (content.includes('thank') || content.includes('thanks')) return 'appreciation'
  if (content.includes('sorry') || content.includes('apologize')) return 'apology'
  
  return 'general'
}

// Calculate conversation health
function calculateConversationHealth(messages: any[], openLoops: OpenLoop[]): 'excellent' | 'good' | 'needs_attention' | 'at_risk' {
  const totalMessages = messages.length
  const openLoopsCount = openLoops.length
  const lastMessageAge = messages.length > 0 ? 
    (new Date().getTime() - getMessageDate(messages[0]).getTime()) / (1000 * 60 * 60 * 24) : 0
  
  if (openLoopsCount === 0 && lastMessageAge < 1) return 'excellent'
  if (openLoopsCount <= 1 && lastMessageAge < 3) return 'good'
  if (openLoopsCount <= 2 && lastMessageAge < 7) return 'needs_attention'
  
  return 'at_risk'
}

// Calculate average response time
function calculateAverageResponseTime(messages: any[]): number {
  if (messages.length < 2) return 0
  
  let totalResponseTime = 0
  let responseCount = 0
  
  for (let i = 0; i < messages.length - 1; i++) {
    const currentMessage = messages[i]
    const nextMessage = messages[i + 1]
    
    // If messages are from different people, calculate response time
    if (currentMessage.userId !== nextMessage.userId) {
      const responseTime = (getMessageDate(nextMessage).getTime() - getMessageDate(currentMessage).getTime()) / (1000 * 60 * 60)
      totalResponseTime += responseTime
      responseCount++
    }
  }
  
  return responseCount > 0 ? totalResponseTime / responseCount : 0
}

// Calculate engagement score (0-100)
function calculateEngagementScore(messages: any[], openLoops: OpenLoop[]): number {
  let score = 100
  
  // Deduct points for open loops
  score -= openLoops.length * 10
  
  // Deduct points for long gaps
  if (messages.length > 0) {
    const lastMessageAge = (new Date().getTime() - getMessageDate(messages[0]).getTime()) / (1000 * 60 * 60 * 24)
    if (lastMessageAge > 7) score -= 30
    else if (lastMessageAge > 3) score -= 15
  }
  
  // Add points for recent activity
  if (messages.length > 0) {
    const lastMessageAge = (new Date().getTime() - getMessageDate(messages[0]).getTime()) / (1000 * 60 * 60)
    if (lastMessageAge < 1) score += 10
    else if (lastMessageAge < 24) score += 5
  }
  
  return Math.max(0, Math.min(100, score))
}

// Generate context-aware AI suggestions
export function generateContextAwareSuggestion(
  conversationContext: ConversationContext,
  lastMessage: string
): string {
  const { openLoops, pendingResponses, conversationHealth } = conversationContext
  
  // If there are pending responses, prioritize those
  if (pendingResponses.length > 0) {
    const mostUrgent = pendingResponses.sort((a, b) => {
      const urgencyOrder = { high: 3, medium: 2, low: 1 }
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
    })[0]
    
    return `I should respond to: "${mostUrgent.question}"`
  }
  
  // If conversation health is poor, suggest re-engagement
  if (conversationHealth === 'at_risk') {
    return `Time to re-engage with ${conversationContext.contactName}. The conversation has been quiet.`
  }
  
  // Generate based on context
  const context = extractContext({ content: lastMessage }, [])
  switch (context) {
    case 'meeting':
      return `Follow up on the meeting discussion with ${conversationContext.contactName}`
    case 'work':
      return `Check in on the project progress with ${conversationContext.contactName}`
    case 'personal':
      return `Send a personal check-in to ${conversationContext.contactName}`
    default:
      return `Continue the conversation with ${conversationContext.contactName}`
  }
} 