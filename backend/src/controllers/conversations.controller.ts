import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import * as conversationService from '../services/conversation.service';
import { CreateDirectConversationData, CreateGroupConversationData } from '../services/conversation.service';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        displayName: string;
      };
    }
  }
}

/**
 * Validation rules for creating a direct conversation
 */
export const validateCreateDirectConversation = [
  body('participantId')
    .isUUID()
    .withMessage('Participant ID must be a valid UUID')
    .notEmpty()
    .withMessage('Participant ID is required')
];

/**
 * Validation rules for creating a group conversation
 */
export const validateCreateGroupConversation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),
  body('participantIds')
    .isArray({ min: 1 })
    .withMessage('At least one participant is required')
    .custom((participantIds: string[]) => {
      if (participantIds.length > 50) {
        throw new Error('Maximum 50 participants allowed');
      }
      // Validate each participant ID is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      for (const id of participantIds) {
        if (!uuidRegex.test(id)) {
          throw new Error('All participant IDs must be valid UUIDs');
        }
      }
      return true;
    })
];

/**
 * Validation rules for conversation ID parameter
 */
export const validateConversationId = [
  param('id')
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID')
];

/**
 * Validation rules for pagination query parameters
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * GET /api/v1/conversations - List user's conversations
 */
export const getUserConversations = async (req: Request, res: Response) => {
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

    const conversations = await conversationService.getUserConversations(req.user.id);

    res.status(200).json({
      message: 'Conversations fetched successfully',
      conversations: conversations,
      count: conversations.length
    });
  } catch (error) {
    console.error('Get user conversations error:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      message: 'An unexpected error occurred while fetching conversations.'
    });
  }
};

/**
 * POST /api/v1/conversations - Create new conversation
 */
export const createConversation = async (req: Request, res: Response) => {
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

    const { type, participantId, name, participantIds } = req.body;

    // Determine conversation type and create accordingly
    if (type === 'direct' || participantId) {
      // Create direct conversation
      if (!participantId) {
        return res.status(400).json({
          error: 'Missing participant ID',
          message: 'participantId is required for direct conversations'
        });
      }

      // Check if user is trying to create a conversation with themselves
      if (participantId === req.user.id) {
        return res.status(400).json({
          error: 'Invalid participant',
          message: 'Cannot create a conversation with yourself'
        });
      }

      const conversationData: CreateDirectConversationData = {
        participantId
      };

      const conversation = await conversationService.createDirectConversation(
        req.user.id,
        conversationData
      );

      res.status(201).json({
        message: 'Direct conversation created successfully',
        conversation: conversation
      });
    } else if (type === 'group' || (name && participantIds)) {
      // Create group conversation
      if (!name || !participantIds) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'name and participantIds are required for group conversations'
        });
      }

      // Check if user is trying to add themselves to the participant list
      if (participantIds.includes(req.user.id)) {
        return res.status(400).json({
          error: 'Invalid participants',
          message: 'Do not include yourself in the participant list'
        });
      }

      const conversationData: CreateGroupConversationData = {
        name,
        participantIds
      };

      const conversation = await conversationService.createGroupConversation(
        req.user.id,
        conversationData
      );

      res.status(201).json({
        message: 'Group conversation created successfully',
        conversation: conversation
      });
    } else {
      return res.status(400).json({
        error: 'Invalid conversation type',
        message: 'Please specify either type: "direct" with participantId, or type: "group" with name and participantIds'
      });
    }
  } catch (error) {
    console.error('Create conversation error:', error);
    if (error instanceof Error) {
      if (error.message.includes('User not found') || error.message.includes('does not exist')) {
        return res.status(404).json({
          error: 'User not found',
          message: error.message
        });
      }
      if (error.message.includes('already exists') || error.message.includes('Conversation already exists')) {
        return res.status(409).json({
          error: 'Conversation already exists',
          message: error.message
        });
      }
      if (error.message.includes('Access denied') || error.message.includes('permission')) {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message
        });
      }
    }
    res.status(500).json({
      error: 'Failed to create conversation',
      message: 'An unexpected error occurred while creating the conversation.'
    });
  }
};

/**
 * GET /api/v1/conversations/:id - Get conversation details
 */
export const getConversationById = async (req: Request, res: Response) => {
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

    const { id } = req.params;

    const conversation = await conversationService.getConversationById(id, req.user.id);

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        message: 'The requested conversation could not be found or you do not have access to it.'
      });
    }

    res.status(200).json({
      message: 'Conversation details fetched successfully',
      conversation: conversation
    });
  } catch (error) {
    console.error('Get conversation by ID error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('not a member')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this conversation'
        });
      }
    }
    res.status(500).json({
      error: 'Failed to fetch conversation',
      message: 'An unexpected error occurred while fetching the conversation details.'
    });
  }
};

