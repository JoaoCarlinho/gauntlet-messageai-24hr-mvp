import prisma from '../config/database';
import { getSocketServer, broadcastToConversation, sendToUser } from '../config/socket';
import * as usersService from './users.service';

// Types for presence operations
export interface PresenceStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  displayName: string;
  avatarUrl?: string;
}

export interface UserPresenceUpdate {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface ConversationPresence {
  conversationId: string;
  onlineUsers: PresenceStatus[];
  totalMembers: number;
}

// Heartbeat interval for checking user activity (in milliseconds)
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const OFFLINE_THRESHOLD = 60000; // 1 minute

// Store active heartbeats
const activeHeartbeats = new Map<string, NodeJS.Timeout>();

/**
 * Update user online status in database and notify relevant users
 */
export const updateUserPresence = async (
  userId: string, 
  isOnline: boolean,
  notifyConversations: boolean = true
): Promise<PresenceStatus | null> => {
  try {
    // Update user status in database
    await usersService.updateUserOnlineStatus(userId, isOnline);
    
    // Get updated user profile
    const userProfile = await usersService.getUserProfile(userId);
    if (!userProfile) {
      throw new Error('User not found');
    }

    const presenceStatus: PresenceStatus = {
      userId: userProfile.id,
      isOnline: userProfile.isOnline,
      lastSeen: userProfile.lastSeen,
      displayName: userProfile.displayName,
      avatarUrl: userProfile.avatarUrl
    };

    // Notify user's conversations about status change
    if (notifyConversations) {
      await notifyConversationsOfPresenceChange(userId, presenceStatus);
    }

    console.log(`🟢 User presence updated: ${userProfile.displayName} is ${isOnline ? 'online' : 'offline'}`);
    return presenceStatus;
  } catch (error) {
    console.error('Error updating user presence:', error);
    throw new Error('Failed to update user presence');
  }
};

/**
 * Notify all conversations that a user is part of about their presence change
 */
export const notifyConversationsOfPresenceChange = async (
  userId: string, 
  presenceStatus: PresenceStatus
): Promise<void> => {
  try {
    // Get all conversations the user is part of
    const userConversations = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true }
    });

    // Get user's contacts (users they have direct conversations with)
    const userContacts = await getUserContacts(userId);

    // Notify each conversation
    for (const membership of userConversations) {
      broadcastToConversation(membership.conversationId, 'user-presence-updated', {
        userId: presenceStatus.userId,
        displayName: presenceStatus.displayName,
        isOnline: presenceStatus.isOnline,
        lastSeen: presenceStatus.lastSeen,
        avatarUrl: presenceStatus.avatarUrl,
        conversationId: membership.conversationId,
        updatedAt: new Date()
      });
    }

    // Emit user_online/user_offline to user's contacts
    for (const contactId of userContacts) {
      if (presenceStatus.isOnline) {
        sendToUser(contactId, 'user_online', {
          userId: presenceStatus.userId,
          displayName: presenceStatus.displayName,
          avatarUrl: presenceStatus.avatarUrl,
          isOnline: true,
          lastSeen: presenceStatus.lastSeen,
          onlineAt: new Date()
        });
      } else {
        sendToUser(contactId, 'user_offline', {
          userId: presenceStatus.userId,
          displayName: presenceStatus.displayName,
          avatarUrl: presenceStatus.avatarUrl,
          isOnline: false,
          lastSeen: presenceStatus.lastSeen,
          offlineAt: new Date()
        });
      }
    }

    console.log(`📢 Notified ${userConversations.length} conversations and ${userContacts.length} contacts of presence change for user ${userId}`);
  } catch (error) {
    console.error('Error notifying conversations of presence change:', error);
    throw new Error('Failed to notify conversations');
  }
};

/**
 * Get presence status for users in a conversation
 */
