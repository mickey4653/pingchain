import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY

if (!apiKey) {
  console.warn('Missing OpenAI API key. OpenAI features will be disabled.')
}

const openai = apiKey ? new OpenAI({ apiKey }) : null

export async function POST(request: Request) {
  try {
    // Check if OpenAI is available
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API not configured. Please set OPENAI_API_KEY environment variable.' },
        { status: 503 }
      )
    }

    const { action, data } = await request.json()

    switch (action) {
      case 'generateMessage': {
        const { contact, relationship, previousMessages, tone } = data
        const prompt = `
          Generate a message to ${contact} with a ${tone} tone.
          ${relationship ? `The relationship is ${relationship}.` : ''}
          ${previousMessages ? `Previous messages: ${previousMessages.join('\n')}` : ''}
          
          The message should be:
          - Natural and conversational
          - Appropriate for the relationship
          - Clear and concise
          - Empathetic and considerate
          
          Generate only the message content, no additional text.
        `

        const completion = await openai.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'gpt-4-turbo-preview',
          temperature: 0.7,
          max_tokens: 150,
        })

        return NextResponse.json({
          message: completion.choices[0]?.message?.content || 'Unable to generate message'
        })
      }

      case 'analyzeTone': {
        const { message } = data
        const prompt = `
          Analyze the tone of this message and suggest improvements if needed:
          "${message}"
          
          Provide the analysis in JSON format with:
          - tone: the primary tone (casual, professional, empathetic, friendly)
          - confidence: confidence score (0-1)
          - suggestions: array of improvement suggestions
        `

        const completion = await openai.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'gpt-4-turbo-preview',
          temperature: 0.3,
          response_format: { type: 'json_object' },
        })

        const response = JSON.parse(completion.choices[0]?.message?.content || '{}')
        return NextResponse.json({
          tone: response.tone || 'neutral',
          confidence: response.confidence || 0,
          suggestions: response.suggestions || [],
        })
      }

      case 'analyzeConversation': {
        const { messages } = data
        
        if (!messages || messages.length === 0) {
          return NextResponse.json({
            topics: [],
            sentiment: 'neutral',
            actionItems: []
          })
        }

        const prompt = `
          Analyze this conversation and provide insights:
          ${messages.join('\n')}
          
          Provide the analysis in JSON format with:
          - topics: main topics discussed
          - sentiment: overall sentiment (positive, neutral, negative)
          - actionItems: any action items or follow-ups needed
        `

        const completion = await openai.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'gpt-4-turbo-preview',
          temperature: 0.3,
          response_format: { type: 'json_object' },
        })

        const response = JSON.parse(completion.choices[0]?.message?.content || '{}')
        return NextResponse.json({
          topics: response.topics || [],
          sentiment: response.sentiment || 'neutral',
          actionItems: response.actionItems || [],
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key' },
          { status: 401 }
        )
      }
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'OpenAI API quota exceeded' },
          { status: 429 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
} 