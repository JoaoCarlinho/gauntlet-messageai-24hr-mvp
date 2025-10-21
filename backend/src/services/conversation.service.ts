import prisma from '../config/database';
import { Conversation, ConversationMember, User, Message } from '@prisma/client';

// Types for conversation operations
export interface ConversationWithMembers extends Conversation {
  members: (ConversationMember & {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
      isOnline: boolean;
    };
  })[];
}

export interface ConversationWithLastMessage extends Conversation {
  members: (ConversationMember & {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
      isOnline: boolean;
    };
  })[];
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
}

export interface CreateDirectConversationData {
  participantId: string;
}

export interface CreateGroupConversationData {
  name: string;
  participantIds: string[];
}

export interface AddMemberData {
  userId: string;
}

/**
 * Create a direct conversation (1-on-1) between two users
 */
export const createDirectConversation = async (
  creatorId: string,
  data: CreateDirectConversationData
): Promise<ConversationWithMembers> => {
  try {
    const { participantId } = data;

    // Validate that both users exist
    const [creator, participant] = await Promise.all([
      prisma.user.findUnique({ where: { id: creatorId } }),
      prisma.user.findUnique({ where: { id: participantId } })
    ]);

    if (!creator) {
      throw new Error('Creator user not found');
    }

    if (!participant) {
      throw new Error('Participant user not found');
    }

    if (creatorId === participantId) {
      throw new Error('Cannot create conversation with yourself');
    }

    // Check if a direct conversation already exists between these users
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        type: 'direct',
        members: {
          every: {
            userId: {
              in: [creatorId, participantId]
            }
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
        }
      }
    });

    if (existingConversation) {
      // Check if both users are actually members
      const memberIds = existingConversation.members.map(m => m.userId);
      if (memberIds.includes(creatorId) && memberIds.includes(participantId)) {
        return existingConversation;
      }
    }

    // Create new direct conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: 'direct',
        members: {
          create: [
            {
              userId: creatorId,
              joinedAt: new Date()
            },
            {
              userId: participantId,
              joinedAt: new Date()
            }
          ]
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
        }
      }
    });

    return conversation;
  } catch (error) {
    console.error('Error creating direct conversation:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create direct conversation');
  }
};

/**
 * Create a group conversation with multiple participants
 */
export const createGroupConversation = async (
  creatorId: string,
  data: CreateGroupConversationData
): Promise<ConversationWithMembers> => {
  try {
    const { name, participantIds } = data;

    // Validate input
    if (!name || name.trim().length === 0) {
      throw new Error('Group name is required');
    }

    if (name.length > 100) {
      throw new Error('Group name must be 100 characters or less');
    }

    if (!participantIds || participantIds.length === 0) {
      throw new Error('At least one participant is required');
    }

    if (participantIds.length > 50) {
      throw new Error('Group cannot have more than 50 members');
    }

    // Validate that creator exists
    const creator = await prisma.user.findUnique({ where: { id: creatorId } });
    if (!creator) {
      throw new Error('Creator user not found');
    }

    // Validate that all participants exist
    const participants = await prisma.user.findMany({
      where: {
        id: {
          in: participantIds
        }
      }
    });

    if (participants.length !== participantIds.length) {
      throw new Error('One or more participants not found');
    }

    // Ensure creator is included in participants
    const allParticipantIds = [...new Set([creatorId, ...participantIds])];

    // Create group conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: 'group',
        name: name.trim(),
        members: {
          create: allParticipantIds.map(userId => ({
            userId,
            joinedAt: new Date()
          }))
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
        }
      }
    });

    return conversation;
  } catch (error) {
    console.error('Error creating group conversation:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create group conversation');
  }
};

/**
 * Get user's conversation list with last message and unread count
 */
export const getUserConversations = async (userId: string): Promise<ConversationWithLastMessage[]> => {
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
    const userConversations: ConversationWithLastMessage[] = await Promise.all(
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

        return {
          ...conversation,
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
          unreadCount
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
 * Get conversation by ID with members
 */
export const getConversationById = async (
  conversationId: string,
  userId: string
): Promise<ConversationWithMembers | null> => {
  try {
    // Check if user is a member of this conversation
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    if (!membership) {
      throw new Error('Access denied: You are not a member of this conversation');
    }

    // Get conversation with members
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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
        }
      }
    });

    return conversation;
  } catch (error) {
    console.error('Error getting conversation by ID:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get conversation');
  }
};

