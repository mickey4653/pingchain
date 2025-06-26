import { NextResponse } from 'next/server';
import { auth } from 'firebase-admin';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if it hasn't been initialized
if (!getApps().length) {
  console.log('Initializing Firebase Admin...');
  console.log('Environment variables present:', {
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
  });

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('Missing Firebase Admin credentials:', {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
    });
    throw new Error('Missing Firebase Admin credentials');
  }

  try {
    // Format the private key properly
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      .replace(/\\n/g, '\n')  // Replace literal \n with actual newlines
      .replace(/"/g, '')      // Remove any quotes
      .trim();                // Remove any extra whitespace

    console.log('Initializing Firebase Admin with:', {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKeyLength: privateKey.length,
      privateKeyFirstChars: privateKey.substring(0, 10) + '...'
    });

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  console.log('Received request to /api/auth/firebase-token');
  
  try {
    // Ensure the request has a body
    if (!request.body) {
      console.error('No request body provided');
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    // Parse the request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { token, userId } = body;

    if (!token || !userId) {
      console.error('Missing required fields:', { hasToken: !!token, hasUserId: !!userId });
      return NextResponse.json(
        { error: 'Token and userId are required' },
        { status: 400 }
      );
    }

    if (typeof userId !== 'string' || userId.length > 128) {
      console.error('Invalid userId:', { userId });
      return NextResponse.json(
        { error: 'Invalid userId: must be a string with length <= 128 characters' },
        { status: 400 }
      );
    }

    console.log('Creating Firebase custom token for user:', userId);

    try {
      // Create a custom token for Firebase
      const firebaseToken = await auth().createCustomToken(userId);
      console.log('Successfully created Firebase custom token');
      return NextResponse.json({ token: firebaseToken });
    } catch (error: any) {
      console.error('Error creating Firebase custom token:', error);
      return NextResponse.json(
        { error: `Failed to create Firebase token: ${error?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in /api/auth/firebase-token:', error);
    return NextResponse.json(
      { error: `Failed to create Firebase token: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
} 