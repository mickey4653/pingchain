import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendMessage } from '@/lib/messaging'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { content, contactId, platform } = await req.json()

    // Verify contact exists and belongs to user
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId: session.user.id,
      },
    })

    if (!contact) {
      return new NextResponse('Contact not found', { status: 404 })
    }

    // Send message
    const message = await sendMessage({
      content,
      contactId,
      userId: session.user.id,
      platform,
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('Message API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

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

    // Get messages for contact
    const messages = await prisma.message.findMany({
      where: {
        contactId,
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Message API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 