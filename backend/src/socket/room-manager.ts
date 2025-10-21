import { Socket, Server as SocketIOServer } from 'socket.io';
import { getSocketServer } from '../config/socket';

// Room types
export const ROOM_TYPES = {
  USER: 'user',
  CONVERSATION: 'conversation',
  GROUP: 'group'
} as const;

export type RoomType = typeof ROOM_TYPES[keyof typeof ROOM_TYPES];

// Room management interface
export interface RoomInfo {
  roomId: string;
  type: RoomType;
  members: string[];
  createdAt: Date;
  lastActivity: Date;
}

// Room manager class for centralized room management
export class RoomManager {
  private static instance: RoomManager;
  private roomInfo: Map<string, RoomInfo> = new Map();

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Join a user to a room
   */
  public async joinRoom(socket: Socket, roomId: string, roomType: RoomType = ROOM_TYPES.CONVERSATION): Promise<boolean> {
    try {
      if (!socket.user) {
        console.error('Cannot join room: User not authenticated');
        return false;
      }

      const fullRoomId = this.getFullRoomId(roomId, roomType);
      
      // Join the socket to the room
      await socket.join(fullRoomId);
      
      // Update room info
      this.updateRoomInfo(fullRoomId, roomType, socket.user.id, 'join');
      
      // Add to user's current conversations if it's a conversation room
      if (roomType === ROOM_TYPES.CONVERSATION) {
        socket.user.currentConversations.add(roomId);
      }

      console.log(`👥 User ${socket.user.displayName} joined room: ${fullRoomId}`);
      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      return false;
    }
  }

  /**
   * Leave a user from a room
   */
  public async leaveRoom(socket: Socket, roomId: string, roomType: RoomType = ROOM_TYPES.CONVERSATION): Promise<boolean> {
    try {
      if (!socket.user) {
        console.error('Cannot leave room: User not authenticated');
        return false;
      }

      const fullRoomId = this.getFullRoomId(roomId, roomType);
      
      // Leave the socket from the room
      await socket.leave(fullRoomId);
      
      // Update room info
      this.updateRoomInfo(fullRoomId, roomType, socket.user.id, 'leave');
      
      // Remove from user's current conversations if it's a conversation room
      if (roomType === ROOM_TYPES.CONVERSATION) {
        socket.user.currentConversations.delete(roomId);
      }

      console.log(`👋 User ${socket.user.displayName} left room: ${fullRoomId}`);
      return true;
    } catch (error) {
      console.error('Error leaving room:', error);
      return false;
    }
  }

  /**
   * Broadcast message to a room
   */
  public broadcastToRoom(roomId: string, event: string, data: any, roomType: RoomType = ROOM_TYPES.CONVERSATION, excludeSocketId?: string): void {
    try {
      const io = getSocketServer();
      if (!io) {
        console.error('Socket server not available for broadcasting');
        return;
      }

      const fullRoomId = this.getFullRoomId(roomId, roomType);
      
      if (excludeSocketId) {
        io.to(fullRoomId).except(excludeSocketId).emit(event, data);
      } else {
        io.to(fullRoomId).emit(event, data);
      }

      // Update room activity
      this.updateRoomActivity(fullRoomId);
      
      console.log(`📢 Broadcasted ${event} to room: ${fullRoomId}`);
    } catch (error) {
      console.error('Error broadcasting to room:', error);
    }
  }

  /**
   * Send message to a specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    try {
      const io = getSocketServer();
      if (!io) {
        console.error('Socket server not available for sending to user');
        return;
      }

      const userRoomId = this.getFullRoomId(userId, ROOM_TYPES.USER);
      io.to(userRoomId).emit(event, data);
      
      console.log(`📤 Sent ${event} to user: ${userId}`);
    } catch (error) {
      console.error('Error sending to user:', error);
    }
  }

  /**
   * Get room members
   */
  public async getRoomMembers(roomId: string, roomType: RoomType = ROOM_TYPES.CONVERSATION): Promise<string[]> {
    try {
      const io = getSocketServer();
      if (!io) return [];

      const fullRoomId = this.getFullRoomId(roomId, roomType);
      const sockets = await io.in(fullRoomId).fetchSockets();
      
      return sockets.map(socket => (socket as any).user?.id).filter(Boolean) as string[];
    } catch (error) {
      console.error('Error getting room members:', error);
      return [];
    }
  }

  /**
   * Check if user is in a room
   */
  public async isUserInRoom(userId: string, roomId: string, roomType: RoomType = ROOM_TYPES.CONVERSATION): Promise<boolean> {
    try {
      const members = await this.getRoomMembers(roomId, roomType);
      return members.includes(userId);
    } catch (error) {
      console.error('Error checking if user is in room:', error);
      return false;
    }
  }

