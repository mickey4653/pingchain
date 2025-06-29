import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { TeamManager } from '@/lib/team-features/team-manager'

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
    
    // Check if user has permission to view shared contacts
    const canViewContacts = await teamManager.checkPermission(userId, params.teamId, 'viewMessages')
    if (!canViewContacts) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const sharedContacts = await teamManager.getSharedContacts(params.teamId)

    return NextResponse.json({ 
      success: true, 
      sharedContacts 
    })

  } catch (error) {
    console.error('Error fetching shared contacts:', error)
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
    const { contactId, permissions = ['view'], notes } = body

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }

    const teamManager = TeamManager.getInstance()
    
    // Check if user has permission to share contacts
    const canShareContacts = await teamManager.checkPermission(userId, params.teamId, 'shareContacts')
    if (!canShareContacts) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Share contact with team
    await teamManager.shareContact(params.teamId, contactId, userId, permissions)

    return NextResponse.json({ 
      success: true, 
      message: 'Contact shared successfully' 
    })

  } catch (error) {
    console.error('Error sharing contact:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 