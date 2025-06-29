import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { TeamManager } from '@/lib/team-features/team-manager'
import { TeamRole } from '@/lib/team-features/types'

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
    const members = await teamManager.getTeamMembers(params.teamId)

    return NextResponse.json({ 
      success: true, 
      members 
    })

  } catch (error) {
    console.error('Error fetching team members:', error)
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
    const { memberEmail, role = 'member' } = body

    if (!memberEmail) {
      return NextResponse.json({ error: 'Member email is required' }, { status: 400 })
    }

    const teamManager = TeamManager.getInstance()
    
    // Check if user has permission to invite members
    const canInvite = await teamManager.checkPermission(userId, params.teamId, 'inviteMembers')
    if (!canInvite) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create invitation
    const invitationId = await teamManager.createInvitation(
      params.teamId,
      userId,
      memberEmail,
      role as TeamRole
    )

    return NextResponse.json({ 
      success: true, 
      invitationId,
      message: 'Invitation sent successfully' 
    })

  } catch (error) {
    console.error('Error inviting team member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 