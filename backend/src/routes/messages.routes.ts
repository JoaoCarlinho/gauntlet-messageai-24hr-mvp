import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import {
  getMessagesForConversation,
  createMessage,
  getMessageById,
  updateMessageStatus,
  markMessageAsRead,
  markMessagesAsRead,
  getUnreadMessageCount,
  getMessageStats,
  deleteMessage,
  uploadMessageMedia,
  validateConversationId,
  validateMessageId,
  validateCreateMessage,
  validateMessagePagination,
  validateMessageStatusUpdate
} from '../controllers/messages.controller';

const router = Router();

// Configure multer for file uploads (in memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'));
    }
  },
});

// Apply authentication middleware to all message routes
router.use(authenticate);

// GET /api/v1/conversations/:id/messages - Get messages for a conversation (paginated)
router.get('/:id/messages', validateConversationId, validateMessagePagination, getMessagesForConversation);

// POST /api/v1/conversations/:id/messages - Create a new message
router.post('/:id/messages', validateConversationId, validateCreateMessage, createMessage);

// GET /api/v1/conversations/:id/messages/:messageId - Get a specific message
router.get('/:id/messages/:messageId', validateConversationId, validateMessageId, getMessageById);

// PUT /api/v1/conversations/:id/messages/:messageId/status - Update message status
router.put('/:id/messages/:messageId/status', validateConversationId, validateMessageId, validateMessageStatusUpdate, updateMessageStatus);

// POST /api/v1/conversations/:id/messages/:messageId/read - Mark message as read
router.post('/:id/messages/:messageId/read', validateConversationId, validateMessageId, markMessageAsRead);

// POST /api/v1/conversations/:id/messages/read - Mark multiple messages as read
router.post('/:id/messages/read', validateConversationId, markMessagesAsRead);

// GET /api/v1/conversations/:id/messages/unread-count - Get unread message count
router.get('/:id/messages/unread-count', validateConversationId, getUnreadMessageCount);

// GET /api/v1/conversations/:id/messages/stats - Get message statistics
router.get('/:id/messages/stats', validateConversationId, getMessageStats);

// DELETE /api/v1/conversations/:id/messages/:messageId - Delete a message
router.delete('/:id/messages/:messageId', validateConversationId, validateMessageId, deleteMessage);

// POST /api/v1/conversations/:id/messages/upload - Upload media file for message
router.post('/:id/messages/upload', validateConversationId, upload.single('media'), uploadMessageMedia);

export default router;
