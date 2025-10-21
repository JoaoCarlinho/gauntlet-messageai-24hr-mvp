import { Socket } from 'socket.io';
import * as messageService from '../../services/message.service';
import { roomManager, ROOM_TYPES } from '../room-manager';
import * as presenceService from '../../services/presence.service';

// Types for socket message events
export interface SendMessageData {
  conversationId: string;
  content: string;
  type?: string;
  mediaUrl?: string;
  tempId?: string; // For optimistic updates
}

export interface MarkReadData {
  messageId: string;
  conversationId: string;
}

export interface MarkMessagesReadData {
  conversationId: string;
  upToMessageId?: string;
}

export interface MessageStatusUpdateData {
  messageId: string;
  conversationId: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface MessageDeliveryData {
  messageId: string;
  conversationId: string;
}

// Extend Socket interface to include user property
declare module 'socket.io' {
  interface Socket {
    user?: {
      id: string;
      email: string;
      displayName: string;
      socketId: string;
      isOnline: boolean;
      lastSeen: Date;
      currentConversations: Set<string>;
    };
  }
}

/**
 * Handle send_message event - Create and broadcast new message
 */
export const handleSendMessage = async (socket: Socket, data: SendMessageData): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { conversationId, content, type = 'text', mediaUrl, tempId } = data;

    // Validate input
    if (!conversationId || !content) {
      socket.emit('error', { message: 'Conversation ID and content are required' });
      return;
    }

    if (content.trim().length === 0) {
      socket.emit('error', { message: 'Message content cannot be empty' });
      return;
    }

    // Create message in database
    const message = await messageService.createMessage(
      conversationId,
      socket.user.id,
      { content, type, mediaUrl }
    );

    // Get conversation members for delivery tracking
    const conversationMembers = await getConversationMembers(conversationId);
    const onlineMembers = await getOnlineMembersInConversation(conversationId);

    // Broadcast message to all conversation participants
    roomManager.broadcastToRoom(conversationId, 'message_received', {
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        type: message.type,
        mediaUrl: message.mediaUrl,
        status: message.status,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        sender: message.sender
      },
      conversationId: conversationId,
      sentBy: socket.user.id,
      sentAt: new Date(),
      onlineMembers: onlineMembers,
      totalMembers: conversationMembers.length
    }, ROOM_TYPES.CONVERSATION);

    // Send confirmation back to sender with optimistic update support
    socket.emit('message_sent', {
      messageId: message.id,
      tempId: tempId, // Include tempId for optimistic update confirmation
      conversationId: conversationId,
      status: 'sent',
      sentAt: new Date()
    });

    // Update sender's last seen timestamp
    await presenceService.updateUserLastSeen(socket.user.id);

    console.log(`📨 Message sent by ${socket.user.displayName} in conversation ${conversationId}`);
  } catch (error) {
    console.error('Error sending message:', error);
    socket.emit('error', { 
      message: 'Failed to send message',
      error: error instanceof Error ? error.message : 'Unknown error',
      tempId: data.tempId // Include tempId for error handling
    });
  }
};

/**
 * Handle mark_read event - Create read receipt and broadcast
 */
