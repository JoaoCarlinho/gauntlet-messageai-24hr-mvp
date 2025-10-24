import { Router } from 'express';
import {
  getPrivacyPolicy,
  getTermsOfService,
  getAcceptableUsePolicy
} from '../controllers/policies.controller';

const router = Router();

/**
 * @route   GET /api/v1/policies/privacy
 * @desc    Get privacy policy
 * @access  Public
 */
router.get('/privacy', getPrivacyPolicy);

/**
 * @route   GET /api/v1/policies/terms
 * @desc    Get terms of service
 * @access  Public
 */
router.get('/terms', getTermsOfService);

/**
 * @route   GET /api/v1/policies/acceptable-use
 * @desc    Get acceptable use policy
 * @access  Public
 */
router.get('/acceptable-use', getAcceptableUsePolicy);

export default router;
