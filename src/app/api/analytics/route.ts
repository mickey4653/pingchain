import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsService, TimeRange } from '@/lib/advanced-features/analytics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const timeRange = searchParams.get('timeRange') || '30d' // 7d, 30d, 90d, 1y

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Calculate time range
    const end = new Date()
    const start = new Date()
    
    switch (timeRange) {
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
      case '90d':
        start.setDate(start.getDate() - 90)
        break
      case '1y':
        start.setFullYear(start.getFullYear() - 1)
        break
      default:
        start.setDate(start.getDate() - 30)
    }

    const analyticsService = new AnalyticsService(userId)
    const metrics = await analyticsService.getMetrics({ start, end })

    return NextResponse.json({
      success: true,
      metrics,
      timeRange: { start, end },
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, customTimeRange } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    let timeRange: TimeRange

    if (customTimeRange) {
      timeRange = {
        start: new Date(customTimeRange.start),
        end: new Date(customTimeRange.end)
      }
    } else {
      // Default to last 30 days
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      timeRange = { start, end }
    }

    const analyticsService = new AnalyticsService(userId)
    const metrics = await analyticsService.getMetrics(timeRange)

    return NextResponse.json({
      success: true,
      metrics,
      timeRange,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
} 