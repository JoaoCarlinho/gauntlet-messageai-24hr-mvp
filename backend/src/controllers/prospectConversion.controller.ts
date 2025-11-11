import { Request, Response } from 'express';
import {
  convertProspectToLead,
  batchConvertProspects,
  ConflictError,
  BadRequestError
} from '../services/prospectConversion.service';

/**
 * Prospect Conversion Controller
 * API endpoints for converting prospects to leads
 */

/**
 * Convert a single prospect to lead
 * POST /api/v1/prospects/:prospectId/convert
 */
export const convertProspectToLeadHandler = async (req: Request, res: Response) => {
  try {
    const { prospectId } = req.params;
    const teamId = req.user?.teamId;

    if (!teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Team ID not found in token'
      });
    }

    if (!prospectId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prospect ID is required'
      });
    }

    console.log(`🔄 Converting prospect ${prospectId} to lead for team ${teamId}`);

    // Convert the prospect
    const result = await convertProspectToLead(prospectId, teamId);

    // Return success response
    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error converting prospect:', error);

    // Handle specific error cases
    if (error instanceof ConflictError) {
      return res.status(409).json({
        error: 'Conflict',
        message: error.message
      });
    }

    if (error instanceof BadRequestError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

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
      message: error instanceof Error ? error.message : 'Failed to convert prospect'
    });
  }
};

/**
 * Batch convert multiple prospects to leads
 * POST /api/v1/prospects/batch-convert
 * Body: { prospectIds: string[] }
 */
export const batchConvertProspectsHandler = async (req: Request, res: Response) => {
  try {
    const { prospectIds } = req.body;
    const teamId = req.user?.teamId;

    if (!teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Team ID not found in token'
      });
    }

    if (!prospectIds || !Array.isArray(prospectIds)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'prospectIds array is required'
      });
    }

    if (prospectIds.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'prospectIds array cannot be empty'
      });
    }

    if (prospectIds.length > 50) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Maximum 50 prospects can be converted at once'
      });
    }

    console.log(`🔄 Batch converting ${prospectIds.length} prospects for team ${teamId}`);

    // Batch convert prospects
    const result = await batchConvertProspects(prospectIds, teamId);

    // Return batch result
    return res.status(200).json({
      success: true,
      data: {
        converted: result.successful.length,
        failed: result.failed.length,
        successful: result.successful,
        errors: result.failed
      }
    });
  } catch (error) {
    console.error('❌ Error in batch conversion:', error);

    // Generic error response
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to batch convert prospects'
    });
  }
};

export default {
  convertProspectToLeadHandler,
  batchConvertProspectsHandler
};