import { messagesLogic } from '../../store/messages';
import { Message, MessageStatus } from '../../types';

// Mock dependencies
jest.mock('../../db/queries', () => ({
  createDatabaseQueries: jest.fn(() => ({
    getMessagesForConversation: jest.fn().mockResolvedValue([]),
    insertMessage: jest.fn().mockResolvedValue(undefined),
    updateMessageStatus: jest.fn().mockResolvedValue(undefined),
    deleteMessage: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({})),
}));

describe('Messages Store - Offline Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Status Management', () => {
    it('should update connection status', () => {
      const { actions, values } = messagesLogic.build();
      
      actions.setConnectionStatus('connected');
      expect(values.connectionStatus).toBe('connected');
      expect(values.isOffline).toBe(false);
      
      actions.setConnectionStatus('disconnected');
      expect(values.connectionStatus).toBe('disconnected');
      expect(values.isOffline).toBe(true);
      
      actions.setConnectionStatus('reconnecting');
      expect(values.connectionStatus).toBe('reconnecting');
      expect(values.isOffline).toBe(true);
    });
  });

  describe('Message Queuing', () => {
    it('should queue messages when offline', () => {
      const { actions, values } = messagesLogic.build();
      
      // Set offline status
      actions.setConnectionStatus('disconnected');
      
      const testMessage: Message = {
        id: 'temp_123',
        conversationId: 'conv_1',
        senderId: 'user_1',
        content: 'Test message',
        type: 'text',
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user_1',
          email: 'test@example.com',
          displayName: 'Test User',
          lastSeen: new Date(),
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      actions.queueMessage(testMessage);
      
      expect(values.queuedMessages).toHaveProperty('temp_123');
      expect(values.queuedMessages['temp_123']).toEqual(testMessage);
    });

    it('should remove queued messages', () => {
      const { actions, values } = messagesLogic.build();
      
      const testMessage: Message = {
        id: 'temp_123',
        conversationId: 'conv_1',
        senderId: 'user_1',
        content: 'Test message',
        type: 'text',
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user_1',
          email: 'test@example.com',
          displayName: 'Test User',
          lastSeen: new Date(),
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      // Queue message
      actions.queueMessage(testMessage);
      expect(values.queuedMessages).toHaveProperty('temp_123');
      
      // Remove queued message
      actions.removeQueuedMessage('temp_123');
      expect(values.queuedMessages).not.toHaveProperty('temp_123');
    });

    it('should process queued messages', () => {
      const { actions, values } = messagesLogic.build();
      
      const testMessage1: Message = {
        id: 'temp_123',
        conversationId: 'conv_1',
        senderId: 'user_1',
        content: 'Test message 1',
        type: 'text',
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user_1',
          email: 'test@example.com',
          displayName: 'Test User',
          lastSeen: new Date(),
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      const testMessage2: Message = {
        id: 'temp_456',
        conversationId: 'conv_1',
        senderId: 'user_1',
        content: 'Test message 2',
        type: 'text',
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user_1',
          email: 'test@example.com',
          displayName: 'Test User',
          lastSeen: new Date(),
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      // Queue messages
      actions.queueMessage(testMessage1);
      actions.queueMessage(testMessage2);
      
      expect(Object.keys(values.queuedMessages)).toHaveLength(2);
      
      // Process queued messages
      actions.processQueuedMessages();
      
      expect(Object.keys(values.queuedMessages)).toHaveLength(0);
    });
  });

  describe('Offline Message Sending', () => {
    it('should queue messages when sending while offline', () => {
      const { actions, values } = messagesLogic.build();
      
      // Mock auth state
      const mockAuthState = {
        user: { id: 'user_1' }
      };
      
      // Set offline status
      actions.setConnectionStatus('disconnected');
      
      const sendData = {
        conversationId: 'conv_1',
        content: 'Test message',
        type: 'text' as const,
      };
      
      // Mock the sendMessage action
      actions.sendMessage(sendData);
      
      // Should have queued messages
      expect(Object.keys(values.queuedMessages).length).toBeGreaterThan(0);
    });

    it('should send messages immediately when online', () => {
      const { actions, values } = messagesLogic.build();
      
      // Mock auth state
      const mockAuthState = {
        user: { id: 'user_1' }
      };
      
      // Set online status
      actions.setConnectionStatus('connected');
      
      const sendData = {
        conversationId: 'conv_1',
        content: 'Test message',
        type: 'text' as const,
      };
      
      // Mock the sendMessage action
      actions.sendMessage(sendData);
      
      // Should not have queued messages when online
      expect(Object.keys(values.queuedMessages)).toHaveLength(0);
    });
  });

  describe('Selectors', () => {
    it('should return queued messages', () => {
      const { actions, values } = messagesLogic.build();
      
      const testMessage: Message = {
        id: 'temp_123',
        conversationId: 'conv_1',
        senderId: 'user_1',
        content: 'Test message',
        type: 'text',
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user_1',
          email: 'test@example.com',
          displayName: 'Test User',
          lastSeen: new Date(),
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      actions.queueMessage(testMessage);
      
      const queuedMessages = values.getQueuedMessages();
      expect(queuedMessages).toHaveLength(1);
      expect(queuedMessages[0]).toEqual(testMessage);
    });

    it('should return queued message count', () => {
      const { actions, values } = messagesLogic.build();
      
      const testMessage1: Message = {
        id: 'temp_123',
        conversationId: 'conv_1',
        senderId: 'user_1',
        content: 'Test message 1',
        type: 'text',
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user_1',
          email: 'test@example.com',
          displayName: 'Test User',
          lastSeen: new Date(),
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      const testMessage2: Message = {
        id: 'temp_456',
        conversationId: 'conv_1',
        senderId: 'user_1',
        content: 'Test message 2',
        type: 'text',
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user_1',
          email: 'test@example.com',
          displayName: 'Test User',
          lastSeen: new Date(),
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      actions.queueMessage(testMessage1);
      actions.queueMessage(testMessage2);
      
      expect(values.getQueuedMessageCount()).toBe(2);
      expect(values.hasQueuedMessages()).toBe(true);
    });

    it('should return connection status', () => {
      const { actions, values } = messagesLogic.build();
      
      actions.setConnectionStatus('connected');
      expect(values.getConnectionStatus()).toBe('connected');
      
      actions.setConnectionStatus('disconnected');
      expect(values.getConnectionStatus()).toBe('disconnected');
      expect(values.isOffline).toBe(true);
    });
  });

  describe('Reconnection Handling', () => {
    it('should process queued messages on reconnection', () => {
      const { actions, values } = messagesLogic.build();
      
      // Queue some messages while offline
      const testMessage: Message = {
        id: 'temp_123',
        conversationId: 'conv_1',
        senderId: 'user_1',
        content: 'Test message',
        type: 'text',
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user_1',
          email: 'test@example.com',
          displayName: 'Test User',
          lastSeen: new Date(),
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      actions.setConnectionStatus('disconnected');
      actions.queueMessage(testMessage);
      
      expect(Object.keys(values.queuedMessages)).toHaveLength(1);
      
      // Simulate reconnection
      actions.setConnectionStatus('connected');
      
      // Should trigger processing of queued messages
      // (This would be handled by the listener in a real scenario)
      actions.processQueuedMessages();
      
      expect(Object.keys(values.queuedMessages)).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', () => {
      const { actions } = messagesLogic.build();
      
      // Mock database error
      const mockQueries = require('../../db/queries').createDatabaseQueries();
      mockQueries.insertMessage.mockRejectedValue(new Error('Database error'));
      
      const testMessage: Message = {
        id: 'temp_123',
        conversationId: 'conv_1',
        senderId: 'user_1',
        content: 'Test message',
        type: 'text',
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user_1',
          email: 'test@example.com',
          displayName: 'Test User',
          lastSeen: new Date(),
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      // Should not throw error
      expect(() => {
        actions.queueMessage(testMessage);
      }).not.toThrow();
    });
  });
});
