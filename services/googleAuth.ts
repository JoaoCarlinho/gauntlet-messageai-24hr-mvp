import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { auth, googleProvider } from '../config/firebase';
import {
  signInWithCredential,
  GoogleAuthProvider,
  UserCredential,
} from 'firebase/auth';

// Complete the authentication flow for the redirect from the web browser
WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResult {
  idToken: string;
  user: {
    email: string;
    displayName: string;
    photoURL: string;
  };
}

/**
 * Sign in with Google using Expo AuthSession
 * This handles the OAuth flow and returns the Firebase ID token
 */
export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  try {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    if (!clientId) {
      throw new Error('Google Web Client ID not configured');
    }

    // Configure the Google auth request
    const [request, response, promptAsync] = Google.useAuthRequest({
      clientId: clientId,
      scopes: ['profile', 'email'],
    });

    if (!request) {
      throw new Error('Failed to create auth request');
    }

    // Prompt the user to sign in
    const result = await promptAsync();

    if (result.type !== 'success') {
      throw new Error('Google sign-in was cancelled or failed');
    }

    // Get the access token from the result
    const { authentication } = result;

    if (!authentication?.accessToken) {
      throw new Error('No access token received from Google');
    }

    // Create a Google credential with the access token
    const credential = GoogleAuthProvider.credential(
      authentication.idToken,
      authentication.accessToken
    );

    // Sign in to Firebase with the Google credential
    const userCredential: UserCredential = await signInWithCredential(auth, credential);

    // Get the Firebase ID token
    const idToken = await userCredential.user.getIdToken();

    return {
      idToken,
      user: {
        email: userCredential.user.email || '',
        displayName: userCredential.user.displayName || '',
        photoURL: userCredential.user.photoURL || '',
      },
    };
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

/**
 * Alternative simpler implementation using just the ID token
 */
export const getGoogleIdToken = async (): Promise<string> => {
  try {
    const result = await signInWithGoogle();
    return result.idToken;
  } catch (error) {
    console.error('Failed to get Google ID token:', error);
    throw error;
  }
};
