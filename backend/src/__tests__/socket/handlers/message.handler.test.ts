import { Socket } from 'socket.io';
import { handleSendMessage, SendMessageData } from '../../../socket/handlers/message.handler';
import * as messageService from '../../../services/message.service';
import * as presenceService from '../../../services/presence.service';
import { sendMessageNotification } from '../../../services/notification.service';
import { roomManager } from '../../../socket/room-manager';

// Mock dependencies
jest.mock('../../../services/message.service');
jest.mock('../../../services/presence.service');
jest.mock('../../../services/notification.service');
jest.mock('../../../socket/room-manager');

const mockMessageService = messageService as jest.Mocked<typeof messageService>;
const mockPresenceService = presenceService as jest.Mocked<typeof presenceService>;
const mockSendMessageNotification = sendMessageNotification as jest.MockedFunction<typeof sendMessageNotification>;
const mockRoomManager = roomManager as jest.Mocked<typeof roomManager>;

describe('Message Handler - Push Notifications', () => {
  let mockSocket: Partial<Socket>;
  let mockEmit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEmit = jest.fn();
    mockSocket = {
      emit: mockEmit,
      user: {
        id: 'user1',
        email: 'test@example.com',
        displayName: 'Test User',
        socketId: 'socket1',
        isOnline: true,
        lastSeen: new Date(),
        currentConversations: new Set(['conv1'])
      }
    };

    // Mock room manager methods
    mockRoomManager.broadcastToRoom = jest.fn();
    mockRoomManager.getRoomMembers = jest.fn().mockResolvedValue(['user1', 'user2']);
  });

  describe('handleSendMessage with push notifications', () => {
    it('should send push notifications to offline users', async () => {
      const messageData: SendMessageData = {
        conversationId: 'conv1',
        content: 'Hello world!',
        type: 'text'
      };

      const mockMessage = {
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'user1',
        content: 'Hello world!',
        type: 'text',
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user1',
          displayName: 'Test User'
        }
      };

      // Mock message creation
      mockMessageService.createMessage.mockResolvedValue(mockMessage);

      // Mock conversation members (user1 is sender, user2 and user3 are recipients)
      const mockGetConversationMembers = jest.fn().mockResolvedValue(['user1', 'user2', 'user3']);
      const mockGetOnlineMembersInConversation = jest.fn().mockResolvedValue(['user1', 'user2']); // user3 is offline
      const mockGetConversationDetails = jest.fn().mockResolvedValue({
        id: 'conv1',
        type: 'group',
        name: 'Test Group'
      });

      // Mock the helper functions by replacing them in the module
      jest.doMock('../../../socket/handlers/message.handler', () => ({
        ...jest.requireActual('../../../socket/handlers/message.handler'),
        getConversationMembers: mockGetConversationMembers,
        getOnlineMembersInConversation: mockGetOnlineMembersInConversation,
        getConversationDetails: mockGetConversationDetails
      }));

      // Mock push notification result
      mockSendMessageNotification.mockResolvedValue({
        success: true,
        sentCount: 1,
        failedCount: 0,
        errors: []
      });

      // Mock presence service
      mockPresenceService.updateUserLastSeen.mockResolvedValue();

      await handleSendMessage(mockSocket as Socket, messageData);

      // Verify message was created
      expect(mockMessageService.createMessage).toHaveBeenCalledWith(
        'conv1',
        'user1',
        { content: 'Hello world!', type: 'text', mediaUrl: undefined }
      );

      // Verify room broadcast
      expect(mockRoomManager.broadcastToRoom).toHaveBeenCalledWith(
        'conv1',
        'message_received',
        expect.objectContaining({
          message: expect.objectContaining({
            id: 'msg1',
            content: 'Hello world!',
            senderId: 'user1'
          }),
          conversationId: 'conv1',
          sentBy: 'user1',
          sentByDisplayName: 'Test User'
        }),
        expect.any(String)
      );

      // Verify push notification was sent
      expect(mockSendMessageNotification).toHaveBeenCalledWith(
        'conv1',
        'user1',
        'Test User',
        'Hello world!',
        'msg1',
        'text'
      );

      // Verify sender confirmation
      expect(mockEmit).toHaveBeenCalledWith('message_sent', {
        messageId: 'msg1',
        tempId: undefined,
        conversationId: 'conv1',
        status: 'sent',
        sentAt: expect.any(Date)
      });

      // Verify last seen update
      expect(mockPresenceService.updateUserLastSeen).toHaveBeenCalledWith('user1');
    });

    it('should not send push notifications if all users are online', async () => {
      const messageData: SendMessageData = {
        conversationId: 'conv1',
        content: 'Hello world!',
        type: 'text'
      };

      const mockMessage = {
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'user1',
        content: 'Hello world!',
        type: 'text',
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user1',
          displayName: 'Test User'
        }
      };

      mockMessageService.createMessage.mockResolvedValue(mockMessage);

      // All users are online
      const mockGetConversationMembers = jest.fn().mockResolvedValue(['user1', 'user2']);
      const mockGetOnlineMembersInConversation = jest.fn().mockResolvedValue(['user1', 'user2']);
      const mockGetConversationDetails = jest.fn().mockResolvedValue({
        id: 'conv1',
        type: 'direct',
        name: undefined
      });

      jest.doMock('../../../socket/handlers/message.handler', () => ({
        ...jest.requireActual('../../../socket/handlers/message.handler'),
        getConversationMembers: mockGetConversationMembers,
        getOnlineMembersInConversation: mockGetOnlineMembersInConversation,
        getConversationDetails: mockGetConversationDetails
      }));

      mockPresenceService.updateUserLastSeen.mockResolvedValue();

      await handleSendMessage(mockSocket as Socket, messageData);

      // Verify push notification was not sent
      expect(mockSendMessageNotification).not.toHaveBeenCalled();
    });

    it('should handle push notification failures gracefully', async () => {
      const messageData: SendMessageData = {
        conversationId: 'conv1',
        content: 'Hello world!',
        type: 'text'
      };

      const mockMessage = {
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'user1',
        content: 'Hello world!',
        type: 'text',
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user1',
          displayName: 'Test User'
        }
      };

      mockMessageService.createMessage.mockResolvedValue(mockMessage);

      const mockGetConversationMembers = jest.fn().mockResolvedValue(['user1', 'user2', 'user3']);
      const mockGetOnlineMembersInConversation = jest.fn().mockResolvedValue(['user1']); // user2 and user3 are offline
      const mockGetConversationDetails = jest.fn().mockResolvedValue({
        id: 'conv1',
        type: 'group',
        name: 'Test Group'
      });

      jest.doMock('../../../socket/handlers/message.handler', () => ({
        ...jest.requireActual('../../../socket/handlers/message.handler'),
        getConversationMembers: mockGetConversationMembers,
        getOnlineMembersInConversation: mockGetOnlineMembersInConversation,
        getConversationDetails: mockGetConversationDetails
      }));

      // Mock push notification failure
      mockSendMessageNotification.mockResolvedValue({
        success: false,
        sentCount: 0,
        failedCount: 2,
        errors: ['Invalid push token', 'Device not registered']
      });

      mockPresenceService.updateUserLastSeen.mockResolvedValue();

      await handleSendMessage(mockSocket as Socket, messageData);

      // Verify push notification was attempted
      expect(mockSendMessageNotification).toHaveBeenCalledWith(
        'conv1',
        'user1',
        'Test User',
        'Hello world!',
        'msg1',
        'text'
      );

      // Verify message was still sent successfully despite notification failure
      expect(mockEmit).toHaveBeenCalledWith('message_sent', expect.any(Object));
      expect(mockRoomManager.broadcastToRoom).toHaveBeenCalled();
    });

    it('should handle different message types correctly', async () => {
      const messageData: SendMessageData = {
        conversationId: 'conv1',
        content: 'Check out this image!',
        type: 'image',
        mediaUrl: 'https://example.com/image.jpg'
      };

      const mockMessage = {
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'user1',
        content: 'Check out this image!',
        type: 'image',
        mediaUrl: 'https://example.com/image.jpg',
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: 'user1',
          displayName: 'Test User'
        }
      };

      mockMessageService.createMessage.mockResolvedValue(mockMessage);

      const mockGetConversationMembers = jest.fn().mockResolvedValue(['user1', 'user2']);
      const mockGetOnlineMembersInConversation = jest.fn().mockResolvedValue(['user1']); // user2 is offline
      const mockGetConversationDetails = jest.fn().mockResolvedValue({
        id: 'conv1',
        type: 'direct',
        name: undefined
      });

      jest.doMock('../../../socket/handlers/message.handler', () => ({
        ...jest.requireActual('../../../socket/handlers/message.handler'),
        getConversationMembers: mockGetConversationMembers,
        getOnlineMembersInConversation: mockGetOnlineMembersInConversation,
        getConversationDetails: mockGetConversationDetails
      }));

      mockSendMessageNotification.mockResolvedValue({
        success: true,
        sentCount: 1,
        failedCount: 0,
        errors: []
      });

      mockPresenceService.updateUserLastSeen.mockResolvedValue();

      await handleSendMessage(mockSocket as Socket, messageData);

      // Verify push notification was sent with correct message type
      expect(mockSendMessageNotification).toHaveBeenCalledWith(
        'conv1',
        'user1',
        'Test User',
        'Check out this image!',
        'msg1',
        'image'
      );
    });

    it('should handle authentication errors', async () => {
      const messageData: SendMessageData = {
        conversationId: 'conv1',
        content: 'Hello world!',
        type: 'text'
      };

      // Mock socket without user
      const unauthenticatedSocket = {
        emit: mockEmit
      };

      await handleSendMessage(unauthenticatedSocket as Socket, messageData);

      // Verify error was emitted
      expect(mockEmit).toHaveBeenCalledWith('error', { message: 'User not authenticated' });

      // Verify no message was created
      expect(mockMessageService.createMessage).not.toHaveBeenCalled();

      // Verify no push notification was sent
      expect(mockSendMessageNotification).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const messageData: SendMessageData = {
        conversationId: 'conv1',
        content: '', // Empty content
        type: 'text'
      };

      await handleSendMessage(mockSocket as Socket, messageData);

      // Verify error was emitted
      expect(mockEmit).toHaveBeenCalledWith('error', { message: 'Message content cannot be empty' });

      // Verify no message was created
      expect(mockMessageService.createMessage).not.toHaveBeenCalled();

      // Verify no push notification was sent
      expect(mockSendMessageNotification).not.toHaveBeenCalled();
    });
  });
});
