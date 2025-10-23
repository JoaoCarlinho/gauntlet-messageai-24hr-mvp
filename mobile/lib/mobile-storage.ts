import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Mobile-specific storage implementation using ExpoSecureStore
 * This provides secure, encrypted storage for mobile platforms
 */
export class MobileStorage {
  constructor() {
    if (Platform.OS === 'web') {
      throw new Error('MobileStorage can only be used on mobile platforms');
    }
  }

  async getItemAsync(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error getting item ${key} from secure storage:`, error);
      return null;
    }
  }

  async setItemAsync(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error setting item ${key} in secure storage:`, error);
      throw error;
    }
  }

  async deleteItemAsync(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error deleting item ${key} from secure storage:`, error);
    }
  }
}

// Export singleton instance for mobile
export const mobileStorage = new MobileStorage();
