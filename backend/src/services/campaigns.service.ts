import prisma from '../config/database';
import { Campaign, CampaignMetric } from '@prisma/client';

/**
 * Campaign Service
 * Business logic for campaign management and metrics storage
 */

export interface CreateCampaignData {
  productId: string;
  icpId?: string;
  name: string;
  description?: string;
  platforms: string[];
  budget: number;
  startDate: Date;
  endDate?: Date;
  targetingStrategy?: any;
}

export interface UpdateCampaignData {
  name?: string;
  description?: string;
  platforms?: string[];
  budget?: number;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  targetingStrategy?: any;
}

export interface CampaignFilters {
  status?: string;
  platform?: string;
  productId?: string;
  icpId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface MetricsData {
  date: Date;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  metadata?: any;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Create a new campaign
 * @param teamId - Team ID
 * @param data - Campaign data
 * @returns Created campaign
 */
export const createCampaign = async (
  teamId: string,
  data: CreateCampaignData
): Promise<Campaign> => {
  try {
    console.log(`📢 Creating campaign for team ${teamId}: ${data.name}`);

    // Verify product belongs to team
    const product = await prisma.product.findFirst({
      where: { id: data.productId, teamId },
    });

    if (!product) {
      throw new Error('Product not found or access denied');
    }

    // Verify ICP belongs to product if provided
    if (data.icpId) {
      const icp = await prisma.iCP.findFirst({
        where: { id: data.icpId, productId: data.productId },
      });

      if (!icp) {
        throw new Error('ICP not found or does not belong to the specified product');
      }
    }

    // Validate platforms
    const validPlatforms = ['facebook', 'linkedin', 'tiktok', 'x'];
    const invalidPlatforms = data.platforms.filter(p => !validPlatforms.includes(p));

    if (invalidPlatforms.length > 0) {
      throw new Error(`Invalid platforms: ${invalidPlatforms.join(', ')}. Valid platforms are: ${validPlatforms.join(', ')}`);
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        teamId,
        productId: data.productId,
        icpId: data.icpId,
        name: data.name,
        description: data.description,
        platforms: data.platforms,
        budget: data.budget,
        startDate: data.startDate,
        endDate: data.endDate,
        targetingStrategy: data.targetingStrategy || {},
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        icp: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`✅ Campaign created successfully: ${campaign.id}`);

    return campaign;
  } catch (error) {
    console.error('❌ Failed to create campaign:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create campaign');
  }
};

/**
 * Get campaign by ID
 * @param campaignId - Campaign ID
 * @param teamId - Team ID for access control
 * @returns Campaign or null
 */
export const getCampaign = async (
  campaignId: string,
  teamId: string
): Promise<Campaign | null> => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        teamId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        icp: {
          select: {
            id: true,
            name: true,
            demographics: true,
            firmographics: true,
          },
        },
        _count: {
          select: {
            adCreatives: true,
            leads: true,
            metrics: true,
          },
        },
      },
    });

    return campaign;
  } catch (error) {
    console.error('❌ Failed to get campaign:', error);
    throw new Error('Failed to get campaign');
  }
};

/**
 * List campaigns with optional filters
 * @param teamId - Team ID
 * @param filters - Optional filters
 * @returns Array of campaigns
 */
export const listCampaigns = async (
  teamId: string,
  filters?: CampaignFilters
): Promise<Campaign[]> => {
  try {
    const where: any = { teamId };

    if (filters) {
      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.platform) {
        where.platforms = {
          has: filters.platform,
        };
      }

      if (filters.productId) {
        where.productId = filters.productId;
      }

      if (filters.icpId) {
        where.icpId = filters.icpId;
      }

      if (filters.startDate) {
        where.startDate = {
          gte: filters.startDate,
        };
      }

      if (filters.endDate) {
        where.endDate = {
          lte: filters.endDate,
        };
      }
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        icp: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            adCreatives: true,
            leads: true,
            metrics: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return campaigns;
  } catch (error) {
    console.error('❌ Failed to list campaigns:', error);
    throw new Error('Failed to list campaigns');
  }
};

/**
 * Update campaign
 * @param campaignId - Campaign ID
 * @param teamId - Team ID for access control
 * @param data - Updated campaign data
 * @returns Updated campaign
 */
export const updateCampaign = async (
  campaignId: string,
  teamId: string,
  data: UpdateCampaignData
): Promise<Campaign> => {
  try {
    // Verify campaign belongs to team
    const existingCampaign = await prisma.campaign.findFirst({
      where: { id: campaignId, teamId },
    });

    if (!existingCampaign) {
      throw new Error('Campaign not found or access denied');
    }

    console.log(`📝 Updating campaign ${campaignId}`);

    // Validate platforms if provided
    if (data.platforms) {
      const validPlatforms = ['facebook', 'linkedin', 'tiktok', 'x'];
      const invalidPlatforms = data.platforms.filter(p => !validPlatforms.includes(p));

      if (invalidPlatforms.length > 0) {
        throw new Error(`Invalid platforms: ${invalidPlatforms.join(', ')}. Valid platforms are: ${validPlatforms.join(', ')}`);
      }
    }

    // Validate status if provided
    if (data.status) {
      const validStatuses = ['draft', 'active', 'paused', 'completed'];
      if (!validStatuses.includes(data.status)) {
        throw new Error(`Invalid status: ${data.status}. Valid statuses are: ${validStatuses.join(', ')}`);
      }
    }

    // Update campaign
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        icp: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`✅ Campaign updated successfully`);

    return campaign;
  } catch (error) {
    console.error('❌ Failed to update campaign:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update campaign');
  }
};

