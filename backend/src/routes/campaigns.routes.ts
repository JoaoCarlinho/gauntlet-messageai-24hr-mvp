import { Router } from 'express';
import * as campaignsController from '../controllers/campaigns.controller';

/**
 * Campaign Routes
 * Routes for campaign and ad creative management
 */

const router = Router();

/**
 * Campaign CRUD Routes
 */

/**
 * POST /api/v1/campaigns
 * Create a new campaign
 */
router.post('/', campaignsController.createCampaign);

/**
 * GET /api/v1/campaigns
 * List campaigns with optional filters
 */
router.get('/', campaignsController.listCampaigns);

/**
 * GET /api/v1/campaigns/:id
 * Get specific campaign details
 */
router.get('/:id', campaignsController.getCampaign);

/**
 * PUT /api/v1/campaigns/:id
 * Update a campaign
 */
router.put('/:id', campaignsController.updateCampaign);

/**
 * DELETE /api/v1/campaigns/:id
 * Delete a campaign
 */
router.delete('/:id', campaignsController.deleteCampaign);

/**
 * Campaign Metrics Routes
 */

/**
 * GET /api/v1/campaigns/:id/metrics
 * Get campaign metrics
 */
router.get('/:id/metrics', campaignsController.getMetrics);

/**
 * POST /api/v1/campaigns/:id/metrics
 * Add metrics for a campaign
 */
router.post('/:id/metrics', campaignsController.addMetrics);

/**
 * GET /api/v1/campaigns/:id/roi
 * Calculate campaign ROI
 */
router.get('/:id/roi', campaignsController.calculateROI);

/**
 * Ad Creative Routes
 */

/**
 * POST /api/v1/campaigns/:id/creatives
 * Create ad creative for a campaign
 */
router.post('/:id/creatives', campaignsController.createAdCreative);

/**
 * GET /api/v1/campaigns/:id/creatives
 * List ad creatives for a campaign
 */
router.get('/:id/creatives', campaignsController.listAdCreatives);

export default router;
