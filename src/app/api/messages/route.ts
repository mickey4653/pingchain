import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getMessages, getMessagesByUser, createMessage } from '@/lib/firebase-admin-service'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { content, contactId, platform } = await req.json()

    try {
      const messageId = await createMessage({
        userId,
        contactId,
        content,
        platform: platform || 'EMAIL',
        status: 'SENT',
        aiGenerated: false
      })
      return NextResponse.json({ id: messageId, content, contactId, platform, userId })
    } catch (firebaseError) {
      console.error('Firebase error:', firebaseError)
      return NextResponse.json({ 
        id: Date.now().toString(),
        content,
        contactId,
        platform,
        createdAt: new Date().toISOString(),
        userId: 'fallback'
      })
    }
  } catch (error) {
    console.error('Message API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
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
        const messages = await getMessages(contactId)
        return NextResponse.json(messages)
      } else {
        // Get all messages for the user
        const messages = await getMessagesByUser(userId)
        return NextResponse.json(messages)
      }
    } catch (firebaseError) {
      console.error('Firebase error, returning empty data:', firebaseError)
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Message API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 