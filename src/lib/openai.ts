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
      // Handle specific error cases
      if (response.status === 429) {
        console.log('OpenAI API quota exceeded, returning default message')
        return `Hi ${context.contact}, hope you're doing well!`
      }
      
      if (response.status === 503) {
        console.log('OpenAI API not configured, returning default message')
        return `Hi ${context.contact}, hope you're doing well!`
      }
      
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()
    return data.message
  } catch (error) {
    console.log('OpenAI API call failed, returning default message')
    return `Hi ${context.contact}, hope you're doing well!`
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
      // Handle specific error cases
      if (response.status === 429) {
        console.log('OpenAI API quota exceeded, returning default tone analysis')
        return {
          tone: 'neutral',
          confidence: 0.5,
          suggestions: []
        }
      }
      
      if (response.status === 503) {
        console.log('OpenAI API not configured, returning default tone analysis')
        return {
          tone: 'neutral',
          confidence: 0.5,
          suggestions: []
        }
      }
      
      throw new Error(`API request failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.log('OpenAI API call failed, returning default tone analysis')
    return {
      tone: 'neutral',
      confidence: 0.5,
      suggestions: []
    }
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
      // Handle specific error cases
      if (response.status === 429) {
        console.log('OpenAI API quota exceeded, returning default analysis')
        return {
          topics: [],
          sentiment: 'neutral',
          actionItems: []
        }
      }
      
      if (response.status === 503) {
        console.log('OpenAI API not configured, returning default analysis')
        return {
          topics: [],
          sentiment: 'neutral',
          actionItems: []
        }
      }
      
      throw new Error(`API request failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.log('OpenAI API call failed, returning default analysis')
    // Return default values instead of throwing
    return {
      topics: [],
      sentiment: 'neutral',
      actionItems: []
    }
  }
} 