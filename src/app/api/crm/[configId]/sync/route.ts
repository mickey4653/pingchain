import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { CRMIntegration } from '@/lib/advanced-features/crm-integration'

export async function POST(
  request: NextRequest,
  { params }: { params: { configId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const crmIntegration = CRMIntegration.getInstance()
    const result = await crmIntegration.syncCRMData(params.configId)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
} 