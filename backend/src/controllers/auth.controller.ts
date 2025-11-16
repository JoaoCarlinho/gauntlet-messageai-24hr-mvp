import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import {
  registerUser,
  loginUser,
  loginWithGoogle,
  refreshAccessToken,
  logoutUser,
  changePassword,
  getUserProfile,
  updateUserProfile,
  isValidEmail,
  isValidPhoneNumber,
  requestPasswordReset,
  verifyPasswordResetToken,
  resetPassword
} from '../services/auth.service';

/**
 * Validation rules for user registration
 */
export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('displayName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters'),
  body('phoneNumber')
    .optional()
    .custom((value) => {
      if (value && !isValidPhoneNumber(value)) {
        throw new Error('Please provide a valid phone number');
      }
      return true;
    })
];

/**
 * Validation rules for user login
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for Google login
 */
export const validateGoogleLogin = [
  body('idToken')
    .notEmpty()
    .withMessage('Google ID token is required')
    .isString()
    .withMessage('ID token must be a string')
];

/**
 * Validation rules for password change
 */
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

/**
 * Validation rules for profile update
 */
export const validateProfileUpdate = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters'),
  body('phoneNumber')
    .optional()
    .custom((value) => {
      if (value && !isValidPhoneNumber(value)) {
        throw new Error('Please provide a valid phone number');
      }
      return true;
    }),
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('Avatar URL must be a valid URL')
];

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, displayName, phoneNumber } = req.body;

    const result = await registerUser({
      email,
      password,
      displayName,
      phoneNumber
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      tokens: result.tokens
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: 'User already exists',
          message: error.message
        });
      }
      if (error.message.includes('Password must be')) {
        return res.status(400).json({
          error: 'Password validation failed',
          message: error.message
        });
      }
    }

    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    const result = await loginUser({ email, password });

    res.status(200).json({
      message: 'Login successful',
      user: result.user,
      tokens: result.tokens
    });
  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof Error && error.message.includes('Invalid email or password')) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
};

/**
 * Login with Google
 */
export const googleLogin = async (req: Request, res: Response) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { idToken, pushToken, platform, deviceId } = req.body;

    const result = await loginWithGoogle({
      idToken,
      pushToken,
      platform,
      deviceId
    });

    res.status(200).json({
      message: 'Google login successful',
      user: result.user,
      tokens: result.tokens
    });
  } catch (error) {
    console.error('Google login error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Google authentication failed')) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: error.message
        });
      }
      if (error.message.includes('Email not provided')) {
        return res.status(400).json({
          error: 'Invalid token',
          message: 'Google account email is required'
        });
      }
    }

    res.status(500).json({
      error: 'Google login failed',
      message: 'An error occurred during Google authentication'
    });
  }
};

/**
 * Refresh access token
 */
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        message: 'Please provide a refresh token'
      });
    }

    const result = await refreshAccessToken(refreshToken);

    res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken: result.accessToken,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    res.status(401).json({
      error: 'Token refresh failed',
      message: 'Invalid or expired refresh token'
    });
  }
};

/**
 * Logout user
 */
export const logout = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    await logoutUser(req.user.id);

    res.status(200).json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
};

/**
 * Change user password
 */
export const changeUserPassword = async (req: Request, res: Response) => {
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

    const { currentPassword, newPassword } = req.body;

    await changePassword(req.user.id, currentPassword, newPassword);

    res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Current password is incorrect')) {
        return res.status(400).json({
          error: 'Password change failed',
          message: error.message
        });
      }
      if (error.message.includes('New password must be')) {
        return res.status(400).json({
          error: 'Password validation failed',
          message: error.message
        });
      }
    }

    res.status(500).json({
      error: 'Password change failed',
      message: 'An error occurred while changing password'
    });
  }
};

/**
 * Get user profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const profile = await getUserProfile(req.user.id);

    res.status(200).json({
      user: profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'An error occurred while fetching profile'
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: Request, res: Response) => {
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

    const { displayName, avatarUrl, phoneNumber } = req.body;

    const updatedProfile = await updateUserProfile(req.user.id, {
      displayName,
      avatarUrl,
      phoneNumber
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedProfile
    });
  } catch (error) {
    console.error('Update profile error:', error);

    res.status(500).json({
      error: 'Profile update failed',
      message: 'An error occurred while updating profile'
    });
  }
};

/**
 * Validation rules for password reset request
 */
export const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

/**
 * Validation rules for password reset
 */
export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isString()
    .withMessage('Reset token must be a string'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

/**
 * Request password reset - sends reset email
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email } = req.body;

    await requestPasswordReset(email);

    // Always return success for security (don't reveal if email exists)
    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    // Don't reveal internal errors for security
    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  }
};

/**
 * Verify password reset token
 */
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Reset token is required'
      });
    }

    const result = await verifyPasswordResetToken(token);

    if (result.valid) {
      res.status(200).json({
        valid: true,
        message: 'Token is valid'
      });
    } else {
      res.status(400).json({
        valid: false,
        message: 'Invalid or expired reset token'
      });
    }
  } catch (error) {
    console.error('Verify reset token error:', error);

    res.status(400).json({
      valid: false,
      message: 'Invalid or expired reset token'
    });
  }
};

/**
 * Reset password using token
 */
export const resetPasswordWithToken = async (req: Request, res: Response) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    await resetPassword(token, newPassword);

    res.status(200).json({
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Invalid or expired')) {
        return res.status(400).json({
          error: 'Reset failed',
          message: error.message
        });
      }
      if (error.message.includes('Password must be')) {
        return res.status(400).json({
          error: 'Password validation failed',
          message: error.message
        });
      }
    }

    res.status(500).json({
      error: 'Password reset failed',
      message: 'An error occurred while resetting password'
    });
  }
};
