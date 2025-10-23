import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { getUserProfile, updateUserProfile, searchUsers, addPushToken, removePushToken, getUserPushTokens } from '../services/users.service';
import { uploadAvatarToS3 } from '../services/s3.service';

/**
 * Validation rules for profile update
 */
export const validateProfileUpdate = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters')
];

/**
 * Validation rules for user search
 */
export const validateUserSearch = [
  body('query')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
];

/**
 * Validation rules for push token operations
 */
export const validatePushToken = [
  body('pushToken')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Push token is required and must be less than 500 characters'),
  body('platform')
    .trim()
    .isIn(['ios', 'android', 'web'])
    .withMessage('Platform must be ios, android, or web'),
  body('deviceId')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Device ID must be less than 200 characters')
];

/**
 * Get current user profile
 * GET /api/v1/users/me
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const profile = await getUserProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The user profile could not be found'
      });
    }

    res.status(200).json({
      user: profile
    });
  } catch (error) {
    console.error('Get current user error:', error);
    
    res.status(500).json({
      error: 'Failed to get user profile',
      message: 'An error occurred while fetching user profile'
    });
  }
};

/**
 * Update current user profile
 * PUT /api/v1/users/me
 */
export const updateCurrentUser = async (req: Request, res: Response) => {
  try {
    // Check validation results
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

    const { displayName } = req.body;

    const updatedProfile = await updateUserProfile(req.user.id, {
      displayName
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedProfile
    });
  } catch (error) {
    console.error('Update current user error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Display name cannot be empty')) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message
        });
      }
      if (error.message.includes('Display name must be')) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message
        });
      }
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          error: 'User not found',
          message: error.message
        });
      }
    }

    res.status(500).json({
      error: 'Profile update failed',
      message: 'An error occurred while updating profile'
    });
  }
};

/**
 * Upload user avatar to S3
 * POST /api/v1/users/avatar
 */
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide an image file to upload as avatar'
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Avatar must be a JPEG, PNG, GIF, or WebP image'
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      return res.status(400).json({
        error: 'File too large',
        message: 'Avatar image must be smaller than 5MB'
      });
    }

    // Upload to S3 and get URL
    const avatarUrl = await uploadAvatarToS3(req.file, req.user.id);

    // Update user profile with new avatar URL
    const updatedProfile = await updateUserProfile(req.user.id, {
      avatarUrl
    });

    res.status(200).json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
      user: updatedProfile
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('S3 upload failed')) {
        return res.status(500).json({
          error: 'Upload failed',
          message: 'Failed to upload avatar to storage'
        });
      }
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          error: 'User not found',
          message: error.message
        });
      }
    }

    res.status(500).json({
      error: 'Avatar upload failed',
      message: 'An error occurred while uploading avatar'
    });
  }
};

/**
 * Search users by display name or email
 * GET /api/v1/users/search?q=query
 */
export const searchUsersEndpoint = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const { q: query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Search query required',
        message: 'Please provide a search query parameter'
      });
    }

    if (query.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query too short',
        message: 'Search query must be at least 2 characters long'
      });
    }

    const users = await searchUsers(query, req.user.id);

    res.status(200).json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('User search error:', error);
    
    res.status(500).json({
      error: 'Search failed',
      message: 'An error occurred while searching users'
    });
  }
};

/**
 * Add push token to user
 * POST /api/v1/users/push-token
 */
export const addUserPushToken = async (req: Request, res: Response) => {
  try {
    // Check validation results
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

    const { pushToken, platform, deviceId } = req.body;

    const success = await addPushToken(req.user.id, {
      pushToken,
      platform,
      deviceId
    });

    if (success) {
      res.status(200).json({
        message: 'Push token added successfully',
        success: true
      });
    } else {
      res.status(400).json({
        error: 'Failed to add push token',
        message: 'Could not add push token to user'
      });
    }
  } catch (error) {
    console.error('Add push token error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Push token and platform are required')) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message
        });
      }
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          error: 'User not found',
          message: error.message
        });
      }
    }

    res.status(500).json({
      error: 'Failed to add push token',
      message: 'An error occurred while adding push token'
    });
  }
};

/**
 * Remove push token from user
 * DELETE /api/v1/users/push-token
 */
export const removeUserPushToken = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({
        error: 'Push token required',
        message: 'Please provide a push token to remove'
      });
    }

    const success = await removePushToken(req.user.id, pushToken);

    if (success) {
      res.status(200).json({
        message: 'Push token removed successfully',
        success: true
      });
    } else {
      res.status(400).json({
        error: 'Failed to remove push token',
        message: 'Could not remove push token from user'
      });
    }
  } catch (error) {
    console.error('Remove push token error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Push token is required')) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message
        });
      }
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          error: 'User not found',
          message: error.message
        });
      }
    }

    res.status(500).json({
      error: 'Failed to remove push token',
      message: 'An error occurred while removing push token'
    });
  }
};

/**
 * Get user's push tokens
 * GET /api/v1/users/push-tokens
 */
export const getUserPushTokensEndpoint = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const pushTokens = await getUserPushTokens(req.user.id);

    res.status(200).json({
      pushTokens,
      count: pushTokens.length
    });
  } catch (error) {
    console.error('Get push tokens error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          error: 'User not found',
          message: error.message
        });
      }
    }

    res.status(500).json({
      error: 'Failed to get push tokens',
      message: 'An error occurred while fetching push tokens'
    });
  }
};
