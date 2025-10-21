import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  LAST_SYNC: 'last_sync',
} as const;

// Token management functions
export const TokenStorage = {
  /**
   * Save access token to secure storage
   */
  async saveAccessToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
    } catch (error) {
      console.error('Failed to save access token:', error);
      throw new Error('Failed to save access token');
    }
  },

  /**
   * Get access token from secure storage
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  },

  /**
   * Save refresh token to secure storage
   */
  async saveRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, token);
    } catch (error) {
      console.error('Failed to save refresh token:', error);
      throw new Error('Failed to save refresh token');
    }
  },

  /**
   * Get refresh token from secure storage
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  },

  /**
   * Delete access token from secure storage
   */
  async deleteAccessToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Failed to delete access token:', error);
    }
  },

  /**
   * Delete refresh token from secure storage
   */
  async deleteRefreshToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Failed to delete refresh token:', error);
    }
  },

  /**
   * Delete all tokens from secure storage
   */
  async deleteAllTokens(): Promise<void> {
    try {
      await Promise.all([
        this.deleteAccessToken(),
        this.deleteRefreshToken(),
      ]);
    } catch (error) {
      console.error('Failed to delete tokens:', error);
    }
  },

  /**
   * Check if user has valid tokens
   */
  async hasValidTokens(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();
      return !!(accessToken && refreshToken);
    } catch (error) {
      console.error('Failed to check tokens:', error);
      return false;
    }
  },
};

// User data management functions
export const UserStorage = {
  /**
   * Save user data to secure storage
   */
  async saveUserData(user: User): Promise<void> {
    try {
      const userJson = JSON.stringify(user);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, userJson);
    } catch (error) {
      console.error('Failed to save user data:', error);
      throw new Error('Failed to save user data');
    }
  },

  /**
   * Get user data from secure storage
   */
  async getUserData(): Promise<User | null> {
    try {
      const userJson = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
      if (!userJson) {
        return null;
      }
      return JSON.parse(userJson) as User;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  },

  /**
   * Delete user data from secure storage
   */
  async deleteUserData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    } catch (error) {
      console.error('Failed to delete user data:', error);
    }
  },

  /**
   * Update specific user fields
   */
  async updateUserData(updates: Partial<User>): Promise<void> {
    try {
      const currentUser = await this.getUserData();
      if (!currentUser) {
        throw new Error('No user data found to update');
      }
      
      const updatedUser = { ...currentUser, ...updates };
      await this.saveUserData(updatedUser);
    } catch (error) {
      console.error('Failed to update user data:', error);
      throw new Error('Failed to update user data');
    }
  },
};

// General storage utilities
export const Storage = {
  /**
   * Save any data to secure storage
   */
  async save(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Failed to save data for key ${key}:`, error);
      throw new Error(`Failed to save data for key ${key}`);
    }
  },

  /**
   * Get any data from secure storage
   */
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Failed to get data for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Delete any data from secure storage
   */
  async delete(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Failed to delete data for key ${key}:`, error);
    }
  },

  /**
   * Check if key exists in secure storage
   */
  async exists(key: string): Promise<boolean> {
    try {
      const value = await SecureStore.getItemAsync(key);
      return value !== null;
    } catch (error) {
      console.error(`Failed to check existence for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Clear all app data from secure storage
   */
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        TokenStorage.deleteAllTokens(),
        UserStorage.deleteUserData(),
        this.delete(STORAGE_KEYS.LAST_SYNC),
      ]);
    } catch (error) {
      console.error('Failed to clear all storage:', error);
    }
  },

  /**
   * Save last sync timestamp
   */
  async saveLastSync(timestamp: string): Promise<void> {
    try {
      await this.save(STORAGE_KEYS.LAST_SYNC, timestamp);
    } catch (error) {
      console.error('Failed to save last sync timestamp:', error);
    }
  },

  /**
   * Get last sync timestamp
   */
  async getLastSync(): Promise<string | null> {
    try {
      return await this.get(STORAGE_KEYS.LAST_SYNC);
    } catch (error) {
      console.error('Failed to get last sync timestamp:', error);
      return null;
    }
  },
};

// Authentication state helpers
export const AuthStorage = {
  /**
   * Save complete authentication state
   */
  async saveAuthState(user: User, accessToken: string, refreshToken: string): Promise<void> {
    try {
      await Promise.all([
        UserStorage.saveUserData(user),
        TokenStorage.saveAccessToken(accessToken),
        TokenStorage.saveRefreshToken(refreshToken),
      ]);
    } catch (error) {
      console.error('Failed to save auth state:', error);
      throw new Error('Failed to save authentication state');
    }
  },

  /**
   * Get complete authentication state
   */
  async getAuthState(): Promise<{
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
  }> {
    try {
      const [user, accessToken, refreshToken] = await Promise.all([
        UserStorage.getUserData(),
        TokenStorage.getAccessToken(),
        TokenStorage.getRefreshToken(),
      ]);

      return { user, accessToken, refreshToken };
    } catch (error) {
      console.error('Failed to get auth state:', error);
      return { user: null, accessToken: null, refreshToken: null };
    }
  },

  /**
   * Clear complete authentication state
   */
  async clearAuthState(): Promise<void> {
    try {
      await Promise.all([
        UserStorage.deleteUserData(),
        TokenStorage.deleteAllTokens(),
      ]);
    } catch (error) {
      console.error('Failed to clear auth state:', error);
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const { user, accessToken } = await this.getAuthState();
      return !!(user && accessToken);
    } catch (error) {
      console.error('Failed to check authentication status:', error);
      return false;
    }
  },
};

export default {
  TokenStorage,
  UserStorage,
  Storage,
  AuthStorage,
};