/**
 * PUT /api/v1/conversations/:id/name - Update conversation name (group conversations only)
 */
export const updateConversationName = async (req: Request, res: Response) => {
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

    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Name is required',
        message: 'Conversation name cannot be empty'
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        error: 'Name too long',
        message: 'Conversation name must be 100 characters or less'
      });
    }

    const updatedConversation = await conversationService.updateConversationName(
      id,
      req.user.id,
      name.trim()
    );

    res.status(200).json({
      message: 'Conversation name updated successfully',
      conversation: updatedConversation
    });
  } catch (error) {
    console.error('Update conversation name error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Conversation not found',
          message: error.message
        });
      }
      if (error.message.includes('Access denied') || error.message.includes('not a member')) {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message
        });
      }
      if (error.message.includes('Direct conversations') || error.message.includes('cannot be renamed')) {
        return res.status(400).json({
          error: 'Invalid operation',
          message: error.message
        });
      }
    }
    res.status(500).json({
      error: 'Failed to update conversation name',
      message: 'An unexpected error occurred while updating the conversation name.'
    });
  }
};

/**
 * POST /api/v1/conversations/:id/members - Add member to conversation
 */
export const addMemberToConversation = async (req: Request, res: Response) => {
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

    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        message: 'Please provide the userId of the user to add'
      });
    }

    // Check if user is trying to add themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Cannot add yourself to a conversation'
      });
    }

    const updatedConversation = await conversationService.addMemberToConversation(
      id,
      req.user.id,
      { userId }
    );

    res.status(200).json({
      message: 'Member added to conversation successfully',
      conversation: updatedConversation
    });
  } catch (error) {
    console.error('Add member to conversation error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Conversation or user not found',
          message: error.message
        });
      }
      if (error.message.includes('Access denied') || error.message.includes('not a member')) {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message
        });
      }
      if (error.message.includes('already a member') || error.message.includes('already exists')) {
        return res.status(409).json({
          error: 'User already a member',
          message: error.message
        });
      }
      if (error.message.includes('Direct conversations') || error.message.includes('cannot add members')) {
        return res.status(400).json({
          error: 'Invalid operation',
          message: error.message
        });
      }
    }
    res.status(500).json({
      error: 'Failed to add member to conversation',
      message: 'An unexpected error occurred while adding the member.'
    });
  }
};

/**
 * DELETE /api/v1/conversations/:id/members/:userId - Remove member from conversation
 */
export const removeMemberFromConversation = async (req: Request, res: Response) => {
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

    const { id, userId } = req.params;

    // Check if user is trying to remove themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Use the leave conversation endpoint to remove yourself'
      });
    }

    const updatedConversation = await conversationService.removeMemberFromConversation(
      id,
      req.user.id,
      userId
    );

    res.status(200).json({
      message: 'Member removed from conversation successfully',
      conversation: updatedConversation
    });
  } catch (error) {
    console.error('Remove member from conversation error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Conversation or user not found',
          message: error.message
        });
      }
      if (error.message.includes('Access denied') || error.message.includes('not a member')) {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message
        });
      }
      if (error.message.includes('not a member') || error.message.includes('not found in conversation')) {
        return res.status(404).json({
          error: 'User not a member',
          message: error.message
        });
      }
      if (error.message.includes('Direct conversations') || error.message.includes('cannot remove members')) {
        return res.status(400).json({
          error: 'Invalid operation',
          message: error.message
        });
      }
    }
    res.status(500).json({
      error: 'Failed to remove member from conversation',
      message: 'An unexpected error occurred while removing the member.'
    });
  }
};

/**
 * GET /api/v1/conversations/:id/members - Get conversation members
 */
export const getConversationMembers = async (req: Request, res: Response) => {
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

    const { id } = req.params;

    const conversation = await conversationService.getConversationById(id, req.user.id);

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        message: 'The requested conversation could not be found or you do not have access to it.'
      });
    }

    res.status(200).json({
      message: 'Conversation members fetched successfully',
      members: conversation.members,
      count: conversation.members.length
    });
  } catch (error) {
    console.error('Get conversation members error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('not a member')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this conversation'
        });
      }
    }
    res.status(500).json({
      error: 'Failed to fetch conversation members',
      message: 'An unexpected error occurred while fetching the conversation members.'
    });
  }
};
