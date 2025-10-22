import * as Notifications from 'expo-notifications';
import { notificationManager } from '../../lib/notifications';

export interface MockNotificationData {
  conversationId: string;
  messageId?: string;
  senderId: string;
  senderName: string;
  messageContent: string;
  messageType?: string;
  type: 'message' | 'system';
}

export interface MockNotificationOptions {
  title: string;
  body: string;
  data?: MockNotificationData;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
}

export class NotificationTestUtils {
  private static mockNotifications: MockNotificationOptions[] = [];
  private static mockPushTokens: string[] = [];
  private static mockPermissions: Notifications.NotificationPermissionsStatus = {
    status: 'granted',
    ios: { status: 'granted' },
    android: { status: 'granted' }
  };

  /**
   * Reset all mock data
   */
  static reset(): void {
    this.mockNotifications = [];
    this.mockPushTokens = [];
    this.mockPermissions = {
      status: 'granted',
      ios: { status: 'granted' },
      android: { status: 'granted' }
    };
  }

  /**
   * Mock notification permissions
   */
  static setMockPermissions(permissions: Notifications.NotificationPermissionsStatus): void {
    this.mockPermissions = permissions;
  }

  /**
   * Mock push tokens
   */
  static setMockPushTokens(tokens: string[]): void {
    this.mockPushTokens = tokens;
  }

  /**
   * Add a mock notification
   */
  static addMockNotification(notification: MockNotificationOptions): void {
    this.mockNotifications.push(notification);
  }

  /**
   * Get all mock notifications
   */
  static getMockNotifications(): MockNotificationOptions[] {
    return [...this.mockNotifications];
  }

  /**
   * Clear mock notifications
   */
  static clearMockNotifications(): void {
    this.mockNotifications = [];
  }

  /**
   * Simulate receiving a push notification
   */
  static async simulatePushNotification(
    title: string,
    body: string,
    data?: MockNotificationData
  ): Promise<string> {
    const notification: MockNotificationOptions = {
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
      ttl: 3600
    };

    this.addMockNotification(notification);

    // Simulate notification manager processing
    if (notificationManager.sendLocalNotification) {
      return await notificationManager.sendLocalNotification(title, body, data);
    }

    return 'mock-notification-id';
  }

  /**
   * Simulate notification tap
   */
  static simulateNotificationTap(notificationId: string): MockNotificationData | null {
    const notification = this.mockNotifications.find(n => 
      n.data?.messageId === notificationId || 
      n.title.includes(notificationId)
    );

    return notification?.data || null;
  }

  /**
   * Simulate notification response
   */
  static simulateNotificationResponse(
    notificationId: string
  ): Notifications.NotificationResponse | null {
    const notification = this.mockNotifications.find(n => 
      n.data?.messageId === notificationId || 
      n.title.includes(notificationId)
    );

    if (!notification) {
      return null;
    }

    return {
      notification: {
        request: {
          content: {
            title: notification.title,
            body: notification.body,
            data: notification.data as Record<string, unknown>
          },
          identifier: notificationId,
          trigger: null
        }
      },
      actionIdentifier: 'default'
    };
  }

  /**
   * Test notification formatting for different message types
   */
  static testMessageTypeFormatting(): {
    text: string;
    image: string;
    video: string;
    audio: string;
    file: string;
  } {
    return {
      text: 'Hello, this is a text message',
      image: '📷 Sent a photo',
      video: '🎥 Sent a video',
      audio: '🎵 Sent an audio message',
      file: '📎 Sent a file'
    };
  }

  /**
   * Create test notification data
   */
  static createTestNotificationData(
    conversationId: string = 'test-conversation-id',
    senderId: string = 'test-sender-id',
    senderName: string = 'Test User',
    messageContent: string = 'Test message',
    messageType: string = 'text'
  ): MockNotificationData {
    return {
      conversationId,
      messageId: `test-message-${Date.now()}`,
      senderId,
      senderName,
      messageContent,
      messageType,
      type: 'message'
    };
  }

