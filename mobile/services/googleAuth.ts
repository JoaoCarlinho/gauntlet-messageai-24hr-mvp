import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import { auth, googleProvider } from '../../config/firebase';
import {
  signInWithCredential,
  signInWithPopup,
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
 * Sign in with Google using platform-specific methods
 * - Web: Uses Firebase signInWithPopup
 * - Mobile: Uses Expo AuthSession
 */
export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  try {
    // Web platform: Use Firebase's built-in popup
    if (Platform.OS === 'web') {
      // Use the googleProvider from config/firebase.ts which is already configured
      const userCredential: UserCredential = await signInWithPopup(auth, googleProvider);
      const idToken = await userCredential.user.getIdToken();

      return {
        idToken,
        user: {
          email: userCredential.user.email || '',
          displayName: userCredential.user.displayName || '',
          photoURL: userCredential.user.photoURL || '',
        },
      };
    }

    // Mobile platforms: Use Expo AuthSession
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    if (!clientId) {
      throw new Error('Google Web Client ID not configured');
    }

    // Create the auth request configuration
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'messageai',
      path: 'auth',
    });

    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    const authRequestConfig: AuthSession.AuthRequestConfig = {
      clientId: clientId,
      scopes: ['profile', 'email', 'openid'],
      redirectUri: redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      usePKCE: false,
    };

    const authRequest = new AuthSession.AuthRequest(authRequestConfig);

    // Prompt the user to sign in
    const result = await authRequest.promptAsync(discovery);

    if (result.type !== 'success') {
      throw new Error('Google sign-in was cancelled or failed');
    }

    // Get the ID token from the result
    const { params } = result;

    if (!params.id_token) {
      throw new Error('No ID token received from Google');
    }

    // Create a Google credential with the ID token
    const credential = GoogleAuthProvider.credential(params.id_token);

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
