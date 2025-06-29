import { Contact, Message } from '@/types/firebase'

// Helper function to handle both Firestore Timestamp and regular Date objects
export function getMessageDate(message: any): Date {
  if (message.createdAt && typeof message.createdAt.toDate === 'function') {
    // Firestore Timestamp object
    return message.createdAt.toDate()
  } else if (message.createdAt instanceof Date) {
    // Regular Date object
    return message.createdAt
  } else if (typeof message.createdAt === 'string') {
    // ISO string
    return new Date(message.createdAt)
  } else {
    // Fallback to current date
    return new Date()
  }
}

export interface OpenLoop {
  id: string
  contact: Contact
  message: Message
  daysSinceLastMessage: number
  suggestedResponse?: string
  isGenerating?: boolean
}

export interface PendingReply {
  id: string
  contact: Contact
  message: Message
  hoursSinceReceived: number
  urgency: 'high' | 'medium' | 'low'
}

export function processDashboardData(contacts: Contact[], messages: Message[]) {
  const now = new Date()
  
  const openLoops: OpenLoop[] = []
  const pendingReplies: PendingReply[] = []
  
  contacts.forEach(contact => {
    const contactMessages = messages.filter(msg => msg.contactId === contact.id)
    if (contactMessages.length === 0) return
    
    // Sort messages by date (newest first)
    const sortedMessages = contactMessages.sort((a, b) => 
      getMessageDate(b).getTime() - getMessageDate(a).getTime()
    )
    
    const lastMessage = sortedMessages[0]
    const secondsSinceLastMessage = (now.getTime() - getMessageDate(lastMessage).getTime()) / 1000
    
    // Simple logic: if last message was from contact (READ), user needs to reply
    // If last message was from user (SENT), it's an open loop waiting for response
    if (lastMessage.status === 'READ') {
      // User received a message and hasn't replied
      const urgency: 'high' | 'medium' | 'low' = 
        secondsSinceLastMessage >= 30 ? 'high' : 
        secondsSinceLastMessage >= 20 ? 'medium' : 'low'
      
      pendingReplies.push({
        id: `reply_${contact.id}`,
        contact,
        message: lastMessage,
        hoursSinceReceived: Math.floor(secondsSinceLastMessage), // This will show seconds for now
        urgency
      })
    } else if (lastMessage.status === 'SENT') {
      // User sent a message and is waiting for reply (open loop)
      // Don't check time threshold - if user sent last message, it's always an open loop
      openLoops.push({
        id: `loop_${contact.id}`,
        contact,
        message: lastMessage,
        daysSinceLastMessage: Math.floor(secondsSinceLastMessage / 86400) // Convert to days
      })
    }
  })
  
  return { openLoops, pendingReplies }
}

export function calculateStats(contacts: Contact[], messages: Message[]) {
  const { openLoops, pendingReplies } = processDashboardData(contacts, messages)
  
  // Calculate current streak (consecutive days with activity)
  const currentStreak = calculateCurrentStreak(messages)
  
  // Calculate check-ins sent
  const checkInsSent = messages.filter(msg => 
    msg.status === 'SENT' && msg.aiGenerated === true
  ).length
  
  return {
    openLoops: openLoops.length,
    currentStreak,
    checkInsSent,
    pendingReplies: pendingReplies.length
  }
}

function calculateCurrentStreak(messages: Message[]): number {
  if (messages.length === 0) return 0
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let streak = 0
  let currentDate = today
  
  // Check each day backwards
  while (true) {
    const dayMessages = messages.filter(msg => {
      const messageDate = getMessageDate(msg)
      const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())
      return messageDay.getTime() === currentDate.getTime()
    })
    
    if (dayMessages.length > 0) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }
  
  return streak
}

