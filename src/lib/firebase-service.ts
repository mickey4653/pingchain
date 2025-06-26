import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import type { Contact, Message, Contract, Streak, UserStatistics } from '@/types/firebase';

// Utility function to remove undefined values from objects
const removeUndefinedValues = (obj: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  );
};

// Contacts
export const getContacts = (userId: string, callback?: (contacts: Contact[]) => void) => {
  const contactsRef = collection(db, 'contacts');
  const q = query(contactsRef, where('userId', '==', userId));

  if (callback) {
    return onSnapshot(q, (snapshot) => {
      const contacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contact[];
      callback(contacts);
    });
  }

  return getDocs(q).then(snapshot => 
    snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Contact[]
  );
};

export const getContact = async (id: string) => {
  const docRef = doc(db, 'contacts', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Contact : null;
};

export const createContact = async (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
  const cleanContact = removeUndefinedValues(contact);
  const docRef = await addDoc(collection(db, 'contacts'), {
    ...cleanContact,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  const docSnap = await getDoc(docRef);
  return { id: docRef.id, ...docSnap.data() } as Contact;
};

export const updateContact = async (id: string, contact: Partial<Contact>) => {
  const docRef = doc(db, 'contacts', id);
  await updateDoc(docRef, {
    ...contact,
    updatedAt: Timestamp.now()
  });
};

export const deleteContact = async (id: string) => {
  await deleteDoc(doc(db, 'contacts', id));
};

// Messages
export const getMessages = async (contactId: string) => {
  const q = query(
    collection(db, 'messages'),
    where('contactId', '==', contactId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
};

export const createMessage = async (message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => {
  const cleanMessage = removeUndefinedValues(message);
  
  const docRef = await addDoc(collection(db, 'messages'), {
    ...cleanMessage,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
};

// Contracts
export const getContracts = async (contactId: string) => {
  const q = query(
    collection(db, 'contracts'),
    where('contactId', '==', contactId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
};

export const createContract = async (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
  const cleanContract = removeUndefinedValues(contract);
  const docRef = await addDoc(collection(db, 'contracts'), {
    ...cleanContract,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateContract = async (id: string, contract: Partial<Contract>) => {
  const docRef = doc(db, 'contracts', id);
  await updateDoc(docRef, {
    ...contract,
    updatedAt: Timestamp.now()
  });
};

export const deleteContract = async (id: string) => {
  await deleteDoc(doc(db, 'contracts', id));
};

// Streaks
export const getStreak = async (contactId: string) => {
  const q = query(
    collection(db, 'streaks'),
    where('contactId', '==', contactId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Streak : null;
};

export const updateStreak = async (streak: Omit<Streak, 'id' | 'createdAt' | 'updatedAt'>) => {
  const q = query(
    collection(db, 'streaks'),
    where('contactId', '==', streak.contactId)
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.docs[0]) {
    const docRef = doc(db, 'streaks', snapshot.docs[0].id);
    await updateDoc(docRef, {
      ...streak,
      updatedAt: Timestamp.now()
    });
  } else {
    const cleanStreak = removeUndefinedValues(streak);
    await addDoc(collection(db, 'streaks'), {
      ...cleanStreak,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }
};

// User Statistics
export const getUserStatistics = async (userId: string) => {
  const q = query(
    collection(db, 'userStatistics'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserStatistics : null;
};

export const updateUserStatistics = async (stats: Omit<UserStatistics, 'id' | 'createdAt' | 'updatedAt'>) => {
  const q = query(
    collection(db, 'userStatistics'),
    where('userId', '==', stats.userId)
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.docs[0]) {
    const docRef = doc(db, 'userStatistics', snapshot.docs[0].id);
    await updateDoc(docRef, {
      ...stats,
      updatedAt: Timestamp.now()
    });
  } else {
    const cleanStats = removeUndefinedValues(stats);
    await addDoc(collection(db, 'userStatistics'), {
      ...cleanStats,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }
};

// Typing status functions
export const updateTypingStatus = async (
  userId: string,
  contactId: string,
  isTyping: boolean
) => {
  const typingRef = doc(db, 'typingStatus', `${userId}_${contactId}`);
  await setDoc(typingRef, {
    userId,
    contactId,
    isTyping,
    lastUpdated: serverTimestamp(),
  }, { merge: true });
};

export const subscribeToTypingStatus = (
  userId: string,
  contactId: string,
  callback: (isTyping: boolean) => void
) => {
  const typingRef = doc(db, 'typingStatus', `${userId}_${contactId}`);
  return onSnapshot(typingRef, (doc) => {
    const data = doc.data();
    callback(data?.isTyping || false);
  });
}; 