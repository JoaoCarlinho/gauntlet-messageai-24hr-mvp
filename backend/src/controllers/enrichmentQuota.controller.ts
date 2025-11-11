import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * Enrichment Quota Dashboard Controller
 * API endpoints for tracking enrichment API usage and quotas
 */

/**
 * Get enrichment quota status
 * GET /api/v1/enrichment/quota
 */
export const getEnrichmentQuota = async (req: Request, res: Response) => {
  try {
    const teamId = req.user?.teamId;

    if (!teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Team ID not found in token'
      });
    }

    // Get Apollo usage (annual)
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const apolloUsage = await prisma.enrichmentLog.count({
      where: {
        teamId,
        provider: 'apollo',
        status: 'success',
        createdAt: { gte: startOfYear }
      }
    });

    // Get Hunter usage (monthly)
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const hunterUsage = await prisma.enrichmentLog.count({
      where: {
        teamId,
        provider: 'hunter',
        status: 'success',
        createdAt: { gte: startOfMonth }
      }
    });

    // Get recent enrichment activity
    const recentActivity = await prisma.enrichmentLog.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        provider: true,
        status: true,
        prospectId: true,
        creditsUsed: true,
        createdAt: true
      }
    });

    // Calculate quota percentages
    const apolloLimit = 10000;
    const hunterLimit = 25;

    const apolloPercentage = (apolloUsage / apolloLimit) * 100;
    const hunterPercentage = (hunterUsage / hunterLimit) * 100;

    // Calculate reset dates
    const apolloResetDate = new Date(new Date().getFullYear() + 1, 0, 1);
    const hunterResetDate = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      1
    );

    return res.status(200).json({
      success: true,
      data: {
        apollo: {
          used: apolloUsage,
          limit: apolloLimit,
          remaining: apolloLimit - apolloUsage,
          percentage: Math.round(apolloPercentage),
          resetDate: apolloResetDate,
          period: 'annual'
        },
        hunter: {
          used: hunterUsage,
          limit: hunterLimit,
          remaining: hunterLimit - hunterUsage,
          percentage: Math.round(hunterPercentage),
          resetDate: hunterResetDate,
          period: 'monthly'
        },
        recentActivity,
        warnings: [
          apolloPercentage >= 80 && `Apollo quota ${Math.round(apolloPercentage)}% used`,
          hunterPercentage >= 80 && `Hunter quota ${Math.round(hunterPercentage)}% used`
        ].filter(Boolean)
      }
    });
  } catch (error) {
    console.error('❌ Error getting enrichment quota:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get quota'
    });
  }
};

export default {
  getEnrichmentQuota
};