export const getConversationPresence = async (conversationId: string): Promise<ConversationPresence> => {
  try {
    // Get all members of the conversation
    const members = await prisma.conversationMember.findMany({
      where: { conversationId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            isOnline: true,
            lastSeen: true
          }
        }
      }
    });

    // Get online users from socket connections
    const io = getSocketServer();
    const onlineUserIds = new Set<string>();
    
    if (io) {
      const sockets = await io.in(`conversation:${conversationId}`).fetchSockets();
      sockets.forEach(socket => {
        const user = (socket as any).user;
        if (user && user.id) {
          onlineUserIds.add(user.id);
        }
      });
    }

    // Build presence status for each member
    const onlineUsers: PresenceStatus[] = members
      .filter(member => onlineUserIds.has(member.user.id))
      .map(member => ({
        userId: member.user.id,
        isOnline: true,
        lastSeen: member.user.lastSeen,
        displayName: member.user.displayName,
        avatarUrl: member.user.avatarUrl || undefined
      }));

    return {
      conversationId,
      onlineUsers,
      totalMembers: members.length
    };
  } catch (error) {
    console.error('Error getting conversation presence:', error);
    throw new Error('Failed to get conversation presence');
  }
};

/**
 * Get presence status for multiple users
 */
export const getUsersPresence = async (userIds: string[]): Promise<PresenceStatus[]> => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
        lastSeen: true
      }
    });

    // Check which users are actually online via socket connections
    const io = getSocketServer();
    const onlineUserIds = new Set<string>();
    
    if (io) {
      for (const userId of userIds) {
        const sockets = await io.in(`user:${userId}`).fetchSockets();
        if (sockets.length > 0) {
          onlineUserIds.add(userId);
        }
      }
    }

    return users.map(user => ({
      userId: user.id,
      isOnline: onlineUserIds.has(user.id) || user.isOnline,
      lastSeen: user.lastSeen,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl || undefined
    }));
  } catch (error) {
    console.error('Error getting users presence:', error);
    throw new Error('Failed to get users presence');
  }
};

/**
 * Start heartbeat monitoring for a user
 */
export const startUserHeartbeat = (userId: string): void => {
  try {
    // Clear existing heartbeat if any
    stopUserHeartbeat(userId);

    // Set up new heartbeat
    const heartbeat = setInterval(async () => {
      try {
        // Check if user is still connected via socket
        const io = getSocketServer();
        if (io) {
          const sockets = await io.in(`user:${userId}`).fetchSockets();
          if (sockets.length === 0) {
            // User is no longer connected, mark as offline
            console.log(`💓 Heartbeat timeout: User ${userId} is no longer connected, marking as offline`);
            await updateUserPresence(userId, false);
            stopUserHeartbeat(userId);
          } else {
            // User is still connected, update last seen
            await updateUserLastSeen(userId);
          }
        }
      } catch (error) {
        console.error(`Error in heartbeat for user ${userId}:`, error);
        stopUserHeartbeat(userId);
      }
    }, HEARTBEAT_INTERVAL);

    activeHeartbeats.set(userId, heartbeat as any);
    console.log(`💓 Started heartbeat monitoring for user ${userId} (interval: ${HEARTBEAT_INTERVAL}ms)`);
  } catch (error) {
    console.error('Error starting user heartbeat:', error);
  }
};

/**
 * Stop heartbeat monitoring for a user
 */
export const stopUserHeartbeat = (userId: string): void => {
  const heartbeat = activeHeartbeats.get(userId);
  if (heartbeat) {
    clearInterval(heartbeat);
    activeHeartbeats.delete(userId);
    console.log(`💓 Stopped heartbeat monitoring for user ${userId}`);
  }
};

/**
 * Handle user connection - mark as online and start heartbeat
 */
export const handleUserConnection = async (userId: string): Promise<PresenceStatus | null> => {
  try {
    // Update user as online
    const presenceStatus = await updateUserPresence(userId, true);
    
    // Start heartbeat monitoring
    startUserHeartbeat(userId);
    
    return presenceStatus;
  } catch (error) {
    console.error('Error handling user connection:', error);
    throw new Error('Failed to handle user connection');
  }
};

