"use client";

import { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { signInWithClerk } from '@/lib/clerk-firebase';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function ClerkFirebaseSync() {
  const { getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    // Log Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('Firebase auth state changed:', {
        isAuthenticated: !!firebaseUser,
        uid: firebaseUser?.uid,
        email: firebaseUser?.email
      });
    });

    const syncAuth = async () => {
      try {
        if (!user?.id) {
          console.log('No user ID available');
          return;
        }

        console.log('Getting Clerk token for user:', user.id);
        const token = await getToken();
        if (token) {
          console.log('Got Clerk token, signing in to Firebase...');
          await signInWithClerk(token, user.id);
        } else {
          console.error('No Clerk token available');
        }
      } catch (error) {
        console.error('Error syncing auth:', error);
      }
    };

    syncAuth();

    return () => {
      unsubscribe();
    };
  }, [getToken, user?.id]);

  return null;
} 