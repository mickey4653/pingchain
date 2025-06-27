export interface MessageSuggestionRequest {
  contact: string
  previousMessages: string[]
  tone: 'friendly' | 'professional' | 'casual' | 'formal'
  context?: string
}

// Free Hugging Face models for text generation
const FREE_MODELS = {
  // Fast and good for short responses
  'microsoft/DialoGPT-medium': 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
  // Good for conversational responses
  'microsoft/DialoGPT-small': 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-small',
  // Alternative option
  'EleutherAI/gpt-neo-125M': 'https://api-inference.huggingface.co/models/EleutherAI/gpt-neo-125M'
}

export async function generateMessageSuggestionWithHuggingFace(request: MessageSuggestionRequest): Promise<string> {
  try {
    const { contact, previousMessages, tone, context } = request
    
    // Create a simple prompt for the model
    const prompt = `Conversation with ${contact}:
${previousMessages.slice(-3).map((msg, i) => `Message ${i + 1}: ${msg}`).join('\n')}
${context ? `Context: ${context}\n` : ''}
Next ${tone} response:`

    // Use DialoGPT-medium (free and good for conversations)
    const modelUrl = FREE_MODELS['microsoft/DialoGPT-medium']
    
    const response = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY || 'hf_demo'}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_length: 100,
          temperature: 0.7,
          do_sample: true,
          return_full_text: false
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Extract the generated text
    let generatedText = ''
    if (Array.isArray(data)) {
      generatedText = data[0]?.generated_text || data[0]?.text || ''
    } else {
      generatedText = data.generated_text || data.text || ''
    }

    // Clean up the response
    generatedText = generatedText
      .replace(prompt, '') // Remove the input prompt
      .trim()
      .replace(/^[^a-zA-Z]*/, '') // Remove leading non-letters
      .split('\n')[0] // Take only the first line

    // Fallback if no good response
    if (!generatedText || generatedText.length < 5) {
      return `Hi ${contact}! How are things going?`
    }

    return generatedText
  } catch (error) {
    console.error('Error generating message with Hugging Face:', error)
    
    // Fallback response
    return `Hi ${contact}! Just checking in on our conversation. How are things going?`
  }
}

// Alternative: Use a simpler approach with template-based responses
export function generateTemplateMessage(request: MessageSuggestionRequest): string {
  const { contact, tone, context } = request
  
  const templates = {
    friendly: [
      `Hi ${contact}! How are things going?`,
      `Hey ${contact}! Just wanted to check in on our conversation.`,
      `Hi ${contact}! Hope you're doing well. Any updates?`,
      `Hey ${contact}! How's everything on your end?`
    ],
    professional: [
      `Hello ${contact}, I hope this message finds you well.`,
      `Hi ${contact}, I wanted to follow up on our recent conversation.`,
      `Hello ${contact}, I hope you're having a productive day.`,
      `Hi ${contact}, I wanted to check in regarding our discussion.`
    ],
    casual: [
      `Hey ${contact}! What's up?`,
      `Hi ${contact}! How's it going?`,
      `Hey ${contact}! Any news?`,
      `Hi ${contact}! What's new?`
    ],
    formal: [
      `Dear ${contact}, I hope this message finds you well.`,
      `Hello ${contact}, I trust you are doing well.`,
      `Dear ${contact}, I hope you are having a pleasant day.`,
      `Hello ${contact}, I wanted to reach out regarding our conversation.`
    ]
  }

  const toneTemplates = templates[tone] || templates.friendly
  const randomIndex = Math.floor(Math.random() * toneTemplates.length)
  
  return toneTemplates[randomIndex]
}

// Enhanced template system with context awareness
export function generateSmartTemplateMessage(request: MessageSuggestionRequest): string {
  const { contact, previousMessages, tone, context } = request
  
  // Analyze the last message for context
  const lastMessage = previousMessages[previousMessages.length - 1] || ''
  const lowerLastMessage = lastMessage.toLowerCase()
  
  // Context-aware templates
  if (lowerLastMessage.includes('meeting') || lowerLastMessage.includes('call')) {
    return `Hi ${contact}! Looking forward to our ${lowerLastMessage.includes('meeting') ? 'meeting' : 'call'}. See you soon!`
  }
  
  if (lowerLastMessage.includes('project') || lowerLastMessage.includes('work')) {
    return `Hi ${contact}! How's the ${lowerLastMessage.includes('project') ? 'project' : 'work'} coming along?`
  }
  
  if (lowerLastMessage.includes('weekend') || lowerLastMessage.includes('holiday')) {
    return `Hi ${contact}! Hope you had a great ${lowerLastMessage.includes('weekend') ? 'weekend' : 'holiday'}!`
  }
  
  if (lowerLastMessage.includes('thank') || lowerLastMessage.includes('thanks')) {
    return `Hi ${contact}! You're very welcome. Happy to help!`
  }
  
  // Default to template-based response
  return generateTemplateMessage(request)
} 