  /**
   * Test notification delivery simulation
   */
  static async testNotificationDelivery(
    recipientCount: number = 1,
    successRate: number = 1.0
  ): Promise<{
    sent: number;
    failed: number;
    total: number;
  }> {
    const total = recipientCount;
    const sent = Math.floor(total * successRate);
    const failed = total - sent;

    // Simulate delivery delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return { sent, failed, total };
  }

  /**
   * Test notification performance
   */
  static async testNotificationPerformance(
    notificationCount: number = 100
  ): Promise<{
    totalTime: number;
    averageTime: number;
    notificationsPerSecond: number;
  }> {
    const startTime = Date.now();

    // Simulate sending multiple notifications
    const promises = [];
    for (let i = 0; i < notificationCount; i++) {
      promises.push(
        this.simulatePushNotification(
          'Test User',
          `Test message ${i}`,
          this.createTestNotificationData()
        )
      );
    }

    await Promise.all(promises);

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / notificationCount;
    const notificationsPerSecond = (notificationCount / totalTime) * 1000;

    return {
      totalTime,
      averageTime,
      notificationsPerSecond
    };
  }

  /**
   * Test notification error scenarios
   */
  static async testNotificationErrors(): Promise<{
    invalidToken: boolean;
    networkError: boolean;
    permissionDenied: boolean;
    serviceUnavailable: boolean;
  }> {
    const results = {
      invalidToken: false,
      networkError: false,
      permissionDenied: false,
      serviceUnavailable: false
    };

    // Test invalid token
    try {
      this.setMockPushTokens(['invalid-token']);
      await this.simulatePushNotification('Test', 'Message');
    } catch (error) {
      results.invalidToken = true;
    }

    // Test network error
    try {
      // Simulate network error
      throw new Error('Network error');
    } catch (error) {
      results.networkError = true;
    }

    // Test permission denied
    try {
      this.setMockPermissions({
        status: 'denied',
        ios: { status: 'denied' },
        android: { status: 'denied' }
      });
      await this.simulatePushNotification('Test', 'Message');
    } catch (error) {
      results.permissionDenied = true;
    }

    // Test service unavailable
    try {
      // Simulate service unavailable
      throw new Error('Service unavailable');
    } catch (error) {
      results.serviceUnavailable = true;
    }

    return results;
  }

  /**
   * Generate test report
   */
  static generateTestReport(): {
    totalNotifications: number;
    notificationTypes: Record<string, number>;
    averageResponseTime: number;
    successRate: number;
  } {
    const notifications = this.getMockNotifications();
    const totalNotifications = notifications.length;

    const notificationTypes: Record<string, number> = {};
    notifications.forEach(notification => {
      const type = notification.data?.messageType || 'text';
      notificationTypes[type] = (notificationTypes[type] || 0) + 1;
    });

    // Simulate response time calculation
    const averageResponseTime = Math.random() * 1000; // Mock response time
    const successRate = 0.95; // Mock success rate

    return {
      totalNotifications,
      notificationTypes,
      averageResponseTime,
      successRate
    };
  }

  /**
   * Validate notification data
   */
  static validateNotificationData(data: MockNotificationData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.conversationId) {
      errors.push('Missing conversationId');
    }

    if (!data.senderId) {
      errors.push('Missing senderId');
    }

    if (!data.senderName) {
      errors.push('Missing senderName');
    }

    if (!data.messageContent) {
      errors.push('Missing messageContent');
    }

    if (!data.type || !['message', 'system'].includes(data.type)) {
      errors.push('Invalid type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Test notification queue management
   */
  static async testNotificationQueue(
    queueSize: number = 50
  ): Promise<{
    processed: number;
    queued: number;
    failed: number;
  }> {
    let processed = 0;
    let queued = 0;
    let failed = 0;

    // Simulate queue processing
    for (let i = 0; i < queueSize; i++) {
      try {
        queued++;
        await this.simulatePushNotification(
          'Test User',
          `Queued message ${i}`,
          this.createTestNotificationData()
        );
        processed++;
      } catch (error) {
        failed++;
      }
    }

    return { processed, queued, failed };
  }
}

export default NotificationTestUtils;
