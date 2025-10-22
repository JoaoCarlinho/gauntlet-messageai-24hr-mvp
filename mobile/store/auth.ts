import { kea } from 'kea';
import { authAPI, tokenManager } from '../lib/api';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types';
import * as SecureStore from 'expo-secure-store';

// Storage keys for persistence
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
} as const;

// Auth state interface
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth actions
interface AuthActions {
  // Authentication actions
  login: (credentials: LoginRequest) => void;
  register: (userData: RegisterRequest) => void;
  logout: () => void;
  refreshToken: () => void;
  
  // State management actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
  
  // Initialization
  initializeAuth: () => void;
}

// Auth logic
export const authLogic = kea({
  path: ['auth'],
  
  defaults: {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  },
  
  actions: {
    // Authentication actions
    login: (credentials: LoginRequest) => ({ credentials }),
    register: (userData: RegisterRequest) => ({ userData }),
    logout: true,
    refreshToken: true,
    
    // State management actions
    setUser: (user: User | null) => ({ user }),
    setTokens: (accessToken: string | null, refreshToken: string | null) => ({ accessToken, refreshToken }),
    setLoading: (loading: boolean) => ({ loading }),
    setError: (error: string | null) => ({ error }),
    clearAuth: true,
    
    // Initialization
    initializeAuth: true,
  },
  
  reducers: {
    user: {
      setUser: (_, { user }) => user,
      clearAuth: () => null,
    },
    accessToken: {
      setTokens: (_, { accessToken }) => accessToken,
      clearAuth: () => null,
    },
    refreshToken: {
      setTokens: (_, { refreshToken }) => refreshToken,
      clearAuth: () => null,
    },
    isAuthenticated: {
      setUser: (_, { user }) => !!user,
      setTokens: (_, { accessToken }) => !!accessToken,
      clearAuth: () => false,
    },
    isLoading: {
      setLoading: (_, { loading }) => loading,
      login: () => true,
      register: () => true,
      logout: () => true,
      refreshToken: () => true,
      initializeAuth: () => true,
    },
    error: {
      setError: (_, { error }) => error,
      login: () => null,
      register: () => null,
      logout: () => null,
      refreshToken: () => null,
      initializeAuth: () => null,
      clearAuth: () => null,
    },
  },
  
  listeners: ({ actions, values }: any) => ({
    // Login listener
    login: async ({ credentials }: any) => {
      try {
        const authResponse: AuthResponse = await authAPI.login(credentials);
        
        // Update state
        actions.setUser(authResponse.user);
        actions.setTokens(authResponse.accessToken, authResponse.refreshToken);
        
        // Persist to SecureStore
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, authResponse.accessToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, authResponse.refreshToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(authResponse.user));
        
        actions.setLoading(false);
        actions.setError(null);
      } catch (error) {
        console.error('Login error:', error);
        actions.setError(error instanceof Error ? error.message : 'Login failed');
        actions.setLoading(false);
      }
    },
    
    // Register listener
    register: async ({ userData }: any) => {
      try {
        const authResponse: AuthResponse = await authAPI.register(userData);
        
        // Update state
        actions.setUser(authResponse.user);
        actions.setTokens(authResponse.accessToken, authResponse.refreshToken);
        
        // Persist to SecureStore
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, authResponse.accessToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, authResponse.refreshToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(authResponse.user));
        
        actions.setLoading(false);
        actions.setError(null);
      } catch (error) {
        console.error('Register error:', error);
        actions.setError(error instanceof Error ? error.message : 'Registration failed');
        actions.setLoading(false);
      }
    },
    
    // Logout listener
    logout: async () => {
      try {
        // Call API logout
        await authAPI.logout();
      } catch (error) {
        console.error('Logout API error:', error);
        // Continue with local logout even if API fails
      } finally {
        // Clear local state and storage
        actions.clearAuth();
        await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
        actions.setLoading(false);
      }
    },
    
    // Refresh token listener
    refreshToken: async () => {
      try {
        const currentRefreshToken = values.refreshToken;
        if (!currentRefreshToken) {
          throw new Error('No refresh token available');
        }
        
        const tokens = await authAPI.refreshToken();
        
        // Update state - keep existing user, just update tokens
        actions.setTokens(tokens.accessToken, tokens.refreshToken);
        
        // Persist to SecureStore
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
        
        actions.setLoading(false);
        actions.setError(null);
      } catch (error) {
        console.error('Token refresh error:', error);
        // If refresh fails, logout user
        actions.logout();
      }
    },
    
    // Initialize auth listener
    initializeAuth: async () => {
      try {
        // Try to load stored auth data
        const [accessToken, refreshToken, userDataString] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
          SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
          SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA),
        ]);
        
        if (accessToken && refreshToken && userDataString) {
          try {
            const userData = JSON.parse(userDataString);
            
            // Set state from stored data
            actions.setUser(userData);
            actions.setTokens(accessToken, refreshToken);
            
            // Verify token is still valid by trying to refresh
            // This will update tokens if needed or logout if invalid
            await authAPI.refreshToken();
          } catch (parseError) {
            console.error('Error parsing stored user data:', parseError);
            // Clear invalid stored data
            await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
            await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
          }
        }
        
        actions.setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        actions.setLoading(false);
        // Don't set error for initialization failures
      }
    },
  }),
  
  // Selectors
  selectors: {
    isLoggedIn: [(selectors: any) => [selectors.isAuthenticated], (isAuthenticated: any) => isAuthenticated],
    currentUser: [(selectors: any) => [selectors.user], (user: any) => user],
    hasValidTokens: [(selectors: any) => [selectors.accessToken, selectors.refreshToken], (accessToken: any, refreshToken: any) => !!(accessToken && refreshToken)],
  },
});

// Export the logic for use in components
export default authLogic;
