interface MessageContext {
  contact: string
  previousMessages?: string[]
  relationship?: string
  tone?: string
}

export async function generateMessageSuggestion(
  context: MessageContext,
  tone: string = 'friendly'
): Promise<string> {
  try {
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generateMessage',
        data: {
          contact: context.contact,
          relationship: context.relationship,
          previousMessages: context.previousMessages,
          tone,
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate message')
    }

    const data = await response.json()
    return data.message
  } catch (error) {
    console.error('Error generating message:', error)
    throw new Error('Failed to generate message suggestion')
  }
}

export async function analyzeTone(message: string): Promise<{
  tone: string
  confidence: number
  suggestions: string[]
}> {
  try {
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'analyzeTone',
        data: { message },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to analyze tone')
    }

    return await response.json()
  } catch (error) {
    console.error('Error analyzing tone:', error)
    throw new Error('Failed to analyze message tone')
  }
}

export async function analyzeConversationContext(
  messages: string[]
): Promise<{
  topics: string[]
  sentiment: string
  actionItems: string[]
}> {
  try {
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'analyzeConversation',
        data: { messages },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to analyze conversation')
    }

    return await response.json()
  } catch (error) {
    console.error('Error analyzing conversation:', error)
    throw new Error('Failed to analyze conversation context')
  }
} 