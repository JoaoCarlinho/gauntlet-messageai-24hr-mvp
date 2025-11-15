import * as admin from 'firebase-admin';

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Check if Firebase credentials are valid (not placeholder values)
const hasValidFirebaseConfig =
  firebaseConfig.projectId &&
  firebaseConfig.clientEmail &&
  firebaseConfig.privateKey &&
  !firebaseConfig.privateKey.includes('placeholder');

// Initialize Firebase Admin SDK only if valid credentials are provided
if (!admin.apps.length && hasValidFirebaseConfig) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseConfig.projectId,
        clientEmail: firebaseConfig.clientEmail,
        privateKey: firebaseConfig.privateKey,
      }),
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
} else if (!hasValidFirebaseConfig) {
  console.warn('Firebase credentials not configured - Firebase features will be disabled');
}

export const firebaseAdmin = admin;
export const auth = admin.apps.length > 0 ? admin.auth() : null;
