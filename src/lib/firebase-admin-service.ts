import { adminDb } from './firebase-admin';
import type { Contact, Message, Contract, Streak, UserStatistics } from '@/types/firebase';
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const adminDb = getFirestore()

export interface FirestoreReminder {
  id?: string
  userId: string
  contactId: string
  contactName: string
  message: string
  type: 'overdue' | 'question' | 'scheduled' | 'urgent'
  priority: 'high' | 'medium' | 'low'
  createdAt: any
  scheduledFor?: any
  sentAt?: any
  status: 'pending' | 'sent' | 'dismissed'
}

export class FirebaseAdminService {
  private static instance: FirebaseAdminService

  static getInstance(): FirebaseAdminService {
    if (!FirebaseAdminService.instance) {
      FirebaseAdminService.instance = new FirebaseAdminService()
    }
    return FirebaseAdminService.instance
  }

  async getReminders(userId: string): Promise<FirestoreReminder[]> {
    try {
      const remindersRef = adminDb.collection('reminders')
      const snapshot = await remindersRef.where('userId', '==', userId).get()
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreReminder[]
    } catch (error) {
      console.error('Error fetching reminders:', error)
      return []
    }
  }

  async clearAllReminders(userId: string): Promise<void> {
    try {
      const remindersRef = adminDb.collection('reminders')
      const snapshot = await remindersRef.where('userId', '==', userId).get()
      
      const batch = adminDb.batch()
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
      
      await batch.commit()
      console.log(`Cleared ${snapshot.docs.length} reminders for user ${userId}`)
    } catch (error) {
      console.error('Error clearing reminders:', error)
      throw error
    }
  }

  async deleteReminder(reminderId: string): Promise<void> {
    try {
      const reminderRef = adminDb.collection('reminders').doc(reminderId)
      await reminderRef.delete()
    } catch (error) {
      console.error('Error deleting reminder:', error)
      throw error
    }
  }

  async updateReminder(reminderId: string, updates: Partial<FirestoreReminder>): Promise<void> {
    try {
      const reminderRef = adminDb.collection('reminders').doc(reminderId)
      await reminderRef.update(updates)
    } catch (error) {
      console.error('Error updating reminder:', error)
      throw error
    }
  }
}

// Utility function to remove undefined values from objects
const removeUndefinedValues = (obj: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  );
};

// Contacts
export const getContacts = async (userId: string) => {
  try {
    const contactsRef = adminDb.collection('contacts');
    const snapshot = await contactsRef.where('userId', '==', userId).get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Contact[];
  } catch (error) {
    console.error('Admin Firebase error getting contacts:', error);
    return [];
  }
};

export const createContact = async (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const cleanContact = removeUndefinedValues(contact);
    const docRef = await adminDb.collection('contacts').add({
      ...cleanContact,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const docSnap = await docRef.get();
    return { id: docRef.id, ...docSnap.data() } as Contact;
  } catch (error) {
    console.error('Admin Firebase error creating contact:', error);
    throw error;
  }
};

export const updateContact = async (id: string, contact: Partial<Contact>) => {
  try {
    const docRef = adminDb.collection('contacts').doc(id);
    await docRef.update({
      ...contact,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Admin Firebase error updating contact:', error);
    throw error;
  }
};

export const deleteContact = async (id: string) => {
  try {
    await adminDb.collection('contacts').doc(id).delete();
  } catch (error) {
    console.error('Admin Firebase error deleting contact:', error);
    throw error;
  }
};

// Messages
export const getMessages = async (contactId?: string) => {
  try {
    const messagesRef = adminDb.collection('messages');
    let snapshot;
    
    if (contactId) {
      snapshot = await messagesRef
        .where('contactId', '==', contactId)
        .orderBy('createdAt', 'desc')
        .get();
    } else {
      // Get all messages for the user (we'll need userId for this)
      snapshot = await messagesRef
        .orderBy('createdAt', 'desc')
        .get();
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
  } catch (error) {
    console.error('Admin Firebase error getting messages:', error);
    return [];
  }
};

export const getMessagesByUser = async (userId: string) => {
  try {
    const messagesRef = adminDb.collection('messages');
    const snapshot = await messagesRef
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
  } catch (error) {
    console.error('Admin Firebase error getting messages by user:', error);
    return [];
  }
};

export const createMessage = async (message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const cleanMessage = removeUndefinedValues(message);
    const docRef = await adminDb.collection('messages').add({
      ...cleanMessage,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Admin Firebase error creating message:', error);
    throw error;
  }
};

// Contracts
export const getContracts = async (contactId: string) => {
  try {
    const contractsRef = adminDb.collection('contracts');
    const snapshot = await contractsRef
      .where('contactId', '==', contactId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
  } catch (error) {
    console.error('Admin Firebase error getting contracts:', error);
    return [];
  }
};

export const createContract = async (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const cleanContract = removeUndefinedValues(contract);
    const docRef = await adminDb.collection('contracts').add({
      ...cleanContract,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Admin Firebase error creating contract:', error);
    throw error;
  }
};

export const updateContract = async (id: string, contract: Partial<Contract>) => {
  try {
    const docRef = adminDb.collection('contracts').doc(id);
    await docRef.update({
      ...contract,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Admin Firebase error updating contract:', error);
    throw error;
  }
};

export const deleteContract = async (id: string) => {
  try {
    await adminDb.collection('contracts').doc(id).delete();
  } catch (error) {
    console.error('Admin Firebase error deleting contract:', error);
    throw error;
  }
};

// Streaks
export const getStreak = async (contactId: string) => {
  try {
    const streaksRef = adminDb.collection('streaks');
    const snapshot = await streaksRef.where('contactId', '==', contactId).get();
    return snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Streak : null;
  } catch (error) {
    console.error('Admin Firebase error getting streak:', error);
    return null;
  }
};

export const updateStreak = async (streak: Omit<Streak, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const streaksRef = adminDb.collection('streaks');
    const snapshot = await streaksRef.where('contactId', '==', streak.contactId).get();
    
    if (snapshot.docs[0]) {
      const docRef = streaksRef.doc(snapshot.docs[0].id);
      await docRef.update({
        ...streak,
        updatedAt: new Date()
      });
    } else {
      const cleanStreak = removeUndefinedValues(streak);
      await streaksRef.add({
        ...cleanStreak,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  } catch (error) {
    console.error('Admin Firebase error updating streak:', error);
    throw error;
  }
}; 