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
    const { contactId, count = 10 } = body

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID required' }, { status: 400 })
    }

    const memoryStore = MemoryStore.getInstance()
    const createdMemories = []

    // Generate test memory entries
    const testMemories = generateTestMemories(count)

    for (const memoryData of testMemories) {
      const memoryId = await memoryStore.storeMemory(userId, contactId, memoryData)
      createdMemories.push(memoryId)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Created ${createdMemories.length} test memories`,
      memoryIds: createdMemories
    })

  } catch (error) {
    console.error('Error creating test data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateTestMemories(count: number): Omit<MemoryEntry, 'id' | 'timestamp'>[] {
  const memories = []
  const topics = ['Project Discussion', 'Personal Update', 'Meeting Follow-up', 'Technical Question', 'Collaboration', 'Feedback', 'Planning', 'Ideas', 'Challenges', 'Success Stories']
  const emotions = ['excited', 'happy', 'concerned', 'frustrated', 'neutral', 'positive', 'negative']
  const styles = ['formal', 'casual', 'professional', 'friendly']
  const sentiments = ['positive', 'negative', 'neutral']
  const urgencies = ['low', 'medium', 'high']
  const categories = ['personal', 'professional', 'social']

  const sampleContents = [
    "Great meeting today! I think we're making real progress on the project.",
    "Thanks for the quick response. I'll follow up on those action items.",
    "I'm a bit concerned about the timeline. Can we discuss this further?",
    "Excited to share some updates on our recent developments.",
    "The collaboration has been fantastic so far. Looking forward to more.",
    "I have some questions about the technical implementation.",
    "Let's schedule a follow-up meeting to discuss the next steps.",
    "I appreciate your feedback on the proposal.",
    "We're facing some challenges with the current approach.",
    "The results have exceeded our expectations!"
  ]

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
    
    memories.push({
      content: sampleContents[Math.floor(Math.random() * sampleContents.length)],
      context: `Test context for memory ${i + 1}`,
      emotionalContext: emotions[Math.floor(Math.random() * emotions.length)],
      communicationStyle: styles[Math.floor(Math.random() * styles.length)],
      topics: topics.slice(0, Math.floor(Math.random() * 4) + 1).sort(() => 0.5 - Math.random()),
      responseQuality: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
      actionItems: Math.random() > 0.7 ? ['Follow up', 'Schedule meeting'] : [],
      sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
      urgency: urgencies[Math.floor(Math.random() * urgencies.length)],
      category: categories[Math.floor(Math.random() * categories.length)]
    })
  }

  return memories
} 