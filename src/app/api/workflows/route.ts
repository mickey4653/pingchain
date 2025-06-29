import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { WorkflowAutomation } from '@/lib/advanced-features/workflow-automation'
import { Workflow, WorkflowTrigger, WorkflowAction } from '@/lib/advanced-features/workflow-automation'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, teamId, trigger, actions } = body

    if (!name || !teamId || !trigger || !actions) {
      return NextResponse.json({ 
        error: 'Name, teamId, trigger, and actions are required' 
      }, { status: 400 })
    }

    const workflowAutomation = WorkflowAutomation.getInstance()
    
    const workflowData = {
      name,
      description: description || '',
      teamId,
      creatorId: userId,
      trigger,
      actions,
      enabled: true
    }

    const workflowId = await workflowAutomation.createWorkflow(workflowData)

    return NextResponse.json({ 
      success: true, 
      workflowId,
      message: 'Workflow created successfully' 
    })

  } catch (error) {
    console.error('Error creating workflow:', error)
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
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    const workflowAutomation = WorkflowAutomation.getInstance()
    const workflows = await workflowAutomation.getWorkflows(teamId)

    return NextResponse.json({ 
      success: true, 
      workflows 
    })

  } catch (error) {
    console.error('Error fetching workflows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 