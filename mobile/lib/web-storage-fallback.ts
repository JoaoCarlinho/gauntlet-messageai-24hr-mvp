import { Platform } from 'react-native';

/**
 * Web-specific storage implementation using localStorage
 * This provides storage for web browsers with prefixed keys
 */
export class WebStorageFallback {
  private storage: Storage;

  constructor() {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) {
      throw new Error('WebStorageFallback can only be used on web platform with localStorage support');
    }
    this.storage = window.localStorage;
  }

  private getKey(key: string): string {
    return `messageai_secure_${key}`;
  }

  async getItemAsync(key: string): Promise<string | null> {
    try {
      return this.storage.getItem(this.getKey(key));
    } catch (error) {
      console.error(`Error getting item ${key} from localStorage:`, error);
      return null;
    }
  }

  async setItemAsync(key: string, value: string): Promise<void> {
    try {
      this.storage.setItem(this.getKey(key), value);
    } catch (error) {
      console.error(`Error setting item ${key} in localStorage:`, error);
      throw error;
    }
  }

  async deleteItemAsync(key: string): Promise<void> {
    try {
      this.storage.removeItem(this.getKey(key));
    } catch (error) {
      console.error(`Error deleting item ${key} from localStorage:`, error);
    }
  }
}

// Export singleton instance for web
export const webStorageFallback = new WebStorageFallback();
