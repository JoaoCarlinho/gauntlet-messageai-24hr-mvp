/**
 * Discovery Bot Routes
 *
 * Routes for Discovery Bot functionality including manual lead capture
 */

import { Router } from 'express';
import { captureProfile, checkProfileStatus } from '../controllers/profileCapture.controller';

const router = Router();

/**
 * POST /api/discovery-bot/capture-profile
 * Capture a profile from LinkedIn or Facebook URL and create lead
 */
router.post('/capture-profile', captureProfile);

/**
 * GET /api/discovery-bot/capture-profile/status
 * Check if a profile URL has already been captured
 */
router.get('/capture-profile/status', checkProfileStatus);

export default router;
