import { Socket } from 'socket.io';
import * as presenceService from '../../services/presence.service';
import { roomManager, ROOM_TYPES } from '../room-manager';

// Types for presence socket events
export interface TypingStartData {
  conversationId: string;
  message?: string; // Optional message content being typed
}

export interface TypingStopData {
  conversationId: string;
}

export interface HeartbeatData {
  timestamp: number;
  conversationId?: string; // Optional conversation context
}

export interface PresenceUpdateData {
  isOnline: boolean;
  lastSeen?: Date;
}

export interface JoinConversationData {
  conversationId: string;
}

export interface LeaveConversationData {
  conversationId: string;
}

// Store typing states for users
const typingUsers = new Map<string, {
  conversationId: string;
  startTime: number;
  timeout?: NodeJS.Timeout;
}>();

// Typing timeout duration (in milliseconds)
const TYPING_TIMEOUT = 3000; // 3 seconds

// Extend Socket interface to include user property (if not already defined)
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
 * Handle typing_start event - User starts typing
 */
export const handleTypingStart = async (socket: Socket, data: TypingStartData): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { conversationId, message } = data;

    // Validate input
    if (!conversationId) {
      socket.emit('error', { message: 'Conversation ID is required' });
      return;
    }

    const userId = socket.user.id;
    const userKey = `${userId}:${conversationId}`;

    // Clear existing typing timeout if any
    const existingTyping = typingUsers.get(userKey);
    if (existingTyping?.timeout) {
      clearTimeout(existingTyping.timeout);
    }

    // Set new typing state
    const typingTimeout = setTimeout(() => {
      // Auto-stop typing after timeout
      handleTypingStop(socket, { conversationId });
    }, TYPING_TIMEOUT);

    typingUsers.set(userKey, {
      conversationId,
      startTime: Date.now(),
      timeout: typingTimeout as any
    });

    // Broadcast typing indicator to conversation members (except sender)
    roomManager.broadcastToRoom(conversationId, 'user_typing', {
      userId: userId,
      displayName: socket.user.displayName,
      conversationId: conversationId,
      message: message || '',
      startedAt: new Date(),
      isTyping: true
    }, ROOM_TYPES.CONVERSATION, socket.id); // Exclude sender

    // Update user's last seen timestamp
    await presenceService.updateUserLastSeen(userId);

    console.log(`⌨️ User ${socket.user.displayName} started typing in conversation ${conversationId}`);
  } catch (error) {
    console.error('Error handling typing start:', error);
    socket.emit('error', { 
      message: 'Failed to handle typing start',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle typing_stop event - User stops typing
 */
export const handleTypingStop = async (socket: Socket, data: TypingStopData): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { conversationId } = data;

    // Validate input
    if (!conversationId) {
      socket.emit('error', { message: 'Conversation ID is required' });
      return;
    }

    const userId = socket.user.id;
    const userKey = `${userId}:${conversationId}`;

    // Clear typing state
    const typingState = typingUsers.get(userKey);
    if (typingState?.timeout) {
      clearTimeout(typingState.timeout);
    }
    typingUsers.delete(userKey);

    // Broadcast typing stop to conversation members (except sender)
    roomManager.broadcastToRoom(conversationId, 'user_stopped_typing', {
      userId: userId,
      displayName: socket.user.displayName,
      conversationId: conversationId,
      stoppedAt: new Date(),
      isTyping: false
    }, ROOM_TYPES.CONVERSATION, socket.id); // Exclude sender

    // Update user's last seen timestamp
    await presenceService.updateUserLastSeen(userId);

    console.log(`⌨️ User ${socket.user.displayName} stopped typing in conversation ${conversationId}`);
  } catch (error) {
    console.error('Error handling typing stop:', error);
    socket.emit('error', { 
      message: 'Failed to handle typing stop',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle heartbeat event - User sends heartbeat to maintain connection
 */
export const handleHeartbeat = async (socket: Socket, data: HeartbeatData | null): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    // Handle case where data might be null or undefined
    const timestamp = data?.timestamp || Date.now();
    const conversationId = data?.conversationId;
    const userId = socket.user.id;

    // Update user's last seen timestamp
    await presenceService.updateUserLastSeen(userId);

    // Send heartbeat acknowledgment
    socket.emit('heartbeat_ack', {
      timestamp: timestamp,
      serverTime: Date.now(),
      userId: userId,
      conversationId: conversationId
    });

    // If heartbeat includes conversation context, update presence for that conversation
    if (conversationId) {
      const presenceStatus = await presenceService.getConversationPresence(conversationId);
      socket.emit('conversation_presence', {
        conversationId: conversationId,
        presence: presenceStatus,
        updatedAt: new Date()
      });
    }

    console.log(`💓 Heartbeat received from ${socket.user.displayName}${conversationId ? ` in conversation ${conversationId}` : ''}`);
  } catch (error) {
    console.error('Error handling heartbeat:', error);
    socket.emit('error', { 
      message: 'Failed to handle heartbeat',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle presence_update event - User updates their presence status
 */
export const handlePresenceUpdate = async (socket: Socket, data: PresenceUpdateData): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { isOnline, lastSeen } = data;
    const userId = socket.user.id;

    // Update user presence in database and notify conversations
    const presenceStatus = await presenceService.updateUserPresence(userId, isOnline, true);

    if (presenceStatus) {
      // Send confirmation back to user
      socket.emit('presence_updated', {
        userId: userId,
        isOnline: presenceStatus.isOnline,
        lastSeen: presenceStatus.lastSeen,
        updatedAt: new Date()
      });

      console.log(`🟢 Presence updated for ${socket.user.displayName}: ${isOnline ? 'online' : 'offline'}`);
    }
  } catch (error) {
    console.error('Error handling presence update:', error);
    socket.emit('error', { 
      message: 'Failed to update presence',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle join_conversation event - User joins a conversation room
 */
export const handleJoinConversation = async (socket: Socket, data: JoinConversationData): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { conversationId } = data;

    // Validate input
    if (!conversationId) {
      socket.emit('error', { message: 'Conversation ID is required' });
      return;
    }

    const userId = socket.user.id;

    // Join the conversation room using room manager
    await roomManager.joinRoom(socket, conversationId, ROOM_TYPES.CONVERSATION);

    // Get conversation presence and send to user
    const presenceStatus = await presenceService.getConversationPresence(conversationId);
    
    socket.emit('conversation_joined', {
      conversationId: conversationId,
      presence: presenceStatus,
      joinedAt: new Date()
    });

    // Notify other conversation members that user joined
    roomManager.broadcastToRoom(conversationId, 'user_joined_conversation', {
      userId: userId,
      displayName: socket.user.displayName,
      conversationId: conversationId,
      joinedAt: new Date(),
      isOnline: true
    }, ROOM_TYPES.CONVERSATION, socket.id); // Exclude sender

    // Update user's last seen timestamp
    await presenceService.updateUserLastSeen(userId);

    console.log(`👥 User ${socket.user.displayName} joined conversation ${conversationId}`);
  } catch (error) {
    console.error('Error handling join conversation:', error);
    socket.emit('error', { 
      message: 'Failed to join conversation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle leave_conversation event - User leaves a conversation room
 */
export const handleLeaveConversation = async (socket: Socket, data: LeaveConversationData): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { conversationId } = data;

    // Validate input
    if (!conversationId) {
      socket.emit('error', { message: 'Conversation ID is required' });
      return;
    }

    const userId = socket.user.id;

    // Leave the conversation room using room manager
    await roomManager.leaveRoom(socket, conversationId, ROOM_TYPES.CONVERSATION);

    // Clear any typing state for this conversation
    const userKey = `${userId}:${conversationId}`;
    const typingState = typingUsers.get(userKey);
    if (typingState?.timeout) {
      clearTimeout(typingState.timeout);
    }
    typingUsers.delete(userKey);

    // Send confirmation to user
    socket.emit('conversation_left', {
      conversationId: conversationId,
      leftAt: new Date()
    });

    // Notify other conversation members that user left
    roomManager.broadcastToRoom(conversationId, 'user_left_conversation', {
      userId: userId,
      displayName: socket.user.displayName,
      conversationId: conversationId,
      leftAt: new Date()
    }, ROOM_TYPES.CONVERSATION, socket.id); // Exclude sender

    // Update user's last seen timestamp
    await presenceService.updateUserLastSeen(userId);

    console.log(`👋 User ${socket.user.displayName} left conversation ${conversationId}`);
  } catch (error) {
    console.error('Error handling leave conversation:', error);
    socket.emit('error', { 
      message: 'Failed to leave conversation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle get_presence event - Get presence status for users
 */
export const handleGetPresence = async (socket: Socket, data: { userIds: string[] }): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { userIds } = data;

    // Validate input
    if (!userIds || !Array.isArray(userIds)) {
      socket.emit('error', { message: 'User IDs array is required' });
      return;
    }

    // Get presence status for requested users
    const presenceStatuses = await presenceService.getUsersPresence(userIds);

    // Send presence data back to requester
    socket.emit('presence_data', {
      users: presenceStatuses,
      requestedAt: new Date()
    });

    console.log(`📊 Presence data requested by ${socket.user.displayName} for ${userIds.length} users`);
  } catch (error) {
    console.error('Error getting presence data:', error);
    socket.emit('error', { 
      message: 'Failed to get presence data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle get_conversation_presence event - Get presence for conversation members
 */
export const handleGetConversationPresence = async (socket: Socket, data: { conversationId: string }): Promise<void> => {
  if (!socket.user) {
    socket.emit('error', { message: 'User not authenticated' });
    return;
  }

  try {
    const { conversationId } = data;

    // Validate input
    if (!conversationId) {
      socket.emit('error', { message: 'Conversation ID is required' });
      return;
    }

    // Get conversation presence
    const presenceStatus = await presenceService.getConversationPresence(conversationId);

    // Send presence data back to requester
    socket.emit('conversation_presence', {
      conversationId: conversationId,
      presence: presenceStatus,
      requestedAt: new Date()
    });

    console.log(`📊 Conversation presence requested by ${socket.user.displayName} for conversation ${conversationId}`);
  } catch (error) {
    console.error('Error getting conversation presence:', error);
    socket.emit('error', { 
      message: 'Failed to get conversation presence',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Clean up typing states for a user when they disconnect
 */
export const cleanupUserTypingStates = (userId: string): void => {
  const keysToDelete: string[] = [];
  
  for (const [key, typingState] of typingUsers.entries()) {
    if (key.startsWith(`${userId}:`)) {
      if (typingState.timeout) {
        clearTimeout(typingState.timeout);
      }
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => typingUsers.delete(key));
  
  if (keysToDelete.length > 0) {
    console.log(`🧹 Cleaned up ${keysToDelete.length} typing states for user ${userId}`);
  }
};

/**
 * Get current typing users in a conversation
 */
export const getTypingUsersInConversation = (conversationId: string): string[] => {
  const typingUserIds: string[] = [];
  
  for (const [key, typingState] of typingUsers.entries()) {
    if (typingState.conversationId === conversationId) {
      const userId = key.split(':')[0];
      typingUserIds.push(userId);
    }
  }
  
  return typingUserIds;
};

/**
 * Set up presence event handlers for a socket
 */
export const setupPresenceHandlers = (socket: Socket): void => {
  // Handle typing_start event
  socket.on('typing_start', (data: TypingStartData) => {
    handleTypingStart(socket, data);
  });

  // Handle typing_stop event
  socket.on('typing_stop', (data: TypingStopData) => {
    handleTypingStop(socket, data);
  });

  // Handle heartbeat event
  socket.on('heartbeat', (data: HeartbeatData) => {
    handleHeartbeat(socket, data);
  });

  // Handle presence_update event
  socket.on('presence_update', (data: PresenceUpdateData) => {
    handlePresenceUpdate(socket, data);
  });

  // Handle join_conversation event
  socket.on('join_conversation', (data: JoinConversationData) => {
    handleJoinConversation(socket, data);
  });

  // Handle leave_conversation event
  socket.on('leave_conversation', (data: LeaveConversationData) => {
    handleLeaveConversation(socket, data);
  });

  // Handle get_presence event
  socket.on('get_presence', (data: { userIds: string[] }) => {
    handleGetPresence(socket, data);
  });

  // Handle get_conversation_presence event
  socket.on('get_conversation_presence', (data: { conversationId: string }) => {
    handleGetConversationPresence(socket, data);
  });

  // Handle disconnect - cleanup typing states
  socket.on('disconnect', () => {
    if (socket.user) {
      cleanupUserTypingStates(socket.user.id);
    }
  });

  console.log(`👤 Presence handlers set up for socket: ${socket.id}`);
};
