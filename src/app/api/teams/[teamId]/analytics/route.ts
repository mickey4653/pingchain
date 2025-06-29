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
    
    // Check if user has permission to view analytics
    const canViewAnalytics = await teamManager.checkPermission(userId, params.teamId, 'viewAnalytics')
    if (!canViewAnalytics) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const analytics = await teamManager.getTeamAnalytics(params.teamId)

    return NextResponse.json({ 
      success: true, 
      analytics 
    })

  } catch (error) {
    console.error('Error fetching team analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 