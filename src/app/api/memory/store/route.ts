import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { MemoryStore } from '@/lib/conversation-memory/memory-store'
import { MemoryEntry } from '@/lib/conversation-memory/types'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contactId, content, context, emotionalContext, communicationStyle, topics, responseQuality, actionItems, sentiment, urgency, category } = body

    if (!contactId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const memoryStore = MemoryStore.getInstance()
    
    const memoryEntry: Omit<MemoryEntry, 'id' | 'timestamp'> = {
      content,
      context: context || '',
      emotionalContext,
      communicationStyle,
      topics: topics || [],
      responseQuality,
      actionItems,
      sentiment,
      urgency,
      category
    }

    const memoryId = await memoryStore.storeMemory(userId, contactId, memoryEntry)

    return NextResponse.json({ 
      success: true, 
      memoryId,
      message: 'Memory stored successfully' 
    })

  } catch (error) {
    console.error('Error storing memory:', error)
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
    const contactId = searchParams.get('contactId')

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID required' }, { status: 400 })
    }

    const memoryStore = MemoryStore.getInstance()
    const memory = await memoryStore.getMemory(userId, contactId)

    return NextResponse.json({ 
      success: true, 
      memory 
    })

  } catch (error) {
    console.error('Error retrieving memory:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 