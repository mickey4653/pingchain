import { Platform, Status } from '@prisma/client'
import prisma from './prisma'

interface MessageOptions {
  content: string
  contactId: string
  userId: string
  platform: Platform
  aiGenerated?: boolean
  context?: any
}

export async function sendMessage({
  content,
  contactId,
  userId,
  platform,
  aiGenerated = false,
  context,
}: MessageOptions) {
  try {
    // Create message record
    const message = await prisma.message.create({
      data: {
        content,
        platform,
        userId,
        contactId,
        aiGenerated,
        context,
        status: Status.SENT,
      },
    })

    // Send message based on platform
    switch (platform) {
      case Platform.WHATSAPP:
        await sendWhatsAppMessage(content, contactId)
        break
      case Platform.IMESSAGE:
        await sendIMessage(content, contactId)
        break
      case Platform.SLACK:
        await sendSlackMessage(content, contactId)
        break
      case Platform.DISCORD:
        await sendDiscordMessage(content, contactId)
        break
      case Platform.EMAIL:
        await sendEmail(content, contactId)
        break
    }

    // Update streak
    await updateStreak(userId, contactId)

    return message
  } catch (error) {
    console.error('Error sending message:', error)
    // Update message status to failed
    await prisma.message.update({
      where: { id: message.id },
      data: { status: Status.FAILED },
    })
    throw error
  }
}

async function sendWhatsAppMessage(content: string, contactId: string) {
  // TODO: Implement WhatsApp API integration
  // This would use the WhatsApp Business API
  throw new Error('WhatsApp integration not implemented')
}

async function sendIMessage(content: string, contactId: string) {
  // TODO: Implement iMessage integration
  // This would require macOS integration
  throw new Error('iMessage integration not implemented')
}

async function sendSlackMessage(content: string, contactId: string) {
  // TODO: Implement Slack API integration
  // This would use the Slack Web API
  throw new Error('Slack integration not implemented')
}

async function sendDiscordMessage(content: string, contactId: string) {
  // TODO: Implement Discord API integration
  // This would use the Discord API
  throw new Error('Discord integration not implemented')
}

async function sendEmail(content: string, contactId: string) {
  // TODO: Implement email sending
  // This would use a service like SendGrid or AWS SES
  throw new Error('Email integration not implemented')
}

async function updateStreak(userId: string, contactId: string) {
  const streak = await prisma.streak.findUnique({
    where: {
      userId_contactId: {
        userId,
        contactId,
      },
    },
  })

  if (streak) {
    // Check if the last contact was yesterday
    const lastContact = new Date(streak.lastContact)
    const today = new Date()
    const diffDays = Math.floor((today.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      // Increment streak
      await prisma.streak.update({
        where: { id: streak.id },
        data: {
          days: streak.days + 1,
          lastContact: today,
        },
      })
    } else if (diffDays > 1) {
      // Reset streak
      await prisma.streak.update({
        where: { id: streak.id },
        data: {
          days: 1,
          lastContact: today,
        },
      })
    }
  } else {
    // Create new streak
    await prisma.streak.create({
      data: {
        userId,
        contactId,
        days: 1,
        lastContact: new Date(),
      },
    })
  }
} 