// Test data functions
export function addTestData() {
  const testContacts = [
    { 
      id: '1', 
      name: 'John Smith', 
      email: 'john@example.com', 
      phone: '+1234567890',
      platform: 'EMAIL' as const,
      category: 'WORK' as const,
      userId: 'user_2yZRvoAOjZEn9yJYvIMjZiG4tD6',
      createdAt: { toDate: () => new Date() } as any,
      updatedAt: { toDate: () => new Date() } as any
    },
    { 
      id: '2', 
      name: 'Sarah Johnson', 
      email: 'sarah@example.com', 
      phone: '+1234567891',
      platform: 'EMAIL' as const,
      category: 'WORK' as const,
      userId: 'user_2yZRvoAOjZEn9yJYvIMjZiG4tD6',
      createdAt: { toDate: () => new Date() } as any,
      updatedAt: { toDate: () => new Date() } as any
    },
    { 
      id: '3', 
      name: 'Mike Wilson', 
      email: 'mike@example.com', 
      phone: '+1234567892',
      platform: 'EMAIL' as const,
      category: 'WORK' as const,
      userId: 'user_2yZRvoAOjZEn9yJYvIMjZiG4tD6',
      createdAt: { toDate: () => new Date() } as any,
      updatedAt: { toDate: () => new Date() } as any
    },
    { 
      id: '4', 
      name: 'Lisa Brown', 
      email: 'lisa@example.com', 
      phone: '+1234567893',
      platform: 'EMAIL' as const,
      category: 'WORK' as const,
      userId: 'user_2yZRvoAOjZEn9yJYvIMjZiG4tD6',
      createdAt: { toDate: () => new Date() } as any,
      updatedAt: { toDate: () => new Date() } as any
    }
  ]

  const now = new Date()
  const testMessages = [
    // Contact 1: User sent last message (open loop) - 15 seconds ago
    {
      id: 'msg1',
      contactId: '1',
      content: 'Hey! How is the project coming along?',
      status: 'READ' as any, // Message from contact
      aiGenerated: false,
      platform: 'EMAIL' as const,
      userId: 'user_2yZRvoAOjZEn9yJYvIMjZiG4tD6',
      createdAt: { toDate: () => new Date(now.getTime() - 30 * 1000) } as any, // 30 seconds ago
      updatedAt: { toDate: () => new Date() } as any
    },
    {
      id: 'msg2',
      contactId: '1',
      content: 'Thanks for asking! I\'ll send you an update soon.',
      status: 'SENT' as any, // Message from user - 15 seconds ago
      aiGenerated: false,
      platform: 'EMAIL' as const,
      userId: 'user_2yZRvoAOjZEn9yJYvIMjZiG4tD6',
      createdAt: { toDate: () => new Date(now.getTime() - 15 * 1000) } as any, // 15 seconds ago
      updatedAt: { toDate: () => new Date() } as any
    },
    // Contact 2: Contact sent last message (pending reply) - 10 seconds ago
    {
      id: 'msg3',
      contactId: '2',
      content: 'Thanks for the update! Looking forward to seeing the results.',
      status: 'READ' as any, // Message from contact - 10 seconds ago
      aiGenerated: false,
      platform: 'EMAIL' as const,
      userId: 'user_2yZRvoAOjZEn9yJYvIMjZiG4tD6',
      createdAt: { toDate: () => new Date(now.getTime() - 10 * 1000) } as any, // 10 seconds ago
      updatedAt: { toDate: () => new Date() } as any
    },
    // Contact 3: Contact sent last message (pending reply) - 8 seconds ago
    {
      id: 'msg4',
      contactId: '3',
      content: 'Can we schedule a call next week?',
      status: 'READ' as any, // Message from contact - 8 seconds ago
      aiGenerated: false,
      platform: 'EMAIL' as const,
      userId: 'user_2yZRvoAOjZEn9yJYvIMjZiG4tD6',
      createdAt: { toDate: () => new Date(now.getTime() - 8 * 1000) } as any, // 8 seconds ago
      updatedAt: { toDate: () => new Date() } as any
    },
    {
      id: 'msg5',
      contactId: '3',
      content: 'Absolutely! Let me check my calendar and get back to you.',
      status: 'SENT' as any, // Message from user - 5 seconds ago
      aiGenerated: false,
      platform: 'EMAIL' as const,
      userId: 'user_2yZRvoAOjZEn9yJYvIMjZiG4tD6',
      createdAt: { toDate: () => new Date(now.getTime() - 5 * 1000) } as any, // 5 seconds ago
      updatedAt: { toDate: () => new Date() } as any
    },
    // Contact 4: Contact sent last message (pending reply) - 3 seconds ago
    {
      id: 'msg6',
      contactId: '4',
      content: 'The proposal looks great! Let me review it and get back to you.',
      status: 'READ' as any, // Message from contact - 3 seconds ago
      aiGenerated: false,
      platform: 'EMAIL' as const,
      userId: 'user_2yZRvoAOjZEn9yJYvIMjZiG4tD6',
      createdAt: { toDate: () => new Date(now.getTime() - 3 * 1000) } as any, // 3 seconds ago
      updatedAt: { toDate: () => new Date() } as any
    }
  ]

  // Store in localStorage
  localStorage.setItem('pingchain-test-contacts', JSON.stringify(testContacts))
  localStorage.setItem('pingchain-test-messages', JSON.stringify(testMessages))
  
  return { contacts: testContacts, messages: testMessages }
}

export function clearTestData() {
  localStorage.removeItem('pingchain-test-contacts')
  localStorage.removeItem('pingchain-test-messages')
  return { contacts: [], messages: [] }
}

export function loadTestData() {
  const contacts = JSON.parse(localStorage.getItem('pingchain-test-contacts') || '[]')
  const messages = JSON.parse(localStorage.getItem('pingchain-test-messages') || '[]')
  return { contacts, messages }
} 