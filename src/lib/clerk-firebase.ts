import { auth } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

export async function signInWithClerk(clerkToken: string, userId: string) {
  try {
    console.log('Attempting to get Firebase token...', { userId });
    
    // Get Firebase custom token from our API
    const response = await fetch('/api/auth/firebase-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: clerkToken, userId }),
    });

    console.log('Response status:', response.status);
    
    // Log the raw response for debugging
    const responseText = await response.text();
    console.log('Raw response:', responseText);

    if (!response.ok) {
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error response from server:', errorData);
        throw new Error(errorData.error || `Failed to get Firebase token: ${response.status}`);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error(`Failed to get Firebase token: ${response.status} - ${responseText}`);
      }
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing success response:', parseError);
      throw new Error('Invalid response format from server');
    }
    
    if (!data.token) {
      console.error('No token in response data:', data);
      throw new Error('No token received from server');
    }

    console.log('Successfully got Firebase token, signing in...');
    
    try {
      // Sign in to Firebase with the custom token
      await signInWithCustomToken(auth, data.token);
      console.log('Successfully signed in to Firebase');
    } catch (error: any) {
      console.error('Error signing in to Firebase:', error);
      throw new Error(`Failed to sign in to Firebase: ${error?.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error('Error in signInWithClerk:', error);
    throw error;
  }
} 