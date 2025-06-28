import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateMessageSuggestion } from '@/lib/openai'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { message, context, tone } = await req.json()

    if (!message) {
      return new NextResponse('Message is required', { status: 400 })
    }

    try {
      const suggestion = await generateMessageSuggestion(message, context, tone)
      return NextResponse.json({ suggestion })
    } catch (aiError) {
      console.error('AI generation error:', aiError)
      return NextResponse.json({ 
        suggestion: "I'm having trouble generating a response right now. Please try again later." 
      })
    }
  } catch (error) {
    console.error('AI API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 