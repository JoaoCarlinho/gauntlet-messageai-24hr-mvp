import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import * as messageService from '../services/message.service';
import * as s3Service from '../services/s3.service';
import { CreateMessageData, MessagePaginationOptions, MessageStatusUpdate } from '../services/message.service';

// Note: Request.user interface is defined in middleware/auth.ts

/**
 * Validation rules for conversation ID parameter
 */
export const validateConversationId = [
  param('id')
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID')
];

/**
 * Validation rules for message ID parameter
 */
export const validateMessageId = [
  param('messageId')
    .isUUID()
    .withMessage('Message ID must be a valid UUID')
];

/**
 * Validation rules for creating a message
 */
export const validateCreateMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 4000 })
    .withMessage('Message content must be between 1 and 4000 characters'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'file', 'system'])
    .withMessage('Message type must be one of: text, image, file, system'),
  body('mediaUrl')
    .optional()
    .isURL()
    .withMessage('Media URL must be a valid URL')
];

/**
 * Validation rules for pagination query parameters
 */
export const validateMessagePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('before')
    .optional()
    .isUUID()
    .withMessage('Before parameter must be a valid UUID'),
  query('after')
    .optional()
    .isUUID()
    .withMessage('After parameter must be a valid UUID')
];

/**
 * Validation rules for updating message status
 */
export const validateMessageStatusUpdate = [
  body('status')
    .isIn(['sending', 'sent', 'delivered', 'read', 'failed'])
    .withMessage('Status must be one of: sending, sent, delivered, read, failed')
];

/**
 * GET /api/v1/conversations/:id/messages - Get messages for a conversation (paginated)
 */
export const getMessagesForConversation = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const { id: conversationId } = req.params;
    const { page, limit, before, after } = req.query;

    // Build pagination options
    const paginationOptions: MessagePaginationOptions = {};
    
    if (page) {
      paginationOptions.page = parseInt(page as string);
    }
    if (limit) {
      paginationOptions.limit = parseInt(limit as string);
    }
    if (before) {
      paginationOptions.before = before as string;
    }
    if (after) {
      paginationOptions.after = after as string;
    }

    const result = await messageService.getMessagesForConversation(
      conversationId,
      req.user.id,
      paginationOptions
    );

    res.status(200).json({
      message: 'Messages fetched successfully',
      messages: result.messages,
      pagination: {
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        page: paginationOptions.page || 1,
        limit: paginationOptions.limit || 50
      }
    });
  } catch (error) {
    console.error('Get messages for conversation error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('not a member')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this conversation'
        });
      }
      if (error.message.includes('Page must be') || error.message.includes('Limit must be')) {
        return res.status(400).json({
          error: 'Invalid pagination parameters',
          message: error.message
        });
      }
    }
    res.status(500).json({
      error: 'Failed to fetch messages',
      message: 'An unexpected error occurred while fetching messages.'
    });
  }
};

/**
 * POST /api/v1/conversations/:id/messages - Create a new message
 */
export const createMessage = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const { id: conversationId } = req.params;
    const { content, type = 'text', mediaUrl } = req.body;

    const messageData: CreateMessageData = {
      content,
      type,
      mediaUrl
    };

    const message = await messageService.createMessage(
      conversationId,
      req.user.id,
      messageData
    );

    res.status(201).json({
      message: 'Message created successfully',
      data: message
    });
  } catch (error) {
    console.error('Create message error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('not a member')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this conversation'
        });
      }
      if (error.message.includes('Message content is required') || 
          error.message.includes('Message content must be') ||
          error.message.includes('Invalid message type')) {
        return res.status(400).json({
          error: 'Invalid message data',
          message: error.message
        });
      }
      if (error.message.includes('Conversation not found')) {
        return res.status(404).json({
          error: 'Conversation not found',
          message: error.message
        });
      }
    }
    res.status(500).json({
      error: 'Failed to create message',
      message: 'An unexpected error occurred while creating the message.'
    });
  }
};

/**
 * GET /api/v1/conversations/:id/messages/:messageId - Get a specific message
 */
export const getMessageById = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const { messageId } = req.params;

    const message = await messageService.getMessageById(messageId, req.user.id);

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        message: 'The requested message could not be found or you do not have access to it.'
      });
    }

    res.status(200).json({
      message: 'Message fetched successfully',
      data: message
    });
  } catch (error) {
    console.error('Get message by ID error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('not a member')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this message'
        });
      }
    }
    res.status(500).json({
      error: 'Failed to fetch message',
      message: 'An unexpected error occurred while fetching the message.'
    });
  }
};

/**
 * PUT /api/v1/conversations/:id/messages/:messageId/status - Update message status
 */
