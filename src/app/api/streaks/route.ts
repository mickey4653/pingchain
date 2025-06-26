import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const contactId = searchParams.get('contactId')

    if (!contactId) {
      return new NextResponse('Contact ID is required', { status: 400 })
    }

    // Get streak for contact
    const streak = await prisma.streak.findFirst({
      where: {
        contactId,
        userId: session.user.id,
      },
    })

    return NextResponse.json(streak)
  } catch (error) {
    console.error('Streak API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { contactId, currentStreak, longestStreak, lastInteraction } = await req.json()

    // Update or create streak
    const streak = await prisma.streak.upsert({
      where: {
        userId_contactId: {
          userId: session.user.id,
          contactId,
        },
      },
      update: {
        currentStreak,
        longestStreak,
        lastInteraction,
      },
      create: {
        userId: session.user.id,
        contactId,
        currentStreak,
        longestStreak,
        lastInteraction,
      },
    })

    return NextResponse.json(streak)
  } catch (error) {
    console.error('Streak API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 