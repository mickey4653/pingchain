import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { TeamManager } from '@/lib/team-features/team-manager'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    const teamManager = TeamManager.getInstance()
    const teamId = await teamManager.createTeam(userId, name, description)

    return NextResponse.json({ 
      success: true, 
      teamId,
      message: 'Team created successfully' 
    })

  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teamManager = TeamManager.getInstance()
    const teams = await teamManager.getUserTeams(userId)

    return NextResponse.json({ 
      success: true, 
      teams 
    })

  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 