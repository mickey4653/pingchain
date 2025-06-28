import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getContracts, createContract, updateContract, deleteContract } from '@/lib/firebase-admin-service'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { contactId, terms, frequency, reminderTime } = await req.json()

    if (!contactId || !terms || !frequency) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    try {
      const contractId = await createContract({
        userId,
        contactId,
        frequency,
        daysOfWeek: [1, 2, 3, 4, 5], // Default to weekdays
        timeOfDay: reminderTime || "09:00"
      })
      return NextResponse.json({ id: contractId, contactId, terms, frequency, reminderTime, status: "active" })
    } catch (firebaseError) {
      console.error('Firebase error:', firebaseError)
      return NextResponse.json({ 
        id: Date.now().toString(),
        contactId,
        terms,
        frequency,
        reminderTime,
        status: "active",
        createdAt: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error("Contracts API Error:", error)
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

    try {
      if (contactId) {
        const contracts = await getContracts(contactId)
        return NextResponse.json(contracts)
      } else {
        // Return empty array if no contactId provided
        return NextResponse.json([])
      }
    } catch (firebaseError) {
      console.error('Firebase error, returning empty data:', firebaseError)
      return NextResponse.json([])
    }
  } catch (error) {
    console.error("Contracts API Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id, terms, frequency, reminderTime, status } = await req.json()

    if (!id) {
      return new NextResponse("Missing contract ID", { status: 400 })
    }

    const updateData: any = {}
    if (terms) updateData.terms = terms
    if (frequency) updateData.frequency = frequency
    if (reminderTime) updateData.timeOfDay = reminderTime
    if (status) updateData.status = status

    try {
      await updateContract(id, updateData)
      return NextResponse.json({ success: true })
    } catch (firebaseError) {
      console.error('Firebase error:', firebaseError)
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error("Contracts API Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return new NextResponse("Missing contract ID", { status: 400 })
    }

    try {
      await deleteContract(id)
      return NextResponse.json({ success: true })
    } catch (firebaseError) {
      console.error('Firebase error:', firebaseError)
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error("Contracts API Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 