/**
 * Handle user disconnection - mark as offline and stop heartbeat
 */
export const handleUserDisconnection = async (userId: string): Promise<PresenceStatus | null> => {
  try {
    // Stop heartbeat monitoring
    stopUserHeartbeat(userId);
    
    // Update user as offline
    const presenceStatus = await updateUserPresence(userId, false);
    
    return presenceStatus;
  } catch (error) {
    console.error('Error handling user disconnection:', error);
    throw new Error('Failed to handle user disconnection');
  }
};

/**
 * Clean up stale heartbeats and offline users
 */
export const cleanupStalePresence = async (): Promise<void> => {
  try {
    const io = getSocketServer();
    if (!io) return;

    // Get all users who should be online according to database
    const onlineUsers = await prisma.user.findMany({
      where: { isOnline: true },
      select: { id: true, lastSeen: true }
    });

    const now = new Date();
    const staleUsers: string[] = [];

    for (const user of onlineUsers) {
      // Check if user is actually connected via socket
      const sockets = await io.in(`user:${user.id}`).fetchSockets();
      
      if (sockets.length === 0) {
        // User is not connected via socket, check if they've been offline too long
        const timeSinceLastSeen = now.getTime() - user.lastSeen.getTime();
        if (timeSinceLastSeen > OFFLINE_THRESHOLD) {
          staleUsers.push(user.id);
        }
      }
    }

    // Mark stale users as offline
    for (const userId of staleUsers) {
      await updateUserPresence(userId, false);
      stopUserHeartbeat(userId);
    }

    if (staleUsers.length > 0) {
      console.log(`🧹 Cleaned up ${staleUsers.length} stale user presences`);
    }
  } catch (error) {
    console.error('Error cleaning up stale presence:', error);
  }
};

/**
 * Get user's last seen timestamp
 */
export const getUserLastSeen = async (userId: string): Promise<Date | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastSeen: true }
    });

    return user?.lastSeen || null;
  } catch (error) {
    console.error('Error getting user last seen:', error);
    throw new Error('Failed to get user last seen');
  }
};

/**
 * Update user's last seen timestamp
 */
export const updateUserLastSeen = async (userId: string): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        lastSeen: new Date(),
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating user last seen:', error);
    throw new Error('Failed to update user last seen');
  }
};

/**
 * Broadcast presence update to specific user
 */
export const broadcastPresenceToUser = (userId: string, presenceData: any): void => {
  sendToUser(userId, 'presence-update', presenceData);
};

/**
 * Broadcast presence update to conversation
 */
export const broadcastPresenceToConversation = (conversationId: string, presenceData: any): void => {
  broadcastToConversation(conversationId, 'presence-update', presenceData);
};

/**
 * Get user's contacts (users they have direct conversations with)
 */
export const getUserContacts = async (userId: string): Promise<string[]> => {
  try {
    // Get all direct conversations the user is part of
    const directConversations = await prisma.conversation.findMany({
      where: {
        type: 'direct',
        members: {
          some: { userId }
        }
      },
      include: {
        members: {
          where: { userId: { not: userId } },
          select: { userId: true }
        }
      }
    });

    // Extract contact user IDs
    const contactIds: string[] = [];
    for (const conversation of directConversations) {
      for (const member of conversation.members) {
        if (member.userId !== userId) {
          contactIds.push(member.userId);
        }
      }
    }

    // Remove duplicates
    return [...new Set(contactIds)];
  } catch (error) {
    console.error('Error getting user contacts:', error);
    return [];
  }
};

/**
 * Start periodic cleanup of stale presence data
 */
export const startPresenceCleanup = (): void => {
  // Run cleanup every 5 minutes
  setInterval(async () => {
    try {
      await cleanupStalePresence();
    } catch (error) {
      console.error('Error in periodic presence cleanup:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  console.log('🧹 Started periodic presence cleanup (every 5 minutes)');
};
