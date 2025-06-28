import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStreak, updateStreak } from '@/lib/firebase-admin-service'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { contactId, days } = await req.json()

    if (!contactId || !days) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    try {
      await updateStreak({
        userId,
        contactId,
        currentStreak: days,
        longestStreak: days,
        lastInteraction: new Date()
      })
      return NextResponse.json({ success: true })
    } catch (firebaseError) {
      console.error('Firebase error:', firebaseError)
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error("Streaks API Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      console.log('No Clerk user found, returning empty data')
      return NextResponse.json([])
    }

    const { searchParams } = new URL(req.url)
    const contactId = searchParams.get('contactId')

    if (!contactId) {
      console.log('No contactId provided, returning empty data')
      return NextResponse.json([])
    }

    try {
      const streak = await getStreak(contactId)
      return NextResponse.json(streak ? [streak] : [])
    } catch (firebaseError) {
      console.error('Firebase error, returning empty data:', firebaseError)
      return NextResponse.json([])
    }
  } catch (error) {
    console.error("Streaks API Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { contactId, days, lastContact } = await req.json()

    if (!contactId) {
      return new NextResponse("Missing contact ID", { status: 400 })
    }

    const updateData: any = {}
    if (days) updateData.currentStreak = days
    if (lastContact) updateData.lastInteraction = new Date(lastContact)

    try {
      await updateStreak({
        userId,
        contactId,
        ...updateData
      })
      return NextResponse.json({ success: true })
    } catch (firebaseError) {
      console.error('Firebase error:', firebaseError)
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error("Streaks API Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 