import { Request, Response } from 'express';
import prisma from '../config/database';
import { getProspect } from '../services/prospects.service';

/**
 * Campaign Dashboard Controller
 * API endpoints for campaign dashboard views
 */

/**
 * Get campaign status with funnel metrics
 * GET /api/v1/campaigns/:campaignId/status
 */
export const getCampaignStatus = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const teamId = req.user?.teamId;

    if (!teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Team ID not found in token'
      });
    }

    // Load campaign with team validation
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id: campaignId, teamId },
      include: { icp: true }
    });

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found or access denied'
      });
    }

    // Query prospect counts by status
    const statusCounts = await prisma.prospect.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true
    });

    const statusBreakdown = statusCounts.reduce((acc, { status, _count }) => {
      acc[status] = _count;
      return acc;
    }, {} as Record<string, number>);

    // Query platform breakdown
    const platformCounts = await prisma.prospect.groupBy({
      by: ['platform'],
      where: { campaignId },
      _count: true
    });

    const platformBreakdown = platformCounts.reduce((acc, { platform, _count }) => {
      acc[platform] = {
        discovered: _count,
        enriched: 0,
        qualified: 0,
        converted: 0
      };
      return acc;
    }, {} as Record<string, any>);

    // Get detailed platform stats
    const platformStatusCounts = await prisma.prospect.groupBy({
      by: ['platform', 'status'],
      where: { campaignId },
      _count: true
    });

    platformStatusCounts.forEach(({ platform, status, _count }) => {
      if (platformBreakdown[platform]) {
        if (status === 'enriched') platformBreakdown[platform].enriched = _count;
        if (status === 'qualified') platformBreakdown[platform].qualified = _count;
        if (status === 'converted') platformBreakdown[platform].converted = _count;
      }
    });

    // Calculate velocity metrics
    const daysSinceStart = campaign.startedAt
      ? Math.max(1, Math.floor(
          (Date.now() - campaign.startedAt.getTime()) / (1000 * 60 * 60 * 24)
        ))
      : 1;
    const prospectsPerDay = campaign.discoveredCount / daysSinceStart;
    const targetProspects = 500; // From PRD goal
    const daysToTarget = prospectsPerDay > 0
      ? Math.ceil((targetProspects - campaign.discoveredCount) / prospectsPerDay)
      : null;

    // Calculate conversion rates
    const enrichmentRate = campaign.discoveredCount > 0
      ? (statusBreakdown.enriched || 0) / campaign.discoveredCount
      : 0;
    const qualificationRate = (statusBreakdown.enriched || 0) > 0
      ? campaign.qualifiedCount / (statusBreakdown.enriched || 1)
      : 0;
    const conversionRate = campaign.qualifiedCount > 0
      ? campaign.convertedCount / campaign.qualifiedCount
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          platforms: campaign.platforms,
          startedAt: campaign.startedAt,
          icp: campaign.icp ? {
            id: campaign.icp.id,
            name: campaign.icp.name
          } : null
        },
        funnel: {
          discovered: campaign.discoveredCount,
          enriched: statusBreakdown.enriched || 0,
          qualified: campaign.qualifiedCount,
          converted: campaign.convertedCount
        },
        rates: {
          enrichment: Math.round(enrichmentRate * 100) / 100,
          qualification: Math.round(qualificationRate * 100) / 100,
          conversion: Math.round(conversionRate * 100) / 100
        },
        platformBreakdown,
        velocity: {
          prospectsPerDay: Math.round(prospectsPerDay),
          estimatedDaysToTarget: campaign.status === 'running' ? daysToTarget : null,
          targetProspects
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting campaign status:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get campaign status'
    });
  }
};

/**
 * Get paginated prospects list for a campaign
 * GET /api/v1/campaigns/:campaignId/prospects
 */
