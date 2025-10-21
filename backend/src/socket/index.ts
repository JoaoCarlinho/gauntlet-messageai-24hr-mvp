import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createSocketServer, setSocketServer } from '../config/socket';
import { roomManager, ROOM_TYPES } from './room-manager';
import * as messageService from '../services/message.service';
import * as conversationService from '../services/conversation.service';
import { setupMessageHandlers } from './handlers/message.handler';
import { setupPresenceHandlers } from './handlers/presence.handler';

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

// Socket event interfaces
export interface NewMessageData {
  conversationId: string;
  content: string;
  type?: string;
  mediaUrl?: string;
}

export interface MessageUpdateData {
  messageId: string;
  conversationId: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface TypingData {
  conversationId: string;
  isTyping: boolean;
}

export interface OnlineStatusData {
  isOnline: boolean;
}

// Initialize Socket.io server
export const initializeSocketServer = (httpServer: HTTPServer): SocketIOServer => {
  const io = createSocketServer(httpServer);
  
  // Set global socket server instance
  setSocketServer(io);

  // Set up event handlers
  setupSocketEventHandlers(io);

  console.log('🔌 Socket.io server initialized successfully');
  return io;
};

// Set up socket event handlers
const setupSocketEventHandlers = (io: SocketIOServer): void => {
  io.on('connection', async (socket) => {
    if (!socket.user) {
      console.error('Socket connected without user authentication');
      socket.disconnect();
      return;
    }

    console.log(`🔌 Socket connected: ${socket.user.displayName} (${socket.user.id})`);

    // Join user to their personal room for direct notifications
    if (socket.user) {
      await roomManager.joinRoom(socket, socket.user.id, ROOM_TYPES.USER);
    }

    // Initialize user presence on connection
    try {
      const presenceService = await import('../services/presence.service');
      await presenceService.handleUserConnection(socket.user.id);
    } catch (error) {
      console.error('Error initializing user presence:', error);
    }

    // Set up message handlers
    setupMessageHandlers(socket);

    // Set up presence handlers (includes typing indicators, heartbeat, presence updates)
    setupPresenceHandlers(socket);

    // Handle conversation updates
    socket.on('conversation-updated', async (data: { conversationId: string }) => {
      if (!socket.user) return;
      
      try {
        const { conversationId } = data;

        // Get updated conversation data
        const conversation = await conversationService.getConversationById(
          conversationId,
          socket.user.id
        );

        if (conversation) {
          // Broadcast conversation update to all members
          roomManager.broadcastToRoom(conversationId, 'conversation-updated', {
            conversation: conversation,
            updatedBy: socket.user.id,
            updatedAt: new Date()
          }, ROOM_TYPES.CONVERSATION);
        }
      } catch (error) {
        console.error('Error handling conversation update:', error);
        socket.emit('error', { 
          message: 'Failed to handle conversation update',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Note: join-conversation and leave-conversation are now handled by presence handlers

    // Handle error events
    socket.on('error', (error: any) => {
      if (!socket.user) return;
      console.error(`Socket error for user ${socket.user.displayName}:`, error);
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      if (!socket.user) return;
      
      console.log(`🔌 Socket disconnected: ${socket.user.displayName} (${socket.user.id}) - Reason: ${reason}`);
      
      try {
        // Leave all conversation rooms using room manager
        for (const conversationId of socket.user.currentConversations) {
          await roomManager.leaveRoom(socket, conversationId, ROOM_TYPES.CONVERSATION);
        }
        
        // Leave personal room
        await roomManager.leaveRoom(socket, socket.user.id, ROOM_TYPES.USER);
        
        // Import presence service for proper cleanup
        const presenceService = await import('../services/presence.service');
        
        // Handle user disconnection with proper presence management
        await presenceService.handleUserDisconnection(socket.user.id);
        
        // Clear conversation set
        socket.user.currentConversations.clear();
      } catch (error) {
        console.error('Error handling user disconnection:', error);
      }
    });
  });
};

// Export utility functions for use in other parts of the application
export {
  roomManager,
  ROOM_TYPES
};