export const handleMarkRead = async (socket: Socket, data: MarkReadData): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { messageId, conversationId } = data;

    // Validate input
    if (!messageId || !conversationId) {
      socket.emit('error', { message: 'Message ID and conversation ID are required' });
      return;
    }

    // Create read receipt in database
    const readReceipt = await messageService.createReadReceipt({
      messageId,
      userId: socket.user.id
    });

    // Get message details for broadcast
    const message = await messageService.getMessageById(messageId, socket.user.id);
    if (!message) {
      socket.emit('error', { message: 'Message not found' });
      return;
    }

    // Broadcast read receipt to conversation
    roomManager.broadcastToRoom(conversationId, 'message_read', {
      messageId: messageId,
      conversationId: conversationId,
      readBy: socket.user.id,
      readByDisplayName: socket.user.displayName,
      readAt: readReceipt.readAt,
      messageStatus: message.status
    }, ROOM_TYPES.CONVERSATION);

    // Update user's last seen timestamp
    await presenceService.updateUserLastSeen(socket.user.id);

    console.log(`👁️ Message read by ${socket.user.displayName}: ${messageId}`);
  } catch (error) {
    console.error('Error marking message as read:', error);
    socket.emit('error', { 
      message: 'Failed to mark message as read',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle mark_messages_read event - Mark multiple messages as read
 */
export const handleMarkMessagesRead = async (socket: Socket, data: MarkMessagesReadData): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { conversationId, upToMessageId } = data;

    // Validate input
    if (!conversationId) {
      socket.emit('error', { message: 'Conversation ID is required' });
      return;
    }

    // Mark messages as read in database
    const result = await messageService.markMessagesAsRead(
      conversationId,
      socket.user.id,
      upToMessageId
    );

    // Broadcast read confirmation to conversation
    roomManager.broadcastToRoom(conversationId, 'messages_read', {
      conversationId: conversationId,
      readBy: socket.user.id,
      readByDisplayName: socket.user.displayName,
      readCount: result.readCount,
      readAt: new Date(),
      upToMessageId: upToMessageId
    }, ROOM_TYPES.CONVERSATION);

    // Update user's last seen timestamp
    await presenceService.updateUserLastSeen(socket.user.id);

    console.log(`👁️ ${result.readCount} messages read by ${socket.user.displayName} in conversation ${conversationId}`);
  } catch (error) {
    console.error('Error marking messages as read:', error);
    socket.emit('error', { 
      message: 'Failed to mark messages as read',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle message_status_update event - Update message status
 */
export const handleMessageStatusUpdate = async (socket: Socket, data: MessageStatusUpdateData): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { messageId, conversationId, status } = data;

    // Validate input
    if (!messageId || !conversationId || !status) {
      socket.emit('error', { message: 'Message ID, conversation ID, and status are required' });
      return;
    }

    // Update message status in database
    const updatedMessage = await messageService.updateMessageStatus(
      messageId,
      socket.user.id,
      { status }
    );

    // Broadcast status update to conversation
    roomManager.broadcastToRoom(conversationId, 'message_status_updated', {
      messageId: messageId,
      conversationId: conversationId,
      status: status,
      updatedBy: socket.user.id,
      updatedByDisplayName: socket.user.displayName,
      updatedAt: new Date(),
      message: updatedMessage
    }, ROOM_TYPES.CONVERSATION);

    console.log(`📊 Message status updated by ${socket.user.displayName}: ${status}`);
  } catch (error) {
    console.error('Error updating message status:', error);
    socket.emit('error', { 
      message: 'Failed to update message status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle message_delivered event - Confirm message delivery
 */
export const handleMessageDelivered = async (socket: Socket, data: MessageDeliveryData): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { messageId, conversationId } = data;

    // Validate input
    if (!messageId || !conversationId) {
      socket.emit('error', { message: 'Message ID and conversation ID are required' });
      return;
    }

    // Update message status to delivered
    await messageService.updateMessageStatus(
      messageId,
      socket.user.id,
      { status: 'delivered' }
    );

    // Broadcast delivery confirmation to conversation
    roomManager.broadcastToRoom(conversationId, 'message_delivered', {
      messageId: messageId,
      conversationId: conversationId,
      deliveredTo: socket.user.id,
      deliveredToDisplayName: socket.user.displayName,
      deliveredAt: new Date()
    }, ROOM_TYPES.CONVERSATION);

    console.log(`📬 Message delivered to ${socket.user.displayName}: ${messageId}`);
  } catch (error) {
    console.error('Error confirming message delivery:', error);
    socket.emit('error', { 
      message: 'Failed to confirm message delivery',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle get_message event - Get specific message details
 */
export const handleGetMessage = async (socket: Socket, data: { messageId: string }): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { messageId } = data;

    // Validate input
    if (!messageId) {
      socket.emit('error', { message: 'Message ID is required' });
      return;
    }

    // Get message from database
    const message = await messageService.getMessageById(messageId, socket.user.id);

    if (!message) {
      socket.emit('error', { message: 'Message not found' });
      return;
    }

    // Send message details back to requester
    socket.emit('message_details', {
      message: message,
      requestedAt: new Date()
    });

    console.log(`📄 Message details requested by ${socket.user.displayName}: ${messageId}`);
  } catch (error) {
    console.error('Error getting message details:', error);
    socket.emit('error', { 
      message: 'Failed to get message details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle delete_message event - Delete a message
 */
export const handleDeleteMessage = async (socket: Socket, data: { messageId: string, conversationId: string }): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { messageId, conversationId } = data;

    // Validate input
    if (!messageId || !conversationId) {
      socket.emit('error', { message: 'Message ID and conversation ID are required' });
      return;
    }

    // Delete message in database
    const deletedMessage = await messageService.deleteMessage(messageId, socket.user.id);

    // Broadcast message deletion to conversation
    roomManager.broadcastToRoom(conversationId, 'message_deleted', {
      messageId: messageId,
      conversationId: conversationId,
      deletedBy: socket.user.id,
      deletedByDisplayName: socket.user.displayName,
      deletedAt: new Date(),
      message: deletedMessage
    }, ROOM_TYPES.CONVERSATION);

    console.log(`🗑️ Message deleted by ${socket.user.displayName}: ${messageId}`);
  } catch (error) {
    console.error('Error deleting message:', error);
    socket.emit('error', { 
      message: 'Failed to delete message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Helper function to get conversation members
 */
const getConversationMembers = async (conversationId: string): Promise<string[]> => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const members = await prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true }
    });

    await prisma.$disconnect();
    return members.map(member => member.userId);
  } catch (error) {
    console.error('Error getting conversation members:', error);
    return [];
  }
};

/**
 * Helper function to get online members in a conversation
 */
const getOnlineMembersInConversation = async (conversationId: string): Promise<string[]> => {
  try {
    return await roomManager.getRoomMembers(conversationId, ROOM_TYPES.CONVERSATION);
  } catch (error) {
    console.error('Error getting online members in conversation:', error);
    return [];
  }
};

/**
 * Set up message event handlers for a socket
 */
export const setupMessageHandlers = (socket: Socket): void => {
  // Handle send_message event
  socket.on('send_message', (data: SendMessageData) => {
    handleSendMessage(socket, data);
  });

  // Handle mark_read event
  socket.on('mark_read', (data: MarkReadData) => {
    handleMarkRead(socket, data);
  });

  // Handle mark_messages_read event
  socket.on('mark_messages_read', (data: MarkMessagesReadData) => {
    handleMarkMessagesRead(socket, data);
  });

  // Handle message_status_update event
  socket.on('message_status_update', (data: MessageStatusUpdateData) => {
    handleMessageStatusUpdate(socket, data);
  });

  // Handle message_delivered event
  socket.on('message_delivered', (data: MessageDeliveryData) => {
    handleMessageDelivered(socket, data);
  });

  // Handle get_message event
  socket.on('get_message', (data: { messageId: string }) => {
    handleGetMessage(socket, data);
  });

  // Handle delete_message event
  socket.on('delete_message', (data: { messageId: string, conversationId: string }) => {
    handleDeleteMessage(socket, data);
  });

  console.log(`📨 Message handlers set up for socket: ${socket.id}`);
};
