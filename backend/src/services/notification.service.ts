import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';
import { getUsersWithPushTokens } from './users.service';
import prisma from '../config/database';

// Create a new Expo SDK client
const expo = new Expo();

export interface NotificationData {
  conversationId: string;
  messageId?: string;
  senderId: string;
  senderName: string;
  messageContent: string;
  messageType?: string;
  type: 'message' | 'system';
}

export interface NotificationResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
  tickets?: ExpoPushTicket[];
}

export interface NotificationOptions {
  title?: string;
  body?: string;
  data?: NotificationData;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number; // Time to live in seconds
}

/**
 * Send push notification to a single user
 */
export const sendPushNotification = async (
  userId: string,
  options: NotificationOptions
): Promise<NotificationResult> => {
  try {
    // Get user's push tokens
    const users = await getUsersWithPushTokens([userId]);
    
    if (users.length === 0 || users[0].pushTokens.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['User has no push tokens registered']
      };
    }

    const user = users[0];
    const pushTokens = user.pushTokens;

    // Filter out invalid push tokens
    const validPushTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));
    
    if (validPushTokens.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['No valid push tokens found for user']
      };
    }

    // Create push messages
    const messages: ExpoPushMessage[] = validPushTokens.map(pushToken => ({
      to: pushToken,
      title: options.title || 'MessageAI',
      body: options.body || 'You have a new message',
      data: options.data as unknown as Record<string, unknown>,
      sound: options.sound || 'default',
      badge: options.badge,
      priority: options.priority || 'high',
      ttl: options.ttl || 3600, // 1 hour default
    }));

    // Send push notifications
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];
    const errors: string[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
        errors.push(`Failed to send chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Count successful and failed notifications
    let sentCount = 0;
    let failedCount = 0;

    tickets.forEach(ticket => {
      if (ticket.status === 'ok') {
        sentCount++;
      } else {
        failedCount++;
        errors.push(`Push notification failed: ${ticket.message || 'Unknown error'}`);
      }
    });

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      errors,
      tickets
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Send push notification to multiple users
 */
export const sendPushNotificationToUsers = async (
  userIds: string[],
  options: NotificationOptions
): Promise<NotificationResult> => {
  try {
    // Get users with push tokens
    const users = await getUsersWithPushTokens(userIds);
    
    if (users.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['No users with push tokens found']
      };
    }

    // Collect all valid push tokens
    const allPushTokens: string[] = [];
    users.forEach(user => {
      const validTokens = user.pushTokens.filter(token => Expo.isExpoPushToken(token));
      allPushTokens.push(...validTokens);
    });

    if (allPushTokens.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['No valid push tokens found for any user']
      };
    }

    // Create push messages
    const messages: ExpoPushMessage[] = allPushTokens.map(pushToken => ({
      to: pushToken,
      title: options.title || 'MessageAI',
      body: options.body || 'You have a new message',
      data: options.data as unknown as Record<string, unknown>,
      sound: options.sound || 'default',
      badge: options.badge,
      priority: options.priority || 'high',
      ttl: options.ttl || 3600, // 1 hour default
    }));

    // Send push notifications
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];
    const errors: string[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
        errors.push(`Failed to send chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Count successful and failed notifications
    let sentCount = 0;
    let failedCount = 0;

    tickets.forEach(ticket => {
      if (ticket.status === 'ok') {
        sentCount++;
      } else {
        failedCount++;
        errors.push(`Push notification failed: ${ticket.message || 'Unknown error'}`);
      }
    });

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      errors,
      tickets
    };
  } catch (error) {
    console.error('Error sending push notifications to users:', error);
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Send message notification to conversation members (excluding sender)
 */
export const sendMessageNotification = async (
  conversationId: string,
  senderId: string,
  senderName: string,
  messageContent: string,
  messageId: string,
  messageType: string = 'text'
): Promise<NotificationResult> => {
  try {
    // Get conversation members (excluding sender)
    const conversationMembers = await getConversationMembers(conversationId);
    const recipientIds = conversationMembers
      .filter(member => member.userId !== senderId)
      .map(member => member.userId);

    if (recipientIds.length === 0) {
      return {
        success: true,
        sentCount: 0,
        failedCount: 0,
        errors: []
      };
    }

    // Create notification data
    const notificationData: NotificationData = {
      conversationId,
      messageId,
      senderId,
      senderName,
      messageContent: truncateMessage(messageContent, 100),
      messageType,
      type: 'message'
    };

    // Create notification options
    const options: NotificationOptions = {
      title: senderName,
      body: formatMessagePreview(messageContent, messageType),
      data: notificationData,
      sound: 'default',
      priority: 'high',
      ttl: 3600 // 1 hour
    };

    // Send notifications to all recipients
    return await sendPushNotificationToUsers(recipientIds, options);
  } catch (error) {
    console.error('Error sending message notification:', error);
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Send system notification to a user
 */
export const sendSystemNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Partial<NotificationData>
): Promise<NotificationResult> => {
  try {
    const notificationData: NotificationData = {
      conversationId: data?.conversationId || '',
      senderId: data?.senderId || 'system',
      senderName: data?.senderName || 'System',
      messageContent: body,
      type: 'system',
      ...data
    };

    const options: NotificationOptions = {
      title,
      body,
      data: notificationData,
      sound: 'default',
      priority: 'normal',
      ttl: 7200 // 2 hours for system notifications
    };

    return await sendPushNotification(userId, options);
  } catch (error) {
    console.error('Error sending system notification:', error);
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Check push notification receipts
 */
export const checkPushNotificationReceipts = async (
  tickets: ExpoPushTicket[]
): Promise<ExpoPushReceipt[]> => {
  try {
    const receiptIds = tickets
      .filter(ticket => ticket.status === 'ok' && 'id' in ticket)
      .map(ticket => (ticket as any).id);

    if (receiptIds.length === 0) {
      return [];
    }

    const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);
    return Object.values(receipts);
  } catch (error) {
    console.error('Error checking push notification receipts:', error);
    return [];
  }
};

/**
 * Get conversation members (helper function)
 */
const getConversationMembers = async (conversationId: string): Promise<Array<{ userId: string }>> => {
  try {
    const members = await prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true }
    });
    return members;
  } catch (error) {
    console.error('Error getting conversation members:', error);
    return [];
  }
};

