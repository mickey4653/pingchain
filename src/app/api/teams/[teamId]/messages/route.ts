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
    
    // Check if user has permission to view messages
    const canViewMessages = await teamManager.checkPermission(userId, params.teamId, 'viewMessages')
    if (!canViewMessages) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get team messages from Firestore
    const messagesSnapshot = await db.collection('team_messages')
      .where('teamId', '==', params.teamId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    }))

    return NextResponse.json({ 
      success: true, 
      messages 
    })

  } catch (error) {
    console.error('Error fetching team messages:', error)
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
    const { content, type = 'text', relatedContactId } = body

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const teamManager = TeamManager.getInstance()
    
    // Check if user has permission to send messages
    const canSendMessages = await teamManager.checkPermission(userId, params.teamId, 'sendMessages')
    if (!canSendMessages) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create team message
    const messageRef = db.collection('team_messages').doc()
    
    const message = {
      id: messageRef.id,
      teamId: params.teamId,
      senderId: userId,
      content,
      type,
      relatedContactId,
      createdAt: new Date(),
      readBy: [userId] // Sender has read the message
    }

    await messageRef.set(message)

    return NextResponse.json({ 
      success: true, 
      messageId: messageRef.id,
      message: 'Message sent successfully' 
    })

  } catch (error) {
    console.error('Error sending team message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 