/**
 * Add member to conversation (for group chats)
 */
export const addMemberToConversation = async (
  conversationId: string,
  adminUserId: string,
  data: AddMemberData
): Promise<ConversationWithMembers> => {
  try {
    const { userId } = data;

    // Check if conversation exists and is a group
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: true
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new Error('Can only add members to group conversations');
    }

    // Check if admin user is a member
    const adminMembership = conversation.members.find(m => m.userId === adminUserId);
    if (!adminMembership) {
      throw new Error('Access denied: You are not a member of this conversation');
    }

    // Check if user to add exists
    const userToAdd = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToAdd) {
      throw new Error('User to add not found');
    }

    // Check if user is already a member
    const existingMembership = conversation.members.find(m => m.userId === userId);
    if (existingMembership) {
      throw new Error('User is already a member of this conversation');
    }

    // Add member to conversation
    await prisma.conversationMember.create({
      data: {
        conversationId,
        userId,
        joinedAt: new Date()
      }
    });

    // Return updated conversation
    const updatedConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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
        }
      }
    });

    if (!updatedConversation) {
      throw new Error('Failed to retrieve updated conversation');
    }

    return updatedConversation;
  } catch (error) {
    console.error('Error adding member to conversation:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to add member to conversation');
  }
};

/**
 * Remove member from conversation (for group chats)
 */
export const removeMemberFromConversation = async (
  conversationId: string,
  adminUserId: string,
  userIdToRemove: string
): Promise<ConversationWithMembers> => {
  try {
    // Check if conversation exists and is a group
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: true
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new Error('Can only remove members from group conversations');
    }

    // Check if admin user is a member
    const adminMembership = conversation.members.find(m => m.userId === adminUserId);
    if (!adminMembership) {
      throw new Error('Access denied: You are not a member of this conversation');
    }

    // Check if user to remove is a member
    const memberToRemove = conversation.members.find(m => m.userId === userIdToRemove);
    if (!memberToRemove) {
      throw new Error('User is not a member of this conversation');
    }

    // Prevent removing the last member
    if (conversation.members.length <= 1) {
      throw new Error('Cannot remove the last member from a conversation');
    }

    // Remove member from conversation
    await prisma.conversationMember.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: userIdToRemove
        }
      }
    });

    // Return updated conversation
    const updatedConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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
        }
      }
    });

    if (!updatedConversation) {
      throw new Error('Failed to retrieve updated conversation');
    }

    return updatedConversation;
  } catch (error) {
    console.error('Error removing member from conversation:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to remove member from conversation');
  }
};

/**
 * Update conversation name (for group chats)
 */
export const updateConversationName = async (
  conversationId: string,
  adminUserId: string,
  newName: string
): Promise<ConversationWithMembers> => {
  try {
    // Validate input
    if (!newName || newName.trim().length === 0) {
      throw new Error('Conversation name is required');
    }

    if (newName.length > 100) {
      throw new Error('Conversation name must be 100 characters or less');
    }

    // Check if conversation exists and is a group
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: true
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new Error('Can only update name of group conversations');
    }

    // Check if admin user is a member
    const adminMembership = conversation.members.find(m => m.userId === adminUserId);
    if (!adminMembership) {
      throw new Error('Access denied: You are not a member of this conversation');
    }

    // Update conversation name
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        name: newName.trim(),
        updatedAt: new Date()
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
        }
      }
    });

    return updatedConversation;
  } catch (error) {
    console.error('Error updating conversation name:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to update conversation name');
  }
};

/**
 * Check if user is member of conversation
 */
export const isUserMemberOfConversation = async (
  conversationId: string,
  userId: string
): Promise<boolean> => {
  try {
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    return !!membership;
  } catch (error) {
    console.error('Error checking conversation membership:', error);
    return false;
  }
};

/**
 * Get conversation members count
 */
export const getConversationMembersCount = async (conversationId: string): Promise<number> => {
  try {
    const count = await prisma.conversationMember.count({
      where: { conversationId }
    });

    return count;
  } catch (error) {
    console.error('Error getting conversation members count:', error);
    return 0;
  }
};
