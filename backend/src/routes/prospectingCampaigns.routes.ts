import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { scoreCampaignBatch } from '../controllers/batchScoring.controller';
import { getCampaignStatus, listCampaignProspects } from '../controllers/campaignDashboard.controller';

const router = Router();

/**
 * Prospecting Campaign Routes
 * API endpoints for prospecting campaign management
 */

// All routes require authentication
router.use(authenticate);

/**
 * Get campaign status with funnel metrics
 * GET /api/v1/campaigns/:campaignId/status
 */
router.get('/:campaignId/status', getCampaignStatus);

/**
 * Get paginated prospects list for a campaign
 * GET /api/v1/campaigns/:campaignId/prospects
 * Query params: ?status=enriched&minScore=0.7&limit=50&page=1
 */
router.get('/:campaignId/prospects', listCampaignProspects);

/**
 * Score all new prospects in a campaign
 * POST /api/v1/campaigns/:campaignId/prospects/score-batch
 * Body: { maxCount?: number }
 */
router.post('/:campaignId/prospects/score-batch', scoreCampaignBatch);

export default router;