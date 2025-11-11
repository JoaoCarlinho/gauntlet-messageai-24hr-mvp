import { Request, Response } from 'express';
import { enrichProspect } from '../services/enrichment.service';
import { updateProspect } from '../services/prospects.service';
import prisma from '../config/database';

/**
 * Batch Enrichment Controller
 * API endpoints for bulk prospect enrichment
 */

/**
 * Batch enrich prospects
 * POST /api/v1/prospects/batch-enrich
 */
export const batchEnrichProspects = async (req: Request, res: Response) => {
  try {
    const { prospectIds, campaignId, maxCount = 10 } = req.body;
    const teamId = req.user?.teamId;

    if (!teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Team ID not found in token'
      });
    }

    let prospectsToEnrich: any[] = [];

    // Get prospects to enrich
    if (prospectIds && Array.isArray(prospectIds)) {
      prospectsToEnrich = await prisma.prospect.findMany({
        where: {
          id: { in: prospectIds },
          campaign: { teamId }
        },
        take: maxCount
      });
    } else if (campaignId) {
      prospectsToEnrich = await prisma.prospect.findMany({
        where: {
          campaignId,
          campaign: { teamId },
          status: { in: ['new', 'qualified'] },
          icpMatchScore: { gte: 0.75 }
        },
        orderBy: { icpMatchScore: 'desc' },
        take: maxCount
      });
    } else {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either prospectIds or campaignId required'
      });
    }

    // Process enrichment in parallel (max 5 concurrent)
    const results = await Promise.allSettled(
      prospectsToEnrich.map(async (prospect) => {
        try {
          const enrichmentResult = await enrichProspect(prospect, teamId);

          // Update prospect with enrichment data
          await updateProspect(
            prospect.id,
            {
              contactInfo: {
                email: enrichmentResult.email,
                phone: enrichmentResult.phone
              },
              enrichmentData: enrichmentResult,
              status: 'enriched',
              enrichedAt: new Date()
            },
            teamId
          );

          return {
            prospectId: prospect.id,
            success: true,
            email: enrichmentResult.email,
            provider: enrichmentResult.provider
          };
        } catch (error) {
          return {
            prospectId: prospect.id,
            success: false,
            error: error instanceof Error ? error.message : 'Enrichment failed'
          };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

    return res.status(200).json({
      success: true,
      data: {
        enriched: successful.length,
        failed: failed.length,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'Failed' })
      }
    });
  } catch (error) {
    console.error('❌ Batch enrichment error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to enrich prospects'
    });
  }
};

export default {
  batchEnrichProspects
};