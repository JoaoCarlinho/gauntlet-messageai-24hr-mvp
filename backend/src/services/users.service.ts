import prisma from '../config/database';
import { User, Conversation, ConversationMember } from '@prisma/client';

// Types for user operations
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  lastSeen: Date;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileData {
  displayName?: string;
  avatarUrl?: string;
}

export interface UserConversation {
  id: string;
  type: string;
  name?: string;
  lastMessage?: {
    id: string;
    content: string;
    type: string;
    createdAt: Date;
    sender: {
      id: string;
      displayName: string;
    };
  };
  unreadCount: number;
  members: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    isOnline: boolean;
  }[];
  lastReadAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        lastSeen: true,
        isOnline: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl || undefined,
      lastSeen: user.lastSeen,
      isOnline: user.isOnline,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new Error('Failed to get user profile');
  }
};

/**
 * Update user profile (displayName, avatarUrl)
 */
export const updateUserProfile = async (
  userId: string, 
  data: UpdateProfileData
): Promise<UserProfile> => {
  try {
    // Validate input
    if (data.displayName && data.displayName.trim().length === 0) {
      throw new Error('Display name cannot be empty');
    }

    if (data.displayName && data.displayName.length > 50) {
      throw new Error('Display name must be 50 characters or less');
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: data.displayName?.trim(),
        avatarUrl: data.avatarUrl,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        lastSeen: true,
        isOnline: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      avatarUrl: updatedUser.avatarUrl || undefined,
      lastSeen: updatedUser.lastSeen,
      isOnline: updatedUser.isOnline,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to update user profile');
  }
};

/**
 * Update user online status
 */
export const updateUserOnlineStatus = async (
  userId: string, 
  isOnline: boolean
): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline,
        lastSeen: new Date(),
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating user online status:', error);
    throw new Error('Failed to update user online status');
  }
};

/**
 * Get user's conversations list with last message and unread count
 */
export const getUserConversations = async (userId: string): Promise<UserConversation[]> => {
  try {
    // Get user's conversations with members and last message
    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true
              }
            }
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Get user's last read timestamps for each conversation
    const userMemberships = await prisma.conversationMember.findMany({
      where: { userId },
      select: {
        conversationId: true,
        lastReadAt: true
      }
    });

    const lastReadMap = new Map(
      userMemberships.map(membership => [
        membership.conversationId, 
        membership.lastReadAt
      ])
    );

    // Transform data and calculate unread counts
    const userConversations: UserConversation[] = await Promise.all(
      conversations.map(async (conversation) => {
        const lastReadAt = lastReadMap.get(conversation.id);
        
        // Calculate unread message count
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId }, // Don't count own messages
            createdAt: {
              gt: lastReadAt || new Date(0) // Messages after last read
            }
          }
        });

        // Get conversation members (excluding current user for display)
        const otherMembers = conversation.members
          .filter(member => member.userId !== userId)
          .map(member => ({
            id: member.user.id,
            displayName: member.user.displayName,
            avatarUrl: member.user.avatarUrl || undefined,
            isOnline: member.user.isOnline
          }));

        return {
          id: conversation.id,
          type: conversation.type,
          name: conversation.name || undefined,
          lastMessage: conversation.messages[0] ? {
            id: conversation.messages[0].id,
            content: conversation.messages[0].content,
            type: conversation.messages[0].type,
            createdAt: conversation.messages[0].createdAt,
            sender: {
              id: conversation.messages[0].sender.id,
              displayName: conversation.messages[0].sender.displayName
            }
          } : undefined,
          unreadCount,
          members: otherMembers,
          lastReadAt: lastReadAt || undefined,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt
        };
      })
    );

    return userConversations;
  } catch (error) {
    console.error('Error getting user conversations:', error);
    throw new Error('Failed to get user conversations');
  }
};

/**
 * Search users by display name or email (for adding to conversations)
 */
export const searchUsers = async (
  query: string, 
  excludeUserId?: string
): Promise<UserProfile[]> => {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                displayName: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              },
              {
                email: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              }
            ]
          },
          excludeUserId ? {
            id: {
              not: excludeUserId
            }
          } : {}
        ]
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        lastSeen: true,
        isOnline: true,
        createdAt: true,
        updatedAt: true
      },
      take: 20, // Limit results
      orderBy: [
        { isOnline: 'desc' }, // Online users first
        { displayName: 'asc' }
      ]
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl || undefined,
      lastSeen: user.lastSeen,
      isOnline: user.isOnline,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
  } catch (error) {
    console.error('Error searching users:', error);
    throw new Error('Failed to search users');
  }
};

/**
 * Get user by ID (for internal use)
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    return await prisma.user.findUnique({
      where: { id: userId }
    });
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw new Error('Failed to get user');
  }
};

/**
 * Check if user exists
 */
export const userExists = async (userId: string): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    return !!user;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return false;
  }
};
