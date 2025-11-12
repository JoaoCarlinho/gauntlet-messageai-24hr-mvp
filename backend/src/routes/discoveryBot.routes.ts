/**
 * Discovery Bot Routes
 *
 * Routes for Discovery Bot functionality including manual lead capture
 * with production features:
 * - Rate limiting for ToS compliance
 * - Advanced scraping with Puppeteer
 * - LinkedIn authentication support
 * - Facebook Graph API integration
 */

import { Router } from 'express';
import {
  captureProfile,
  checkProfileStatus,
  getLinkedInRateLimits,
  getLinkedInAccountHealth,
} from '../controllers/profileCapture.controller';
import { profileCaptureLimiter } from '../middleware/scraperRateLimiter';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/discovery-bot/capture-profile
 * Capture a profile from LinkedIn or Facebook URL and create lead
 *
 * Rate limited to prevent abuse and comply with platform ToS
 */
router.post('/capture-profile', profileCaptureLimiter, captureProfile);

/**
 * GET /api/discovery-bot/capture-profile/status
 * Check if a profile URL has already been captured
 */
router.get('/capture-profile/status', checkProfileStatus);

/**
 * GET /api/discovery-bot/linkedin/rate-limits
 * Get current LinkedIn rate limit status and usage statistics
 */
router.get('/linkedin/rate-limits', getLinkedInRateLimits);

/**
 * GET /api/discovery-bot/linkedin/account-health
 * Get LinkedIn account health metrics
 */
router.get('/linkedin/account-health', getLinkedInAccountHealth);

export default router;
