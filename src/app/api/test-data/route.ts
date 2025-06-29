import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createContact, createMessage } from '@/lib/firebase-admin-service'

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Check if test data already exists for this user
    const { getContacts, getMessagesByUser } = await import('@/lib/firebase-admin-service')
    const existingContacts = await getContacts(userId)
    const existingMessages = await getMessagesByUser(userId)
    
    // If we already have test data, don't create duplicates
    if (existingContacts.length > 0 || existingMessages.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Test data already exists. Clear existing data first.',
        existingContacts: existingContacts.length,
        existingMessages: existingMessages.length
      })
    }

    // Create test contacts
    const contact1 = await createContact({
      name: 'John Smith',
      email: 'john@example.com',
      phone: '+1234567890',
      platform: 'EMAIL',
      category: 'WORK',
      userId
    })

    const contact2 = await createContact({
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone: '+1234567891',
      platform: 'EMAIL',
      category: 'WORK',
      userId
    })

    const contact3 = await createContact({
      name: 'Mike Wilson',
      email: 'mike@example.com',
      phone: '+1234567892',
      platform: 'EMAIL',
      category: 'WORK',
      userId
    })

    const contact4 = await createContact({
      name: 'Lisa Brown',
      email: 'lisa@example.com',
      phone: '+1234567893',
      platform: 'EMAIL',
      category: 'WORK',
      userId
    })

    // Create test messages with realistic timestamps
    const now = new Date()
    
    // Contact 1: User sent last message (open loop)
    await createMessage({
      userId,
      contactId: contact1.id,
      content: 'Hey! How is the project coming along?',
      platform: 'EMAIL',
      status: 'READ',
      aiGenerated: false
    })

    await createMessage({
      userId,
      contactId: contact1.id,
      content: 'Thanks for asking! I\'ll send you an update soon.',
      platform: 'EMAIL',
      status: 'SENT',
      aiGenerated: false
    })

    // Contact 2: Contact sent last message (pending reply)
    await createMessage({
      userId,
      contactId: contact2.id,
      content: 'Thanks for the update! Looking forward to seeing the results.',
      platform: 'EMAIL',
      status: 'READ',
      aiGenerated: false
    })

    // Contact 3: Contact sent last message (pending reply)
    await createMessage({
      userId,
      contactId: contact3.id,
      content: 'Can we schedule a call next week?',
      platform: 'EMAIL',
      status: 'READ',
      aiGenerated: false
    })

    await createMessage({
      userId,
      contactId: contact3.id,
      content: 'Absolutely! Let me check my calendar and get back to you.',
      platform: 'EMAIL',
      status: 'SENT',
      aiGenerated: false
    })

    // Contact 4: Contact sent last message (pending reply)
    await createMessage({
      userId,
      contactId: contact4.id,
      content: 'The proposal looks great! Let me review it and get back to you.',
      platform: 'EMAIL',
      status: 'READ',
      aiGenerated: false
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Test data added to Firebase successfully',
      contacts: [contact1, contact2, contact3, contact4]
    })
  } catch (error) {
    console.error('Test data API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { getContacts, getMessagesByUser } = await import('@/lib/firebase-admin-service')
    const existingContacts = await getContacts(userId)
    const existingMessages = await getMessagesByUser(userId)
    
    // Delete all contacts and their associated messages
    const { adminDb } = await import('@/lib/firebase-admin')
    
    // Delete messages first (to avoid foreign key issues)
    for (const message of existingMessages) {
      await adminDb.collection('messages').doc(message.id).delete()
    }
    
    // Then delete contacts
    for (const contact of existingContacts) {
      await adminDb.collection('contacts').doc(contact.id).delete()
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Firebase test data cleared successfully',
      deletedContacts: existingContacts.length,
      deletedMessages: existingMessages.length
    })
  } catch (error) {
    console.error('Test data DELETE API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 