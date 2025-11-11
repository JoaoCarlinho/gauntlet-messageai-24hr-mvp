import { Request, Response } from 'express';
import { scoreBatch, scoreProspectsByIds } from '../services/batchScoring.service';

/**
 * Batch Scoring Controller
 * API endpoints for batch scoring prospects
 */

/**
 * Score all new prospects in a campaign
 * POST /api/v1/campaigns/:campaignId/prospects/score-batch
 */
export const scoreCampaignBatch = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { maxCount = 100 } = req.body;
    const teamId = req.user?.teamId;

    if (!teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Team ID not found in token'
      });
    }

    if (!campaignId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Campaign ID is required'
      });
    }

    // Validate maxCount
    const validatedMaxCount = Math.min(Math.max(1, parseInt(maxCount) || 100), 1000);

    console.log(`📊 Batch scoring prospects for campaign ${campaignId} (max: ${validatedMaxCount})`);

    // Score the batch
    const result = await scoreBatch(campaignId, teamId, validatedMaxCount);

    // Return batch summary
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error in batch scoring:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
      }
      if (error.message.includes('access denied')) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this resource'
        });
      }
      if (error.message.includes('no ICP')) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Campaign has no ICP defined. Please create an ICP first.'
        });
      }
    }

    // Generic error response
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to score batch'
    });
  }
};

/**
 * Score specific prospects by IDs
 * POST /api/v1/prospects/batch-score
 * Body: { prospectIds: string[] }
 */
export const batchScoreProspectsHandler = async (req: Request, res: Response) => {
  try {
    const { prospectIds, campaignId, filters } = req.body;
    const teamId = req.user?.teamId;

    if (!teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Team ID not found in token'
      });
    }

    // Handle different input formats
    if (prospectIds && Array.isArray(prospectIds)) {
      // Score specific prospect IDs
      if (prospectIds.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Prospect IDs array cannot be empty'
        });
      }

      if (prospectIds.length > 100) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Maximum 100 prospects can be scored at once'
        });
      }

      console.log(`📊 Batch scoring ${prospectIds.length} specific prospects`);

      const result = await scoreProspectsByIds(prospectIds, teamId);

      return res.status(200).json({
        success: true,
        data: result
      });
    } else if (campaignId) {
      // Score prospects from a campaign with filters
      const maxCount = filters?.limit || 100;

      console.log(`📊 Batch scoring prospects from campaign ${campaignId}`);

      const result = await scoreBatch(campaignId, teamId, maxCount);

      return res.status(200).json({
        success: true,
        data: result
      });
    } else {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either prospectIds array or campaignId must be provided'
      });
    }
  } catch (error) {
    console.error('❌ Error in batch scoring:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
      }
      if (error.message.includes('access denied')) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this resource'
        });
      }
    }

    // Generic error response
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to score prospects'
    });
  }
};

export default {
  scoreCampaignBatch,
  batchScoreProspectsHandler
};