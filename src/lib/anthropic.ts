import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface MessageSuggestionRequest {
  contact: string
  previousMessages: string[]
  tone: 'friendly' | 'professional' | 'casual' | 'formal'
  context?: string
}

export async function generateMessageSuggestionWithClaude(request: MessageSuggestionRequest): Promise<string> {
  try {
    const { contact, previousMessages, tone, context } = request
    
    const prompt = `You are a helpful communication assistant. Generate a thoughtful, ${tone} follow-up message for a conversation with ${contact}.

${context ? `Context: ${context}` : ''}

Previous messages in the conversation:
${previousMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}

Generate a natural, engaging follow-up message that:
- Maintains the conversation flow
- Shows genuine interest
- Matches the ${tone} tone
- Is concise but meaningful
- Encourages a response

Response:`

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Fast and cost-effective
      max_tokens: 150,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    return response.content[0].text.trim()
  } catch (error) {
    console.error('Error generating message with Claude:', error)
    throw new Error('Failed to generate message suggestion')
  }
}

// Alternative function for more complex conversation analysis
export async function analyzeConversationWithClaude(conversation: string[]): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative'
  urgency: 'high' | 'medium' | 'low'
  suggestedAction: string
}> {
  try {
    const prompt = `Analyze this conversation and provide insights:

Conversation:
${conversation.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}

Please analyze and respond with:
1. Overall sentiment (positive/neutral/negative)
2. Urgency level (high/medium/low)
3. Suggested next action

Format your response as JSON:
{
  "sentiment": "positive|neutral|negative",
  "urgency": "high|medium|low", 
  "suggestedAction": "brief description"
}`

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const result = JSON.parse(response.content[0].text.trim())
    return result
  } catch (error) {
    console.error('Error analyzing conversation with Claude:', error)
    return {
      sentiment: 'neutral',
      urgency: 'medium',
      suggestedAction: 'Send a general follow-up message'
    }
  }
} 