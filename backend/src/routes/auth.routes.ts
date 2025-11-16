import { Router } from 'express';
import {
  register,
  login,
  googleLogin,
  refresh,
  logout,
  changeUserPassword,
  getProfile,
  updateProfile,
  validateRegistration,
  validateLogin,
  validateGoogleLogin,
  validatePasswordChange,
  validateProfileUpdate,
  forgotPassword,
  verifyResetToken,
  resetPasswordWithToken,
  validatePasswordResetRequest,
  validatePasswordReset
} from '../controllers/auth.controller';
import { authenticate, authRateLimit } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authRateLimit, validateRegistration, register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authRateLimit, validateLogin, login);

/**
 * @route   POST /api/v1/auth/google
 * @desc    Login with Google
 * @access  Public
 */
router.post('/google', authRateLimit, validateGoogleLogin, googleLogin);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refresh);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticate, validatePasswordChange, changeUserPassword);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, getProfile);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, validateProfileUpdate, updateProfile);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authRateLimit, validatePasswordResetRequest, forgotPassword);

/**
 * @route   GET /api/v1/auth/verify-reset-token
 * @desc    Verify password reset token
 * @access  Public
 */
router.get('/verify-reset-token', verifyResetToken);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password', authRateLimit, validatePasswordReset, resetPasswordWithToken);

export default router;
