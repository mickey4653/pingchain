import { Timestamp } from 'firebase/firestore';

export type Platform = 'WHATSAPP' | 'IMESSAGE' | 'SLACK' | 'DISCORD' | 'EMAIL';
export type MessageStatus = 'DRAFT' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
export type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type Category = 'PERSONAL' | 'WORK' | 'FAMILY' | 'OTHER';

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  platform: Platform;
  category: Category;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  content: string;
  tone?: string;
  platform: Platform;
  status: MessageStatus;
  userId: string;
  contactId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  aiGenerated: boolean;
  context?: Record<string, unknown>; // Stores conversation context
}

export interface Contract {
  id: string;
  frequency: Frequency;
  timeOfDay?: string; // Store as "HH:mm" format
  daysOfWeek: number[]; // Array of days (0-6, where 0 is Sunday)
  userId: string;
  contactId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Streak {
  id: string;
  contactId: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastInteraction: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserStatistics {
  id: string;
  userId: string;
  totalContacts: number;
  totalMessages: number;
  activeStreaks: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
} 