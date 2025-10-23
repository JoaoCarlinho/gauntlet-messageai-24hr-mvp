import { kea } from 'kea';
import { DeviceEventEmitter } from 'react-native';
import { authAPI, tokenManager } from '../lib/api';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { Platform } from 'react-native';

// Platform-specific storage imports
let platformStorage: any;

if (Platform.OS === 'web') {
  try {
    const { webStorageFallback } = require('../lib/web-storage-fallback');
    platformStorage = webStorageFallback;
  } catch (error) {
    console.error('Failed to load web storage fallback in auth:', error);
    // Fallback to a mock storage if web storage fails
    platformStorage = {
      getItemAsync: async () => null,
      setItemAsync: async () => {},
      deleteItemAsync: async () => {},
    };
  }
} else {
  try {
    const { mobileStorage } = require('../lib/mobile-storage');
    platformStorage = mobileStorage;
  } catch (error) {
    console.error('Failed to load mobile storage in auth:', error);
    // Fallback to a mock storage if mobile storage fails
    platformStorage = {
      getItemAsync: async () => null,
      setItemAsync: async () => {},
      deleteItemAsync: async () => {},
    };
  }
}

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
        
        // Update state (this will also persist to SecureStore via tokenManager)
        actions.setUser(authResponse.user);
        actions.setTokens(authResponse.accessToken, authResponse.refreshToken);
        
        // Register push token after successful login
        try {
          const { notificationManager } = await import('../lib/notifications');
          await notificationManager.registerPushTokenAfterAuth();
        } catch (pushTokenError) {
          console.warn('Failed to register push token after login:', pushTokenError);
          // Don't fail login if push token registration fails
        }
        
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
        
        // Update state (this will also persist to SecureStore via tokenManager)
        actions.setUser(authResponse.user);
        actions.setTokens(authResponse.accessToken, authResponse.refreshToken);
        
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
        // Remove event listener
        if (values.logoutListener) {
          values.logoutListener.remove();
        }
        
        // Clear local state and storage
        actions.clearAuth();
        await platformStorage.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        await platformStorage.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
        await platformStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);
        
        // Clean up socket connections and stop background activities
        const { socketManager } = await import('../lib/socket');
        socketManager.cleanup();
        
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
        
        // Update state - keep existing user and refresh token, just update access token
        actions.setTokens(tokens.accessToken, tokens.refreshToken);
        
        // Reconnect socket with fresh token (but don't fail if socket fails)
        try {
          const { socketManager } = await import('../lib/socket');
          // Only reconnect if socket is currently connected or was trying to connect
          const connectionStatus = socketManager.getConnectionStatus();
          if (connectionStatus.connected || connectionStatus.connecting) {
            await socketManager.reconnectWithFreshToken();
          }
        } catch (socketError) {
          console.warn('Failed to reconnect socket after token refresh:', socketError);
          // Don't fail the token refresh if socket reconnection fails
        }
        
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
          platformStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
          platformStorage.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
          platformStorage.getItemAsync(STORAGE_KEYS.USER_DATA),
        ]);
        
        if (accessToken && refreshToken && userDataString) {
          try {
            const userData = JSON.parse(userDataString);
            
            // Validate tokens before setting state
            if (typeof accessToken === 'string' && typeof refreshToken === 'string') {
              // Set state from stored data
              actions.setUser(userData);
              actions.setTokens(accessToken, refreshToken);
              
              // Don't verify token immediately - let the app load first
              // Token validation will happen when making API calls
              console.log('Auth initialized with stored data');
            } else {
              console.warn('Invalid stored tokens found, clearing auth data');
              // Clear invalid stored data
              await platformStorage.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
              await platformStorage.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
              await platformStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);
            }
          } catch (parseError) {
            console.error('Error parsing stored user data:', parseError);
            // Clear invalid stored data
            await platformStorage.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            await platformStorage.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
            await platformStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);
          }
        } else {
          console.log('No stored auth data found');
        }
        
        // Set up global error handler for authentication failures using React Native's event system
        const logoutListener = DeviceEventEmitter.addListener('auth:logout', (data: { reason?: string }) => {
          console.log('Global auth logout triggered:', data?.reason);
          actions.logout();
        });
        
        // Store listener reference for cleanup
        values.logoutListener = logoutListener;
        
        console.log('Auth initialization completed - using React Native event system');
        
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
