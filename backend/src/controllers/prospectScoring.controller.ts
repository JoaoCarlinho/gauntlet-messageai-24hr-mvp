import { Request, Response } from 'express';
import { scoreProspect } from '../services/prospectScoring.service';

/**
 * Prospect Scoring Controller
 * API endpoints for scoring prospects against ICP criteria
 */

/**
 * Score a single prospect against ICP
 * POST /api/v1/prospects/:prospectId/score
 */
export const scoreProspectHandler = async (req: Request, res: Response) => {
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

    console.log(`📊 Scoring prospect ${prospectId} for team ${teamId}`);

    // Score the prospect
    const result = await scoreProspect(prospectId, teamId);

    // Return scoring result
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error scoring prospect:', error);

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
      message: error instanceof Error ? error.message : 'Failed to score prospect'
    });
  }
};

export default {
  scoreProspectHandler
};