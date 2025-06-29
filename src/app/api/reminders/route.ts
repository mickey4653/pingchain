import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { processReminders } from '@/lib/reminders'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      console.log('No Clerk user found in reminders API')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get open loops from the request body
    const { openLoops } = await request.json()
    
    if (!openLoops) {
      return NextResponse.json({ error: 'Open loops data required' }, { status: 400 })
    }

    console.log(`Processing reminders for user ${userId} with ${openLoops.length} open loops`)

    // Process all reminders
    await processReminders(userId, openLoops)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Reminders processed successfully',
      userId,
      processedLoops: openLoops.length
    })
    
  } catch (error) {
    console.error('Error processing reminders:', error)
    return NextResponse.json(
      { error: 'Failed to process reminders', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
}

// GET endpoint to manually trigger reminder processing (for testing)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      console.log('No Clerk user found in reminders API GET')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`Manual reminder processing triggered for user ${userId}`)

    // For testing, we'll use empty open loops
    const openLoops: any[] = []
    
    // Process reminders
    await processReminders(userId, openLoops)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Reminder processing triggered manually',
      userId
    })
    
  } catch (error) {
    console.error('Error processing reminders:', error)
    return NextResponse.json(
      { error: 'Failed to process reminders', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
} 