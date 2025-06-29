import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { TeamManager } from '@/lib/team-features/team-manager'
import { db } from '@/lib/firebase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teamManager = TeamManager.getInstance()
    
    // Check if user has permission to view team activity
    const canViewMessages = await teamManager.checkPermission(userId, params.teamId, 'viewMessages')
    if (!canViewMessages) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get team activity from Firestore
    const activitySnapshot = await db.collection('team_activity')
      .where('teamId', '==', params.teamId)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get()

    const activities = activitySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate()
    }))

    return NextResponse.json({ 
      success: true, 
      activities 
    })

  } catch (error) {
    console.error('Error fetching team activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, title, message, data = {} } = body

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'Type, title, and message are required' }, { status: 400 })
    }

    const teamManager = TeamManager.getInstance()
    
    // Check if user has permission to send messages (as a proxy for creating notifications)
    const canSendMessages = await teamManager.checkPermission(userId, params.teamId, 'sendMessages')
    if (!canSendMessages) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create team activity/notification
    const activityRef = db.collection('team_activity').doc()
    
    const activity = {
      id: activityRef.id,
      teamId: params.teamId,
      userId,
      type,
      title,
      message,
      data,
      timestamp: new Date(),
      readBy: [userId] // Creator has read the notification
    }

    await activityRef.set(activity)

    return NextResponse.json({ 
      success: true, 
      activityId: activityRef.id,
      message: 'Activity logged successfully' 
    })

  } catch (error) {
    console.error('Error creating team activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 