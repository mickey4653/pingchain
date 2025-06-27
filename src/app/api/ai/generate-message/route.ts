import { NextRequest, NextResponse } from 'next/server'
import { generateSmartTemplateMessage, generateMessageSuggestionWithHuggingFace } from '@/lib/huggingface'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contact, previousMessages, tone, context, useAI = false } = body

    if (!contact || !previousMessages) {
      return NextResponse.json(
        { error: 'Missing required fields: contact, previousMessages' },
        { status: 400 }
      )
    }

    let suggestion: string

    if (useAI) {
      // Use Hugging Face AI (requires API key)
      suggestion = await generateMessageSuggestionWithHuggingFace({
        contact,
        previousMessages,
        tone: tone || 'friendly',
        context
      })
    } else {
      // Use smart template system (free, no API key needed)
      suggestion = generateSmartTemplateMessage({
        contact,
        previousMessages,
        tone: tone || 'friendly',
        context
      })
    }

    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error('Error generating message:', error)
    return NextResponse.json(
      { error: 'Failed to generate message suggestion' },
      { status: 500 }
    )
  }
} 