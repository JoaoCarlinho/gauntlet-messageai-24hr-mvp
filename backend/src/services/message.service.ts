import prisma from '../config/database';
import { Message, ReadReceipt, User, Conversation } from '@prisma/client';

// Types for message operations
export interface MessageWithSender extends Message {
  sender: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface MessageWithReadReceipts extends Message {
  sender: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  readReceipts: ReadReceipt[];
}

export interface CreateMessageData {
  content: string;
  type?: string;
  mediaUrl?: string;
}

export interface MessagePaginationOptions {
  page?: number;
  limit?: number;
  before?: string; // Message ID to get messages before this one
  after?: string;  // Message ID to get messages after this one
}

export interface MessageStatusUpdate {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface ReadReceiptData {
  messageId: string;
  userId: string;
}

/**
 * Create a new message in a conversation
 */
export const createMessage = async (
  conversationId: string,
  senderId: string,
  data: CreateMessageData
): Promise<MessageWithSender> => {
  try {
    const { content, type = 'text', mediaUrl } = data;

    // Validate input
    if (!content || content.trim().length === 0) {
      throw new Error('Message content is required');
    }

    if (content.length > 4000) {
      throw new Error('Message content must be 4000 characters or less');
    }

    // Validate message type
    const allowedTypes = ['text', 'image', 'file', 'system'];
    if (!allowedTypes.includes(type)) {
      throw new Error(`Invalid message type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check if sender is a member of the conversation
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId
        }
      }
    });

    if (!membership) {
      throw new Error('Access denied: You are not a member of this conversation');
    }

    // Check if conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: content.trim(),
        type,
        mediaUrl: mediaUrl || null,
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return message;
  } catch (error) {
    console.error('Error creating message:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create message');
  }
};

/**
 * Get messages for a conversation with pagination
 */
export const getMessagesForConversation = async (
  conversationId: string,
  userId: string,
  options: MessagePaginationOptions = {}
): Promise<{ messages: MessageWithSender[]; hasMore: boolean; totalCount: number }> => {
  try {
    const { page = 1, limit = 50, before, after } = options;

    // Validate pagination parameters
    if (page < 1) {
      throw new Error('Page must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Check if user is a member of the conversation
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

    // Build where clause for pagination
    let whereClause: any = {
      conversationId
    };

    if (before) {
      // Get messages before the specified message ID
      const beforeMessage = await prisma.message.findUnique({
        where: { id: before },
        select: { createdAt: true }
      });

      if (beforeMessage) {
        whereClause.createdAt = {
          lt: beforeMessage.createdAt
        };
      }
    } else if (after) {
      // Get messages after the specified message ID
      const afterMessage = await prisma.message.findUnique({
        where: { id: after },
        select: { createdAt: true }
      });

      if (afterMessage) {
        whereClause.createdAt = {
          gt: afterMessage.createdAt
        };
      }
    }

    // Get total count for pagination info
    const totalCount = await prisma.message.count({
      where: { conversationId }
    });

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: before || after ? 0 : (page - 1) * limit
    });

    // Calculate if there are more messages
    const hasMore = before || after 
      ? messages.length === limit
      : (page * limit) < totalCount;

    return {
      messages: messages.reverse(), // Reverse to get chronological order
      hasMore,
      totalCount
    };
  } catch (error) {
    console.error('Error getting messages for conversation:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get messages');
  }
};

/**
 * Update message status
 */
export const updateMessageStatus = async (
  messageId: string,
  userId: string,
  statusUpdate: MessageStatusUpdate
): Promise<MessageWithSender> => {
  try {
    const { status } = statusUpdate;

    // Validate status
    const allowedStatuses = ['sending', 'sent', 'delivered', 'read', 'failed'];
    if (!allowedStatuses.includes(status)) {
      throw new Error(`Invalid status. Allowed statuses: ${allowedStatuses.join(', ')}`);
    }

    // Check if message exists and user has permission to update it
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: true,
        conversation: {
          include: {
            members: true
          }
        }
      }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user is the sender or a member of the conversation
    const isSender = message.senderId === userId;
    const isMember = message.conversation.members.some(member => member.userId === userId);

    if (!isSender && !isMember) {
      throw new Error('Access denied: You cannot update this message');
    }

    // Update message status
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        status,
        updatedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    return updatedMessage;
  } catch (error) {
    console.error('Error updating message status:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to update message status');
  }
};

/**
 * Create read receipt for a message
 */
export const createReadReceipt = async (
  data: ReadReceiptData
): Promise<ReadReceipt> => {
  try {
    const { messageId, userId } = data;

    // Check if message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            members: true
          }
        }
      }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user is a member of the conversation
    const isMember = message.conversation.members.some(member => member.userId === userId);
    if (!isMember) {
      throw new Error('Access denied: You are not a member of this conversation');
    }

    // Check if read receipt already exists
    const existingReceipt = await prisma.readReceipt.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId
        }
      }
    });

    if (existingReceipt) {
      // Update existing receipt timestamp
      const updatedReceipt = await prisma.readReceipt.update({
        where: {
          messageId_userId: {
            messageId,
            userId
          }
        },
        data: {
          readAt: new Date()
        }
      });

      return updatedReceipt;
    }

    // Create new read receipt
    const readReceipt = await prisma.readReceipt.create({
      data: {
        messageId,
        userId,
        readAt: new Date()
      }
    });

    // Update message status to 'read' if all members have read it
    await updateMessageStatusIfAllRead(messageId);

    return readReceipt;
  } catch (error) {
    console.error('Error creating read receipt:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create read receipt');
  }
};

/**
 * Get unread message count for a user in a conversation
 */
export const getUnreadMessageCount = async (
  conversationId: string,
  userId: string
): Promise<number> => {
  try {
    // Check if user is a member of the conversation
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

    // Get user's last read timestamp
    const lastReadAt = membership.lastReadAt || new Date(0);

    // Count unread messages (messages after last read, excluding user's own messages)
    const unreadCount = await prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId }, // Don't count own messages
        createdAt: {
          gt: lastReadAt
        }
      }
    });

    return unreadCount;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get unread message count');
  }
};

/**
 * Mark messages as read up to a specific message
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string,
  upToMessageId?: string
): Promise<{ readCount: number }> => {
  try {
    // Check if user is a member of the conversation
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

    let whereClause: any = {
      conversationId,
      senderId: { not: userId }, // Don't mark own messages as read
      readReceipts: {
        none: {
          userId
        }
      }
    };

    // If upToMessageId is provided, only mark messages up to that point
    if (upToMessageId) {
      const upToMessage = await prisma.message.findUnique({
        where: { id: upToMessageId },
        select: { createdAt: true }
      });

      if (upToMessage) {
        whereClause.createdAt = {
          lte: upToMessage.createdAt
        };
      }
    }

    // Get unread messages
    const unreadMessages = await prisma.message.findMany({
      where: whereClause,
      select: { id: true }
    });

    // Create read receipts for all unread messages
    const readReceipts = await Promise.all(
      unreadMessages.map(message =>
        prisma.readReceipt.create({
          data: {
            messageId: message.id,
            userId,
            readAt: new Date()
          }
        })
      )
    );

    // Update user's last read timestamp
    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      },
      data: {
        lastReadAt: new Date()
      }
    });

    // Update message statuses to 'read' if all members have read them
    await Promise.all(
      unreadMessages.map(message => updateMessageStatusIfAllRead(message.id))
    );

    return { readCount: readReceipts.length };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to mark messages as read');
  }
};

/**
 * Get message by ID with read receipts
 */
export const getMessageById = async (
  messageId: string,
  userId: string
): Promise<MessageWithReadReceipts | null> => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true
          }
        },
        readReceipts: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        },
        conversation: {
          include: {
            members: true
          }
        }
      }
    });

    if (!message) {
      return null;
    }

    // Check if user is a member of the conversation
    const isMember = message.conversation.members.some(member => member.userId === userId);
    if (!isMember) {
      throw new Error('Access denied: You are not a member of this conversation');
    }

    return message;
  } catch (error) {
    console.error('Error getting message by ID:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get message');
  }
};

/**
 * Delete a message (soft delete by updating content)
 */
export const deleteMessage = async (
  messageId: string,
  userId: string
): Promise<MessageWithSender> => {
  try {
    // Check if message exists and user is the sender
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: true
      }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Access denied: You can only delete your own messages');
    }

    // Check if message is too old to delete (e.g., 24 hours)
    const messageAge = Date.now() - message.createdAt.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (messageAge > maxAge) {
      throw new Error('Message is too old to delete');
    }

    // Update message content to indicate deletion
    const deletedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: 'This message was deleted',
        type: 'system',
        updatedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    return deletedMessage;
  } catch (error) {
    console.error('Error deleting message:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete message');
  }
};

/**
 * Helper function to update message status to 'read' if all members have read it
 */
const updateMessageStatusIfAllRead = async (messageId: string): Promise<void> => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            members: true
          }
        },
        readReceipts: true
      }
    });

    if (!message) {
      return;
    }

    // Get all member IDs except the sender
    const memberIds = message.conversation.members
      .filter(member => member.userId !== message.senderId)
      .map(member => member.userId);

    // Get all read receipt user IDs
    const readUserIds = message.readReceipts.map(receipt => receipt.userId);

    // Check if all members have read the message
    const allMembersRead = memberIds.every(memberId => readUserIds.includes(memberId));

    if (allMembersRead && memberIds.length > 0) {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'read',
          updatedAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Error updating message status if all read:', error);
    // Don't throw error here as this is a helper function
  }
};

/**
 * Get message statistics for a conversation
 */
export const getMessageStats = async (
  conversationId: string,
  userId: string
): Promise<{
  totalMessages: number;
  unreadMessages: number;
  lastMessageAt: Date | null;
}> => {
  try {
    // Check if user is a member of the conversation
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

    // Get total message count
    const totalMessages = await prisma.message.count({
      where: { conversationId }
    });

    // Get unread message count
    const unreadMessages = await getUnreadMessageCount(conversationId, userId);

    // Get last message timestamp
    const lastMessage = await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    return {
      totalMessages,
      unreadMessages,
      lastMessageAt: lastMessage?.createdAt || null
    };
  } catch (error) {
    console.error('Error getting message stats:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get message statistics');
  }
};
