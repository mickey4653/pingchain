import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { WorkflowAutomation } from '@/lib/advanced-features/workflow-automation'

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { triggerData } = body

    const workflowAutomation = WorkflowAutomation.getInstance()
    
    const executionId = await workflowAutomation.executeWorkflow(params.workflowId, triggerData)

    return NextResponse.json({ 
      success: true, 
      executionId,
      message: 'Workflow execution started' 
    })

  } catch (error) {
    console.error('Error executing workflow:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
} 