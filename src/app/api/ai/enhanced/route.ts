import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { EnhancedAI } from '@/lib/ai/enhanced-ai'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contactId, message, modelName = 'gpt-4' } = body

    if (!contactId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const enhancedAI = new EnhancedAI()
    const response = await enhancedAI.generateResponse(userId, contactId, message, modelName)

    return NextResponse.json({ 
      success: true, 
      response 
    })

  } catch (error) {
    console.error('Error generating enhanced AI response:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const enhancedAI = new EnhancedAI()

    switch (action) {
      case 'models':
        const models = enhancedAI.getAvailableModels()
        return NextResponse.json({ 
          success: true, 
          models 
        })
      
      case 'recommendations':
        const useCase = searchParams.get('useCase') || 'general'
        const recommendations = enhancedAI.getModelRecommendations(useCase)
        return NextResponse.json({ 
          success: true, 
          recommendations 
        })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error with enhanced AI request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 