import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { scoreProspectHandler } from '../controllers/prospectScoring.controller';
import {
  batchScoreProspectsHandler
} from '../controllers/batchScoring.controller';
import { getProspectDetails } from '../controllers/campaignDashboard.controller';
import {
  convertProspectToLeadHandler,
  batchConvertProspectsHandler
} from '../controllers/prospectConversion.controller';

const router = Router();

/**
 * Prospect Routes
 * API endpoints for prospect management and scoring
 */

// All routes require authentication
router.use(authenticate);

/**
 * Batch score prospects from CSV upload
 * POST /api/v1/prospects/batch-score
 * Body: { prospectIds: string[] } or { campaignId: string, filters?: {...} }
 */
router.post('/batch-score', batchScoreProspectsHandler);

/**
 * Batch convert prospects to leads
 * POST /api/v1/prospects/batch-convert
 * Body: { prospectIds: string[] }
 */
router.post('/batch-convert', batchConvertProspectsHandler);

/**
 * Get detailed prospect information
 * GET /api/v1/prospects/:prospectId
 */
router.get('/:prospectId', getProspectDetails);

/**
 * Score a single prospect against ICP
 * POST /api/v1/prospects/:prospectId/score
 */
router.post('/:prospectId/score', scoreProspectHandler);

/**
 * Convert a single prospect to lead
 * POST /api/v1/prospects/:prospectId/convert
 */
router.post('/:prospectId/convert', convertProspectToLeadHandler);

export default router;