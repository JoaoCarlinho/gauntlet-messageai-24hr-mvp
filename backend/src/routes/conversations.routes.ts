import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserConversations,
  createConversation,
  getConversationById,
  updateConversationName,
  addMemberToConversation,
  removeMemberFromConversation,
  getConversationMembers,
  validateCreateDirectConversation,
  validateCreateGroupConversation,
  validateConversationId,
  validatePagination
} from '../controllers/conversations.controller';

const router = Router();

// Apply authentication middleware to all conversation routes
router.use(authenticate);

// GET /api/v1/conversations - List user's conversations
router.get('/', validatePagination, getUserConversations);

// POST /api/v1/conversations - Create new conversation
router.post('/', createConversation);

// GET /api/v1/conversations/:id - Get conversation details
router.get('/:id', validateConversationId, getConversationById);

// PUT /api/v1/conversations/:id/name - Update conversation name (group conversations only)
router.put('/:id/name', validateConversationId, updateConversationName);

// POST /api/v1/conversations/:id/members - Add member to conversation
router.post('/:id/members', validateConversationId, addMemberToConversation);

// DELETE /api/v1/conversations/:id/members/:userId - Remove member from conversation
router.delete('/:id/members/:userId', validateConversationId, removeMemberFromConversation);

// GET /api/v1/conversations/:id/members - Get conversation members
router.get('/:id/members', validateConversationId, getConversationMembers);

export default router;
