import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { MemoryAnalyzer } from '@/lib/conversation-memory/analyzer'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId')
    const type = searchParams.get('type') || 'analysis' // 'analysis' or 'insights'

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID required' }, { status: 400 })
    }

    const analyzer = new MemoryAnalyzer()

    if (type === 'insights') {
      const insights = await analyzer.generateInsights(userId, contactId)
      return NextResponse.json({ 
        success: true, 
        insights 
      })
    } else {
      const analysis = await analyzer.analyzeConversation(userId, contactId)
      return NextResponse.json({ 
        success: true, 
        analysis 
      })
    }

  } catch (error) {
    console.error('Error analyzing memory:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 