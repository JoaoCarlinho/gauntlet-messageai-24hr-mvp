import {
  sendPushNotification,
  sendPushNotificationToUsers,
  sendMessageNotification,
  sendSystemNotification,
  sendBroadcastNotification,
  checkPushNotificationReceipts,
  cleanupInvalidPushTokens,
  NotificationData,
  NotificationOptions
} from '../../services/notification.service';
import { getUsersWithPushTokens } from '../../services/users.service';
import { Expo } from 'expo-server-sdk';

// Mock dependencies
jest.mock('../../services/users.service');
jest.mock('expo-server-sdk');
jest.mock('../../config/database', () => ({
  conversationMember: {
    findMany: jest.fn()
  }
}));

const mockGetUsersWithPushTokens = getUsersWithPushTokens as jest.MockedFunction<typeof getUsersWithPushTokens>;
const mockExpo = Expo as jest.MockedClass<typeof Expo>;

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Expo SDK
    mockExpo.prototype.isExpoPushToken = jest.fn().mockReturnValue(true);
    mockExpo.prototype.chunkPushNotifications = jest.fn().mockReturnValue([]);
    mockExpo.prototype.sendPushNotificationsAsync = jest.fn().mockResolvedValue([]);
    mockExpo.prototype.getPushNotificationReceiptsAsync = jest.fn().mockResolvedValue({});
  });

  describe('sendPushNotification', () => {
    it('should send push notification to user with valid tokens', async () => {
      const mockUser = {
        id: 'user1',
        displayName: 'Test User',
        pushTokens: ['ExponentPushToken[valid-token]']
      };
      
      mockGetUsersWithPushTokens.mockResolvedValue([mockUser]);
      mockExpo.prototype.sendPushNotificationsAsync.mockResolvedValue([
        { status: 'ok', id: 'ticket-1' }
      ]);

      const options: NotificationOptions = {
        title: 'Test Title',
        body: 'Test Body',
        data: {
          conversationId: 'conv1',
          senderId: 'sender1',
          senderName: 'Sender',
          messageContent: 'Test message',
          type: 'message'
        }
      };

      const result = await sendPushNotification('user1', options);

      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(mockGetUsersWithPushTokens).toHaveBeenCalledWith(['user1']);
    });

    it('should handle user with no push tokens', async () => {
      mockGetUsersWithPushTokens.mockResolvedValue([]);

      const options: NotificationOptions = {
        title: 'Test Title',
        body: 'Test Body'
      };

      const result = await sendPushNotification('user1', options);

      expect(result.success).toBe(false);
      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toContain('User has no push tokens registered');
    });

    it('should handle invalid push tokens', async () => {
      const mockUser = {
        id: 'user1',
        displayName: 'Test User',
        pushTokens: ['invalid-token']
      };
      
      mockGetUsersWithPushTokens.mockResolvedValue([mockUser]);
      mockExpo.prototype.isExpoPushToken.mockReturnValue(false);

      const options: NotificationOptions = {
        title: 'Test Title',
        body: 'Test Body'
      };

      const result = await sendPushNotification('user1', options);

      expect(result.success).toBe(false);
      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toContain('No valid push tokens found for user');
    });
  });

  describe('sendPushNotificationToUsers', () => {
    it('should send push notification to multiple users', async () => {
      const mockUsers = [
        {
          id: 'user1',
          displayName: 'User 1',
          pushTokens: ['ExponentPushToken[token1]']
        },
        {
          id: 'user2',
          displayName: 'User 2',
          pushTokens: ['ExponentPushToken[token2]']
        }
      ];
      
      mockGetUsersWithPushTokens.mockResolvedValue(mockUsers);
      mockExpo.prototype.sendPushNotificationsAsync.mockResolvedValue([
        { status: 'ok', id: 'ticket-1' },
        { status: 'ok', id: 'ticket-2' }
      ]);

      const options: NotificationOptions = {
        title: 'Test Title',
        body: 'Test Body'
      };

      const result = await sendPushNotificationToUsers(['user1', 'user2'], options);

      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });
  });

  describe('sendMessageNotification', () => {
    it('should send message notification to conversation members', async () => {
      // Mock conversation members
      const mockMembers = [
        { userId: 'user1' },
        { userId: 'user2' }
      ];
      
      const mockPrisma = require('../../config/database');
      mockPrisma.conversationMember.findMany.mockResolvedValue(mockMembers);

      const mockUsers = [
        {
          id: 'user1',
          displayName: 'User 1',
          pushTokens: ['ExponentPushToken[token1]']
        },
        {
          id: 'user2',
          displayName: 'User 2',
          pushTokens: ['ExponentPushToken[token2]']
        }
      ];
      
      mockGetUsersWithPushTokens.mockResolvedValue(mockUsers);
      mockExpo.prototype.sendPushNotificationsAsync.mockResolvedValue([
        { status: 'ok', id: 'ticket-1' },
        { status: 'ok', id: 'ticket-2' }
      ]);

      const result = await sendMessageNotification(
        'conv1',
        'sender1',
        'Sender Name',
        'Hello world!',
        'msg1',
        'text'
      );

      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(2);
      expect(mockGetUsersWithPushTokens).toHaveBeenCalledWith(['user1', 'user2']);
    });

    it('should exclude sender from notification recipients', async () => {
      const mockMembers = [
        { userId: 'sender1' },
        { userId: 'user1' }
      ];
      
      const mockPrisma = require('../../config/database');
      mockPrisma.conversationMember.findMany.mockResolvedValue(mockMembers);

      const mockUsers = [
        {
          id: 'user1',
          displayName: 'User 1',
          pushTokens: ['ExponentPushToken[token1]']
        }
      ];
      
      mockGetUsersWithPushTokens.mockResolvedValue(mockUsers);
      mockExpo.prototype.sendPushNotificationsAsync.mockResolvedValue([
        { status: 'ok', id: 'ticket-1' }
      ]);

      const result = await sendMessageNotification(
        'conv1',
        'sender1',
        'Sender Name',
        'Hello world!',
        'msg1',
        'text'
      );

      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(1);
      expect(mockGetUsersWithPushTokens).toHaveBeenCalledWith(['user1']);
    });
  });

  describe('sendSystemNotification', () => {
    it('should send system notification to user', async () => {
      const mockUser = {
        id: 'user1',
        displayName: 'Test User',
        pushTokens: ['ExponentPushToken[valid-token]']
      };
      
      mockGetUsersWithPushTokens.mockResolvedValue([mockUser]);
      mockExpo.prototype.sendPushNotificationsAsync.mockResolvedValue([
        { status: 'ok', id: 'ticket-1' }
      ]);

      const result = await sendSystemNotification(
        'user1',
        'System Update',
        'Your account has been updated',
        { conversationId: 'conv1' }
      );

      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(1);
    });
  });

  describe('sendBroadcastNotification', () => {
    it('should send broadcast notification to all users', async () => {
      const mockUsers = [
        {
          id: 'user1',
          displayName: 'User 1',
          pushTokens: ['ExponentPushToken[token1]']
        },
        {
          id: 'user2',
          displayName: 'User 2',
          pushTokens: ['ExponentPushToken[token2]']
        }
      ];
      
      mockGetUsersWithPushTokens.mockResolvedValue(mockUsers);
      mockExpo.prototype.sendPushNotificationsAsync.mockResolvedValue([
        { status: 'ok', id: 'ticket-1' },
        { status: 'ok', id: 'ticket-2' }
      ]);

      const result = await sendBroadcastNotification(
        'System Maintenance',
        'The system will be down for maintenance',
        { conversationId: 'system' }
      );

      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(2);
    });
  });

  describe('checkPushNotificationReceipts', () => {
    it('should check push notification receipts', async () => {
      const mockTickets = [
        { status: 'ok', id: 'ticket-1' },
        { status: 'ok', id: 'ticket-2' }
      ];
      
      const mockReceipts = {
        'ticket-1': { status: 'ok' },
        'ticket-2': { status: 'error', details: { error: 'DeviceNotRegistered' } }
      };
      
      mockExpo.prototype.getPushNotificationReceiptsAsync.mockResolvedValue(mockReceipts);

      const result = await checkPushNotificationReceipts(mockTickets);

      expect(result).toHaveLength(2);
      expect(mockExpo.prototype.getPushNotificationReceiptsAsync).toHaveBeenCalledWith(['ticket-1', 'ticket-2']);
    });
  });

  describe('cleanupInvalidPushTokens', () => {
    it('should identify invalid push tokens from receipts', async () => {
      const mockReceipts = [
        { status: 'ok' },
        { 
          status: 'error', 
          details: { 
            error: 'DeviceNotRegistered',
            expoPushToken: 'ExponentPushToken[invalid-token]'
          }
        },
        { 
          status: 'error', 
          details: { 
            error: 'InvalidCredentials',
            expoPushToken: 'ExponentPushToken[invalid-token-2]'
          }
        }
      ];

      // Mock console.log to capture the output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await cleanupInvalidPushTokens(mockReceipts);

      expect(consoleSpy).toHaveBeenCalledWith('Cleaning up 2 invalid push tokens');
      expect(consoleSpy).toHaveBeenCalledWith('Invalid tokens to remove:', [
        'ExponentPushToken[invalid-token]',
        'ExponentPushToken[invalid-token-2]'
      ]);

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully in sendPushNotification', async () => {
      mockGetUsersWithPushTokens.mockRejectedValue(new Error('Database error'));

      const options: NotificationOptions = {
        title: 'Test Title',
        body: 'Test Body'
      };

      const result = await sendPushNotification('user1', options);

      expect(result.success).toBe(false);
      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toContain('Database error');
    });

    it('should handle Expo API errors', async () => {
      const mockUser = {
        id: 'user1',
        displayName: 'Test User',
        pushTokens: ['ExponentPushToken[valid-token]']
      };
      
      mockGetUsersWithPushTokens.mockResolvedValue([mockUser]);
      mockExpo.prototype.sendPushNotificationsAsync.mockRejectedValue(new Error('Expo API error'));

      const options: NotificationOptions = {
        title: 'Test Title',
        body: 'Test Body'
      };

      const result = await sendPushNotification('user1', options);

      expect(result.success).toBe(false);
      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toContain('Failed to send chunk: Expo API error');
    });
  });
});
