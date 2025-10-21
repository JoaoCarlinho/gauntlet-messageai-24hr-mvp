import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import {
  getCurrentUser,
  updateCurrentUser,
  uploadAvatar,
  searchUsersEndpoint,
  validateProfileUpdate,
  validateUserSearch
} from '../controllers/users.controller';

const router = Router();

// Configure multer for file uploads (in memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
router.get('/me', getCurrentUser);

/**
 * PUT /api/v1/users/me
 * Update current user profile
 */
router.put('/me', validateProfileUpdate, updateCurrentUser);

/**
 * POST /api/v1/users/avatar
 * Upload user avatar
 */
router.post('/avatar', upload.single('avatar'), uploadAvatar);

/**
 * GET /api/v1/users/search?q=query
 * Search users by display name or email
 */
router.get('/search', searchUsersEndpoint);

export default router;
