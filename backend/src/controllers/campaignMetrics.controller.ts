import { Request, Response } from 'express';
import prisma from '../config/database';
import { Parser } from 'json2csv';

/**
 * Campaign Metrics Controller
 * API endpoints for campaign analytics and exports
 */

/**
 * Export campaign metrics as CSV
 * GET /api/v1/campaigns/:campaignId/export
 */
export const exportCampaignMetrics = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { format = 'csv' } = req.query;
    const teamId = req.user?.teamId;

    if (!teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Team ID not found in token'
      });
    }

    // Verify campaign access
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id: campaignId, teamId }
    });

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    // Get all prospects for export
    const prospects = await prisma.prospect.findMany({
      where: { campaignId },
      orderBy: { icpMatchScore: 'desc' }
    });

    if (format === 'csv') {
      const fields = [
        'name',
        'email',
        'company',
        'title',
        'location',
        'icpScore',
        'status',
        'platform',
        'discoveredAt'
      ];

      const data = prospects.map(p => ({
        name: p.name,
        email: (p.contactInfo as any)?.email || '',
        company: p.companyName,
        title: p.headline,
        location: p.location,
        icpScore: p.icpMatchScore,
        status: p.status,
        platform: p.platform,
        discoveredAt: p.discoveredAt
      }));

      const parser = new Parser({ fields });
      const csv = parser.parse(data);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="campaign-${campaignId}.csv"`);
      return res.send(csv);
    }

    return res.json({
      success: true,
      data: prospects
    });
  } catch (error) {
    console.error('❌ Export error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export campaign data'
    });
  }
};

/**
 * Get team analytics dashboard
 * GET /api/v1/analytics/team
 */
export const getTeamAnalytics = async (req: Request, res: Response) => {
  try {
    const teamId = req.user?.teamId;

    if (!teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Team ID not found in token'
      });
    }

    // Get all campaigns for team
    const campaigns = await prisma.prospectingCampaign.findMany({
      where: { teamId }
    });

    // Calculate aggregate metrics
    const totalProspects = campaigns.reduce((sum, c) => sum + c.discoveredCount, 0);
    const totalQualified = campaigns.reduce((sum, c) => sum + c.qualifiedCount, 0);
    const totalConverted = campaigns.reduce((sum, c) => sum + c.convertedCount, 0);

    // Get prospect growth over time
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyGrowth = await prisma.prospect.groupBy({
      by: ['discoveredAt'],
      where: {
        campaign: { teamId },
        discoveredAt: { gte: thirtyDaysAgo }
      },
      _count: true
    });

    // Get top performing campaigns
    const topCampaigns = campaigns
      .sort((a, b) => b.convertedCount - a.convertedCount)
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        discovered: c.discoveredCount,
        qualified: c.qualifiedCount,
        converted: c.convertedCount,
        conversionRate: c.qualifiedCount > 0 ? (c.convertedCount / c.qualifiedCount) : 0
      }));

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCampaigns: campaigns.length,
          totalProspects,
          totalQualified,
          totalConverted,
          avgConversionRate: totalQualified > 0 ? (totalConverted / totalQualified) : 0
        },
        topCampaigns,
        dailyGrowth: dailyGrowth.map(d => ({
          date: d.discoveredAt,
          count: d._count
        }))
      }
    });
  } catch (error) {
    console.error('❌ Analytics error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get team analytics'
    });
  }
};

export default {
  exportCampaignMetrics,
  getTeamAnalytics
};