export const listCampaignProspects = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const teamId = req.user?.teamId;
    const {
      status,
      minScore,
      maxScore,
      platform,
      limit = '50',
      page = '1',
      sort = 'icpMatchScore',
      order = 'desc'
    } = req.query;

    if (!teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Team ID not found in token'
      });
    }

    // Validate campaign belongs to team
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id: campaignId, teamId }
    });

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found or access denied'
      });
    }

    // Build where clause
    const where: any = { campaignId };
    if (status) where.status = status;
    if (platform) where.platform = platform;
    if (minScore || maxScore) {
      where.icpMatchScore = {};
      if (minScore) where.icpMatchScore.gte = parseFloat(minScore as string);
      if (maxScore) where.icpMatchScore.lte = parseFloat(maxScore as string);
    }

    // Parse pagination
    const limitNum = Math.min(100, parseInt(limit as string) || 50);
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const skip = (pageNum - 1) * limitNum;

    // Count total
    const total = await prisma.prospect.count({ where });

    // Build orderBy
    const validSorts = ['icpMatchScore', 'discoveredAt', 'name', 'qualityScore'];
    const sortField = validSorts.includes(sort as string) ? sort : 'icpMatchScore';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    // Query prospects
    const prospects = await prisma.prospect.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      take: limitNum,
      skip,
      select: {
        id: true,
        name: true,
        headline: true,
        companyName: true,
        location: true,
        platform: true,
        profileUrl: true,
        icpMatchScore: true,
        qualityScore: true,
        status: true,
        discoveredAt: true,
        contactInfo: true
      }
    });

    // Mask sensitive data
    const maskedProspects = prospects.map(p => ({
      ...p,
      contactInfo: p.contactInfo && typeof p.contactInfo === 'object' && 'email' in p.contactInfo
        ? {
            email: maskEmail((p.contactInfo as any).email),
            hasEmail: true,
            phone: (p.contactInfo as any).phone ? '***' : null
          }
        : { hasEmail: false }
    }));

    return res.status(200).json({
      success: true,
      data: {
        prospects: maskedProspects,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error listing campaign prospects:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to list prospects'
    });
  }
};

/**
 * Get detailed prospect information
 * GET /api/v1/prospects/:prospectId
 */
export const getProspectDetails = async (req: Request, res: Response) => {
  try {
    const { prospectId } = req.params;
    const teamId = req.user?.teamId;

    if (!teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Team ID not found in token'
      });
    }

    // Load prospect with campaign and ICP
    const prospect = await prisma.prospect.findFirst({
      where: {
        id: prospectId,
        campaign: { teamId } // Enforce team access
      },
      include: {
        campaign: {
          include: { icp: true }
        }
      }
    });

    if (!prospect) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prospect not found or access denied'
      });
    }

    // Build activity timeline
    const timeline = [
      { event: 'discovered', timestamp: prospect.discoveredAt },
      prospect.enrichedAt && { event: 'enriched', timestamp: prospect.enrichedAt },
      prospect.convertedToLeadId && { event: 'converted', timestamp: prospect.updatedAt }
    ].filter(Boolean);

    // Extract enrichment data if available
    const enrichmentData = prospect.enrichmentData as any;
    const profileData = prospect.profileData as any;
    const contactInfo = prospect.contactInfo as any;

    return res.status(200).json({
      success: true,
      data: {
        prospect: {
          id: prospect.id,
          name: prospect.name,
          headline: prospect.headline,
          location: prospect.location,
          platform: prospect.platform,
          profileUrl: prospect.profileUrl,
          status: prospect.status,
          discoveredAt: prospect.discoveredAt
        },
        company: {
          name: prospect.companyName,
          url: prospect.companyUrl,
          size: enrichmentData?.companySize,
          industry: enrichmentData?.industry || profileData?.industry
        },
        contact: {
          email: contactInfo?.email,
          emailVerified: enrichmentData?.emailVerified || false,
          phone: contactInfo?.phone,
          linkedin: prospect.platform === 'linkedin' ? prospect.profileUrl : null
        },
        icpMatch: {
          score: prospect.icpMatchScore,
          qualification: getQualificationTier(prospect.icpMatchScore || 0),
          qualityScore: prospect.qualityScore,
          breakdown: enrichmentData?.scoreBreakdown || {
            demographics: null,
            firmographics: null,
            psychographics: null,
            activity: null
          }
        },
        enrichment: prospect.enrichedAt
          ? {
              provider: enrichmentData?.provider || 'unknown',
              quality: prospect.qualityScore,
              enrichedAt: prospect.enrichedAt,
              dataPoints: enrichmentData ? Object.keys(enrichmentData).length : 0
            }
          : null,
        campaign: {
          id: prospect.campaign.id,
          name: prospect.campaign.name,
          icp: prospect.campaign.icp ? {
            id: prospect.campaign.icp.id,
            name: prospect.campaign.icp.name
          } : null
        },
        timeline
      }
    });
  } catch (error) {
    console.error('❌ Error getting prospect details:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get prospect details'
    });
  }
};

/**
 * Helper function to mask email for privacy
 */
const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return '***';
  const [name, domain] = email.split('@');
  if (name.length <= 1) return `${name}***@${domain}`;
  return `${name[0]}***@${domain}`;
};

/**
 * Helper function to determine qualification tier
 */
const getQualificationTier = (score: number): string => {
  if (score >= 0.85) return 'hot';
  if (score >= 0.75) return 'qualified';
  if (score >= 0.65) return 'warm';
  return 'discard';
};

export default {
  getCampaignStatus,
  listCampaignProspects,
  getProspectDetails
};