  /**
   * Get room information
   */
  public getRoomInfo(roomId: string, roomType: RoomType = ROOM_TYPES.CONVERSATION): RoomInfo | null {
    const fullRoomId = this.getFullRoomId(roomId, roomType);
    return this.roomInfo.get(fullRoomId) || null;
  }

  /**
   * Get all rooms for a user
   */
  public getUserRooms(userId: string): string[] {
    const userRooms: string[] = [];
    
    for (const [roomId, roomInfo] of this.roomInfo.entries()) {
      if (roomInfo.members.includes(userId)) {
        userRooms.push(roomId);
      }
    }
    
    return userRooms;
  }

  /**
   * Clean up empty rooms
   */
  public async cleanupEmptyRooms(): Promise<void> {
    try {
      const io = getSocketServer();
      if (!io) return;

      const roomsToDelete: string[] = [];
      
      for (const [roomId, roomInfo] of this.roomInfo.entries()) {
        const sockets = await io.in(roomId).fetchSockets();
        if (sockets.length === 0) {
          roomsToDelete.push(roomId);
        }
      }

      roomsToDelete.forEach(roomId => {
        this.roomInfo.delete(roomId);
        console.log(`🧹 Cleaned up empty room: ${roomId}`);
      });

      if (roomsToDelete.length > 0) {
        console.log(`🧹 Cleaned up ${roomsToDelete.length} empty rooms`);
      }
    } catch (error) {
      console.error('Error cleaning up empty rooms:', error);
    }
  }

  /**
   * Get room statistics
   */
  public getRoomStats(): { totalRooms: number; totalMembers: number; roomTypes: Record<string, number> } {
    const stats = {
      totalRooms: this.roomInfo.size,
      totalMembers: 0,
      roomTypes: {} as Record<string, number>
    };

    for (const roomInfo of this.roomInfo.values()) {
      stats.totalMembers += roomInfo.members.length;
      stats.roomTypes[roomInfo.type] = (stats.roomTypes[roomInfo.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Private helper to get full room ID with prefix
   */
  private getFullRoomId(roomId: string, roomType: RoomType): string {
    return `${roomType}:${roomId}`;
  }

  /**
   * Private helper to update room information
   */
  private updateRoomInfo(roomId: string, roomType: RoomType, userId: string, action: 'join' | 'leave'): void {
    const existing = this.roomInfo.get(roomId);
    
    if (existing) {
      if (action === 'join' && !existing.members.includes(userId)) {
        existing.members.push(userId);
      } else if (action === 'leave') {
        existing.members = existing.members.filter(id => id !== userId);
      }
      existing.lastActivity = new Date();
    } else if (action === 'join') {
      this.roomInfo.set(roomId, {
        roomId,
        type: roomType,
        members: [userId],
        createdAt: new Date(),
        lastActivity: new Date()
      });
    }
  }

  /**
   * Private helper to update room activity
   */
  private updateRoomActivity(roomId: string): void {
    const roomInfo = this.roomInfo.get(roomId);
    if (roomInfo) {
      roomInfo.lastActivity = new Date();
    }
  }
}

// Export singleton instance
export const roomManager = RoomManager.getInstance();

// Utility functions for backward compatibility
export const joinConversationRoom = async (socket: Socket, conversationId: string): Promise<boolean> => {
  return roomManager.joinRoom(socket, conversationId, ROOM_TYPES.CONVERSATION);
};

export const leaveConversationRoom = async (socket: Socket, conversationId: string): Promise<boolean> => {
  return roomManager.leaveRoom(socket, conversationId, ROOM_TYPES.CONVERSATION);
};

export const joinUserRoom = async (socket: Socket, userId: string): Promise<boolean> => {
  return roomManager.joinRoom(socket, userId, ROOM_TYPES.USER);
};

export const leaveUserRoom = async (socket: Socket, userId: string): Promise<boolean> => {
  return roomManager.leaveRoom(socket, userId, ROOM_TYPES.USER);
};

export const broadcastToConversation = (conversationId: string, event: string, data: any, excludeSocketId?: string): void => {
  roomManager.broadcastToRoom(conversationId, event, data, ROOM_TYPES.CONVERSATION, excludeSocketId);
};

export const sendToUser = (userId: string, event: string, data: any): void => {
  roomManager.sendToUser(userId, event, data);
};

export const getConversationMembers = async (conversationId: string): Promise<string[]> => {
  return roomManager.getRoomMembers(conversationId, ROOM_TYPES.CONVERSATION);
};

export const isUserInConversation = async (userId: string, conversationId: string): Promise<boolean> => {
  return roomManager.isUserInRoom(userId, conversationId, ROOM_TYPES.CONVERSATION);
};
