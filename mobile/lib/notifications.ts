import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import api from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  conversationId?: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  messageContent?: string;
  type?: 'message' | 'system';
}

export interface PushTokenResponse {
  success: boolean;
  token?: string;
  error?: string;
}

class NotificationManager {
  private pushToken: string | null = null;
  private isInitialized = false;

  /**
   * Initialize the notification system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permissions
      await this.requestPermissions();
      
      // Get push token (will handle auth gracefully)
      await this.getPushToken();
      
      // Set up listeners
      this.setupNotificationListeners();
      
      this.isInitialized = true;
      console.log('Notification system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification system:', error);
      throw error;
    }
  }

  /**
   * Register push token with backend after authentication
   * This should be called after user logs in
   */
  async registerPushTokenAfterAuth(): Promise<void> {
    if (this.pushToken) {
      console.log('Registering push token with backend after authentication...');
      await this.sendTokenToBackend(this.pushToken);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for push notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return false;
      }

      console.log('Notification permissions granted');
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get Expo push token
   */
  async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for push notifications');
        return null;
      }
      // Resolve projectId from env or config. Do not use a fallback placeholder UUID in dev.
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || Constants.expoConfig?.extra?.projectId;

      if (!projectId || typeof projectId !== 'string' || projectId.length === 0) {
        console.warn('EXPO_PUBLIC_PROJECT_ID is not set or invalid. Skipping push token registration in this environment.');
        return null;
      }

      // Try to obtain token, but catch and log errors without throwing to avoid crashing app startup
      try {
        const token = await Notifications.getExpoPushTokenAsync({ projectId });
        this.pushToken = token.data;
        console.log('Expo push token obtained:', this.pushToken);

        // Send token to backend (handle 404 gracefully)
        const sent = await this.sendTokenToBackend(this.pushToken);
        if (!sent) {
          console.warn('Push token was obtained but failed to be saved on backend (check endpoint).');
        }

        return this.pushToken;
      } catch (err) {
        console.error('Error getting Expo push token (non-fatal):', err);
        return null;
      }
    } catch (error) {
      console.error('Unexpected error in getPushToken:', error);
      return null;
    }
  }

  /**
   * Send push token to backend for storage
   */
  async sendTokenToBackend(token: string): Promise<boolean> {
    try {
      const response = await api.client.post('/users/push-token', {
        pushToken: token,
        platform: Platform.OS,
        deviceId: Device.osInternalBuildId || 'unknown',
      });
      if (response.status === 200 && response.data && response.data.success) {
        console.log('Push token sent to backend successfully');
        return true;
      }

      // Handle 404 and other non-success responses gracefully
      if (response.status === 404) {
        console.warn('Push token endpoint not found (404). Check backend route /users/push-token');
        return false;
      }

      console.error('Failed to send push token to backend:', response.status, response.data);
      return false;
    } catch (error) {
      // If axios error with response, surface status for debugging
      if (error?.response) {
        // Handle authentication errors gracefully
        if (error.response.status === 401) {
          console.log('Push token not sent - user not authenticated yet. Will retry after login.');
          return false;
        }
        console.warn('Error sending push token to backend:', error.response.status, error.response.data);
        return false;
      }

      console.error('Unexpected error sending push token to backend:', error);
      return false;
    }
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners(): void {
    // Listener for notifications received while app is running
    Notifications.addNotificationReceivedListener(this.handleNotificationReceived);

    // Listener for when user taps on a notification
    Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);
  }

  /**
   * Handle notification received while app is running
   */
  private handleNotificationReceived = (notification: Notifications.Notification) => {
    console.log('Notification received:', notification);
    
    const data = notification.request.content.data as NotificationData;
    
    // Handle different notification types
    if (data.type === 'message') {
      // Update UI to show new message indicator
      this.handleNewMessageNotification(data);
    } else if (data.type === 'system') {
      // Handle system notifications
      this.handleSystemNotification(data);
    }
  };

  /**
   * Handle notification response (when user taps notification)
   */
  private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    console.log('Notification response received:', response);
    
    const data = response.notification.request.content.data as NotificationData;
    
    // Navigate to appropriate screen based on notification data
    if (data.conversationId) {
      this.navigateToChat(data.conversationId);
    }
  };

  /**
   * Handle new message notification
   */
  private handleNewMessageNotification(data: NotificationData): void {
    // This could trigger UI updates, sound effects, etc.
    console.log('New message notification:', data);
    
    // You could emit events here to update the UI
    // For example, update unread counts, show message preview, etc.
  }

  /**
   * Handle system notification
   */
  private handleSystemNotification(data: NotificationData): void {
    console.log('System notification:', data);
    
    // Handle system-wide notifications
    // Could show alerts, update app state, etc.
  }

  /**
   * Navigate to chat screen
   */
  private navigateToChat(conversationId: string): void {
    try {
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error('Error navigating to chat:', error);
    }
  }

  /**
   * Schedule a local notification (for testing or offline scenarios)
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
    seconds: number = 0
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data as Record<string, unknown>,
          sound: 'default',
        },
        trigger: seconds > 0 ? { seconds } as any : null,
      });

      console.log('Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Get current push token
   */
  getCurrentPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<Notifications.NotificationPermissionsStatus> {
    try {
      return await Notifications.getPermissionsAsync();
    } catch (error) {
      console.error('Error getting notification settings:', error);
      throw error;
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    settings: Partial<Notifications.NotificationPermissionsRequest>
  ): Promise<Notifications.NotificationPermissionsStatus> {
    try {
      return await Notifications.requestPermissionsAsync(settings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  /**
   * Clear all notifications from notification center
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('Badge count set to:', count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }
}

// Create singleton instance
export const notificationManager = new NotificationManager();

// Export types and manager
export { NotificationManager };
export default notificationManager;