/**
 * Delete campaign
 * @param campaignId - Campaign ID
 * @param teamId - Team ID for access control
 */
export const deleteCampaign = async (
  campaignId: string,
  teamId: string
): Promise<void> => {
  try {
    // Verify campaign belongs to team
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, teamId },
    });

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    console.log(`🗑️  Deleting campaign ${campaignId}`);

    // Delete campaign (cascade will delete metrics, ad creatives, etc.)
    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    console.log(`✅ Campaign deleted successfully`);
  } catch (error) {
    console.error('❌ Failed to delete campaign:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete campaign');
  }
};

/**
 * Add metrics for a campaign
 * @param campaignId - Campaign ID
 * @param metricsData - Metrics data
 * @returns Created campaign metric
 */
export const addMetrics = async (
  campaignId: string,
  metricsData: MetricsData
): Promise<CampaignMetric> => {
  try {
    console.log(`📊 Adding metrics for campaign ${campaignId}`);

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Calculate derived metrics
    const ctr = metricsData.impressions > 0
      ? (metricsData.clicks / metricsData.impressions) * 100
      : 0;

    const cpc = metricsData.clicks > 0
      ? metricsData.spend / metricsData.clicks
      : 0;

    const cpa = metricsData.conversions > 0
      ? metricsData.spend / metricsData.conversions
      : 0;

    // For ROAS, we would need revenue data - for now set to 0
    // This can be calculated later when we have conversion value data
    const roas = 0;

    // Upsert metrics (update if exists for this date, create if not)
    const metrics = await prisma.campaignMetric.upsert({
      where: {
        campaignId_date: {
          campaignId,
          date: metricsData.date,
        },
      },
      update: {
        impressions: metricsData.impressions,
        clicks: metricsData.clicks,
        conversions: metricsData.conversions,
        spend: metricsData.spend,
        ctr,
        cpc,
        cpa,
        roas,
        metadata: metricsData.metadata || {},
      },
      create: {
        campaignId,
        date: metricsData.date,
        impressions: metricsData.impressions,
        clicks: metricsData.clicks,
        conversions: metricsData.conversions,
        spend: metricsData.spend,
        ctr,
        cpc,
        cpa,
        roas,
        metadata: metricsData.metadata || {},
      },
    });

    console.log(`✅ Metrics added successfully`);

    return metrics;
  } catch (error) {
    console.error('❌ Failed to add metrics:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to add metrics');
  }
};

/**
 * Get metrics for a campaign within a date range
 * @param campaignId - Campaign ID
 * @param dateRange - Date range
 * @returns Array of campaign metrics
 */
export const getMetrics = async (
  campaignId: string,
  dateRange?: DateRange
): Promise<CampaignMetric[]> => {
  try {
    const where: any = { campaignId };

    if (dateRange) {
      where.date = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    const metrics = await prisma.campaignMetric.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
    });

    return metrics;
  } catch (error) {
    console.error('❌ Failed to get metrics:', error);
    throw new Error('Failed to get metrics');
  }
};

/**
 * Calculate ROI for a campaign
 * @param campaignId - Campaign ID
 * @returns ROI calculation
 */
export const calculateROI = async (
  campaignId: string
): Promise<{
  totalSpend: number;
  totalConversions: number;
  totalImpressions: number;
  totalClicks: number;
  averageCTR: number;
  averageCPC: number;
  averageCPA: number;
  roi: number;
}> => {
  try {
    console.log(`📈 Calculating ROI for campaign ${campaignId}`);

    // Get campaign details
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get all metrics for the campaign
    const metrics = await prisma.campaignMetric.findMany({
      where: { campaignId },
    });

    if (metrics.length === 0) {
      return {
        totalSpend: 0,
        totalConversions: 0,
        totalImpressions: 0,
        totalClicks: 0,
        averageCTR: 0,
        averageCPC: 0,
        averageCPA: 0,
        roi: 0,
      };
    }

    // Aggregate metrics
    const totalSpend = metrics.reduce((sum, m) => sum + m.spend, 0);
    const totalConversions = metrics.reduce((sum, m) => sum + m.conversions, 0);
    const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
    const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);

    // Calculate averages
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const averageCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const averageCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;

    // ROI calculation would require revenue data
    // For now, we'll calculate based on conversions vs budget
    const roi = campaign.budget > 0
      ? ((totalConversions - totalSpend) / campaign.budget) * 100
      : 0;

    console.log(`✅ ROI calculated successfully`);

    return {
      totalSpend,
      totalConversions,
      totalImpressions,
      totalClicks,
      averageCTR,
      averageCPC,
      averageCPA,
      roi,
    };
  } catch (error) {
    console.error('❌ Failed to calculate ROI:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to calculate ROI');
  }
};

/**
 * Update campaign status
 * @param campaignId - Campaign ID
 * @param status - New status
 * @returns Updated campaign
 */
export const updateCampaignStatus = async (
  campaignId: string,
  status: 'draft' | 'active' | 'paused' | 'completed'
): Promise<Campaign> => {
  try {
    console.log(`🔄 Updating campaign ${campaignId} status to ${status}`);

    // Verify campaign exists
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!existingCampaign) {
      throw new Error('Campaign not found');
    }

    // Update status
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Campaign status updated successfully`);

    return campaign;
  } catch (error) {
    console.error('❌ Failed to update campaign status:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update campaign status');
  }
};

export default {
  createCampaign,
  getCampaign,
  listCampaigns,
  updateCampaign,
  deleteCampaign,
  addMetrics,
  getMetrics,
  calculateROI,
  updateCampaignStatus,
};