/**
 * Truncate message content for notification
 */
const truncateMessage = (content: string, maxLength: number): string => {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength - 3) + '...';
};

/**
 * Format message preview for notification body
 */
const formatMessagePreview = (content: string, messageType: string): string => {
  switch (messageType) {
    case 'image':
      return '📷 Sent a photo';
    case 'video':
      return '🎥 Sent a video';
    case 'audio':
      return '🎵 Sent an audio message';
    case 'file':
      return '📎 Sent a file';
    case 'system':
      return content;
    default:
      return truncateMessage(content, 80);
  }
};

/**
 * Send notification to all users (for system-wide announcements)
 */
export const sendBroadcastNotification = async (
  title: string,
  body: string,
  data?: Partial<NotificationData>
): Promise<NotificationResult> => {
  try {
    // Get all users with push tokens
    const users = await getUsersWithPushTokens();
    
    if (users.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['No users with push tokens found']
      };
    }

    const userIds = users.map(user => user.id);
    const notificationData: NotificationData = {
      conversationId: data?.conversationId || '',
      senderId: data?.senderId || 'system',
      senderName: data?.senderName || 'System',
      messageContent: body,
      type: 'system',
      ...data
    };

    const options: NotificationOptions = {
      title,
      body,
      data: notificationData,
      sound: 'default',
      priority: 'normal',
      ttl: 7200 // 2 hours for system notifications
    };

    return await sendPushNotificationToUsers(userIds, options);
  } catch (error) {
    console.error('Error sending broadcast notification:', error);
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Clean up invalid push tokens based on receipt errors
 */
export const cleanupInvalidPushTokens = async (receipts: ExpoPushReceipt[]): Promise<void> => {
  try {
    const invalidTokens: string[] = [];
    
    receipts.forEach(receipt => {
      if (receipt.status === 'error') {
        const error = receipt.details?.error;
        if (error === 'DeviceNotRegistered' || error === 'InvalidCredentials') {
          // These errors indicate the push token is invalid and should be removed
          if (receipt.details?.expoPushToken) {
            invalidTokens.push(receipt.details.expoPushToken);
          }
        }
      }
    });

    // Remove invalid tokens from users
    if (invalidTokens.length > 0) {
      console.log(`Cleaning up ${invalidTokens.length} invalid push tokens`);
      // This would typically call the users service to remove these tokens
      // For now, we'll just log them
      console.log('Invalid tokens to remove:', invalidTokens);
    }
  } catch (error) {
    console.error('Error cleaning up invalid push tokens:', error);
  }
};

export default {
  sendPushNotification,
  sendPushNotificationToUsers,
  sendMessageNotification,
  sendSystemNotification,
  sendBroadcastNotification,
  checkPushNotificationReceipts,
  cleanupInvalidPushTokens
};