export const updateMessageStatus = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const { messageId } = req.params;
    const { status } = req.body;

    const statusUpdate: MessageStatusUpdate = { status };

    const updatedMessage = await messageService.updateMessageStatus(
      messageId,
      req.user.id,
      statusUpdate
    );

    res.status(200).json({
      message: 'Message status updated successfully',
      data: updatedMessage
    });
  } catch (error) {
    console.error('Update message status error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('cannot update')) {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message
        });
      }
      if (error.message.includes('Invalid status') || error.message.includes('Allowed statuses')) {
        return res.status(400).json({
          error: 'Invalid status',
          message: error.message
        });
      }
      if (error.message.includes('Message not found')) {
        return res.status(404).json({
          error: 'Message not found',
          message: error.message
        });
      }
    }
    res.status(500).json({
      error: 'Failed to update message status',
      message: 'An unexpected error occurred while updating the message status.'
    });
  }
};

/**
 * POST /api/v1/conversations/:id/messages/:messageId/read - Mark message as read
 */
export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const { messageId } = req.params;

    const readReceipt = await messageService.createReadReceipt({
      messageId,
      userId: req.user.id
    });

    res.status(200).json({
      message: 'Message marked as read successfully',
      readReceipt: readReceipt
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('not a member')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this message'
        });
      }
      if (error.message.includes('Message not found')) {
        return res.status(404).json({
          error: 'Message not found',
          message: error.message
        });
      }
    }
    res.status(500).json({
      error: 'Failed to mark message as read',
      message: 'An unexpected error occurred while marking the message as read.'
    });
  }
};

/**
 * POST /api/v1/conversations/:id/messages/read - Mark multiple messages as read
 */
export const markMessagesAsRead = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const { id: conversationId } = req.params;
    const { upToMessageId } = req.body;

    const result = await messageService.markMessagesAsRead(
      conversationId,
      req.user.id,
      upToMessageId
    );

    res.status(200).json({
      message: 'Messages marked as read successfully',
      readCount: result.readCount
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('not a member')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this conversation'
        });
      }
    }
    res.status(500).json({
      error: 'Failed to mark messages as read',
      message: 'An unexpected error occurred while marking messages as read.'
    });
  }
};

/**
 * GET /api/v1/conversations/:id/messages/unread-count - Get unread message count
 */
export const getUnreadMessageCount = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const { id: conversationId } = req.params;

    const unreadCount = await messageService.getUnreadMessageCount(
      conversationId,
      req.user.id
    );

    res.status(200).json({
      message: 'Unread message count fetched successfully',
      unreadCount: unreadCount
    });
  } catch (error) {
    console.error('Get unread message count error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('not a member')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this conversation'
        });
      }
    }
    res.status(500).json({
      error: 'Failed to get unread message count',
      message: 'An unexpected error occurred while getting the unread message count.'
    });
  }
};

/**
 * GET /api/v1/conversations/:id/messages/stats - Get message statistics
 */
export const getMessageStats = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const { id: conversationId } = req.params;

    const stats = await messageService.getMessageStats(
      conversationId,
      req.user.id
    );

    res.status(200).json({
      message: 'Message statistics fetched successfully',
      stats: stats
    });
  } catch (error) {
    console.error('Get message stats error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('not a member')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this conversation'
        });
      }
    }
    res.status(500).json({
      error: 'Failed to get message statistics',
      message: 'An unexpected error occurred while getting message statistics.'
    });
  }
};

/**
 * DELETE /api/v1/conversations/:id/messages/:messageId - Delete a message
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const { messageId } = req.params;

    const deletedMessage = await messageService.deleteMessage(
      messageId,
      req.user.id
    );

    res.status(200).json({
      message: 'Message deleted successfully',
      data: deletedMessage
    });
  } catch (error) {
    console.error('Delete message error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('only delete your own')) {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message
        });
      }
      if (error.message.includes('Message not found')) {
        return res.status(404).json({
          error: 'Message not found',
          message: error.message
        });
      }
      if (error.message.includes('too old to delete')) {
        return res.status(400).json({
          error: 'Message too old',
          message: error.message
        });
      }
    }
    res.status(500).json({
      error: 'Failed to delete message',
      message: 'An unexpected error occurred while deleting the message.'
    });
  }
};

/**
 * POST /api/v1/conversations/:id/messages/upload - Upload media file for message
 */
export const uploadMessageMedia = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide a file to upload'
      });
    }

    const { id: conversationId } = req.params;

    // Upload file to S3
    const mediaUrl = await s3Service.uploadMediaToS3(
      req.file,
      req.user.id,
      conversationId
    );

    res.status(200).json({
      message: 'Media uploaded successfully',
      mediaUrl: mediaUrl
    });
  } catch (error) {
    console.error('Upload message media error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Invalid file type') || error.message.includes('File too large')) {
        return res.status(400).json({
          error: 'File upload failed',
          message: error.message
        });
      }
    }
    res.status(500).json({
      error: 'Failed to upload media',
      message: 'An unexpected error occurred during media upload.'
    });
  }
};
