import { useState, useEffect, useCallback } from 'react';
import { notificationManager, NotificationData } from '../lib/notifications';
import * as Notifications from 'expo-notifications';

export interface UseNotificationsReturn {
  // State
  isInitialized: boolean;
  pushToken: string | null;
  areNotificationsEnabled: boolean;
  badgeCount: number;
  
  // Actions
  requestPermissions: () => Promise<boolean>;
  getPushToken: () => Promise<string | null>;
  sendTokenToBackend: (token: string) => Promise<boolean>;
  scheduleLocalNotification: (
    title: string,
    body: string,
    data?: NotificationData,
    seconds?: number
  ) => Promise<string>;
  cancelNotification: (notificationId: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  setBadgeCount: (count: number) => Promise<void>;
  getBadgeCount: () => Promise<number>;
  
  // Settings
  getNotificationSettings: () => Promise<Notifications.NotificationPermissionsStatus>;
  updateNotificationSettings: (
    settings: Partial<Notifications.NotificationPermissionsRequest>
  ) => Promise<Notifications.NotificationPermissionsStatus>;
}

/**
 * Custom hook for managing notifications
 * Provides access to notification functionality throughout the app
 */
export const useNotifications = (): UseNotificationsReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [areNotificationsEnabled, setAreNotificationsEnabled] = useState(false);
  const [badgeCount, setBadgeCountState] = useState(0);

  // Initialize notifications on mount
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        await notificationManager.initialize();
        setIsInitialized(true);
        
        // Get current push token
        const token = notificationManager.getCurrentPushToken();
        setPushToken(token);
        
        // Check if notifications are enabled
        const enabled = await notificationManager.areNotificationsEnabled();
        setAreNotificationsEnabled(enabled);
        
        // Get current badge count
        const count = await notificationManager.getBadgeCount();
        setBadgeCountState(count);
        
      } catch (error) {
        console.error('Failed to initialize notifications in hook:', error);
      }
    };

    initializeNotifications();
  }, []);

  // Request notification permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await notificationManager.requestPermissions();
      setAreNotificationsEnabled(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }, []);

  // Get push token
  const getPushToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = await notificationManager.getPushToken();
      setPushToken(token);
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }, []);

  // Send token to backend
  const sendTokenToBackend = useCallback(async (token: string): Promise<boolean> => {
    try {
      return await notificationManager.sendTokenToBackend(token);
    } catch (error) {
      console.error('Error sending token to backend:', error);
      return false;
    }
  }, []);

  // Schedule local notification
  const scheduleLocalNotification = useCallback(async (
    title: string,
    body: string,
    data?: NotificationData,
    seconds: number = 0
  ): Promise<string> => {
    try {
      return await notificationManager.scheduleLocalNotification(title, body, data, seconds);
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }, []);

  // Cancel notification
  const cancelNotification = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await notificationManager.cancelNotification(notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }, []);

  // Cancel all notifications
  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    try {
      await notificationManager.cancelAllNotifications();
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(async (): Promise<void> => {
    try {
      await notificationManager.clearAllNotifications();
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }, []);

  // Set badge count
  const setBadgeCount = useCallback(async (count: number): Promise<void> => {
    try {
      await notificationManager.setBadgeCount(count);
      setBadgeCountState(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }, []);

  // Get badge count
  const getBadgeCount = useCallback(async (): Promise<number> => {
    try {
      const count = await notificationManager.getBadgeCount();
      setBadgeCountState(count);
      return count;
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }, []);

  // Get notification settings
  const getNotificationSettings = useCallback(async (): Promise<Notifications.NotificationPermissionsStatus> => {
    try {
      return await notificationManager.getNotificationSettings();
    } catch (error) {
      console.error('Error getting notification settings:', error);
      throw error;
    }
  }, []);

  // Update notification settings
  const updateNotificationSettings = useCallback(async (
    settings: Partial<Notifications.NotificationPermissionsRequest>
  ): Promise<Notifications.NotificationPermissionsStatus> => {
    try {
      const result = await notificationManager.updateNotificationSettings(settings);
      setAreNotificationsEnabled(result.status === 'granted');
      return result;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }, []);

  return {
    // State
    isInitialized,
    pushToken,
    areNotificationsEnabled,
    badgeCount,
    
    // Actions
    requestPermissions,
    getPushToken,
    sendTokenToBackend,
    scheduleLocalNotification,
    cancelNotification,
    cancelAllNotifications,
    clearAllNotifications,
    setBadgeCount,
    getBadgeCount,
    
    // Settings
    getNotificationSettings,
    updateNotificationSettings,
  };
};

export default useNotifications;
