import { db } from './firebase'
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore'

interface MessageOptions {
  content: string
  contactId: string
  userId: string
  platform: string
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
    // Create message record in Firebase
    const messagesRef = collection(db, "messages")
    const newMessage = {
      content,
      platform,
      userId,
      contactId,
      aiGenerated,
      context,
      status: 'SENT',
      createdAt: new Date().toISOString(),
    }

    const docRef = await addDoc(messagesRef, newMessage)
    const message = { id: docRef.id, ...newMessage }

    // Send message based on platform
    switch (platform) {
      case 'WHATSAPP':
        await sendWhatsAppMessage(content, contactId)
        break
      case 'IMESSAGE':
        await sendIMessage(content, contactId)
        break
      case 'SLACK':
        await sendSlackMessage(content, contactId)
        break
      case 'DISCORD':
        await sendDiscordMessage(content, contactId)
        break
      case 'EMAIL':
        await sendEmail(content, contactId)
        break
    }

    // Update streak
    await updateStreak(userId, contactId)

    return message
  } catch (error) {
    console.error('Error sending message:', error)
    // Update message status to failed
    try {
      const messageRef = doc(db, "messages", message.id)
      await updateDoc(messageRef, { status: 'FAILED' })
    } catch (updateError) {
      console.error('Error updating message status:', updateError)
    }
    throw error
  }
}

async function sendWhatsAppMessage(content: string, contactId: string) {
  // TODO: Implement WhatsApp API integration
  // This would use the WhatsApp Business API
  console.log(`WhatsApp message to ${contactId}: ${content}`)
}

async function sendIMessage(content: string, contactId: string) {
  // TODO: Implement iMessage integration
  // This would require macOS integration
  console.log(`iMessage to ${contactId}: ${content}`)
}

async function sendSlackMessage(content: string, contactId: string) {
  // TODO: Implement Slack API integration
  // This would use the Slack Web API
  console.log(`Slack message to ${contactId}: ${content}`)
}

async function sendDiscordMessage(content: string, contactId: string) {
  // TODO: Implement Discord API integration
  // This would use the Discord API
  console.log(`Discord message to ${contactId}: ${content}`)
}

async function sendEmail(content: string, contactId: string) {
  // TODO: Implement email sending
  // This would use a service like SendGrid or AWS SES
  console.log(`Email to ${contactId}: ${content}`)
}

async function updateStreak(userId: string, contactId: string) {
  try {
    const streaksRef = collection(db, "streaks")
    const q = query(streaksRef, where("userId", "==", userId), where("contactId", "==", contactId))
    const querySnapshot = await getDocs(q)
    
    const today = new Date().toISOString()

    if (!querySnapshot.empty) {
      const streakDoc = querySnapshot.docs[0]
      const streak = streakDoc.data()
      
      // Check if the last contact was yesterday
      const lastContact = new Date(streak.lastContact)
      const currentDate = new Date()
      const diffDays = Math.floor((currentDate.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        // Increment streak
        await updateDoc(doc(db, "streaks", streakDoc.id), {
          days: streak.days + 1,
          lastContact: today,
        })
      } else if (diffDays > 1) {
        // Reset streak
        await updateDoc(doc(db, "streaks", streakDoc.id), {
          days: 1,
          lastContact: today,
        })
      }
    } else {
      // Create new streak
      await addDoc(streaksRef, {
        userId,
        contactId,
        days: 1,
        lastContact: today,
      })
    }
  } catch (error) {
    console.error('Error updating streak:', error)
  }
} 