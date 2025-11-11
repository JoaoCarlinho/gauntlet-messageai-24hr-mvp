import prisma from '../config/database';
import { ProspectingCampaign, Prisma } from '@prisma/client';

/**
 * ProspectingCampaign Service
 * Business logic for managing prospecting campaign lifecycle
 */

export type CampaignStatus = 'running' | 'paused' | 'completed' | 'failed';

export interface CampaignCreateInput {
  icpId: string;
  name: string;
  platforms: ('linkedin' | 'facebook' | 'twitter' | 'csv')[];
  searchCriteria?: any;
}

export interface CampaignFilters {
  status?: CampaignStatus;
  icpId?: string;
  limit?: number;
  offset?: number;
}

export interface CampaignCounts {
  discovered?: number;
  qualified?: number;
  converted?: number;
}

export interface CampaignWithRelations extends ProspectingCampaign {
  team?: any;
  icp?: any;
  prospects?: any[];
  _count?: {
    prospects: number;
  };
}

/**
 * Create a new prospecting campaign
 * @param data - Campaign creation data
 * @param teamId - Team ID for access control
 * @returns Created campaign
 */
export const createCampaign = async (
  data: CampaignCreateInput,
  teamId: string
): Promise<ProspectingCampaign> => {
  try {
    console.log(`🎯 Creating prospecting campaign: ${data.name}`);

    // Verify ICP exists and belongs to team (via product)
    const icp = await prisma.iCP.findFirst({
      where: {
        id: data.icpId,
        product: {
          teamId
        }
      }
    });

    if (!icp) {
      throw new Error('ICP not found or access denied');
    }

    // Create campaign
    const campaign = await prisma.prospectingCampaign.create({
      data: {
        teamId,
        icpId: data.icpId,
        name: data.name,
        platforms: data.platforms,
        searchCriteria: data.searchCriteria || {},
        status: 'running',
        discoveredCount: 0,
        qualifiedCount: 0,
        convertedCount: 0,
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
 * Get a campaign by ID
 * @param id - Campaign ID
 * @param teamId - Team ID for access control
 * @returns Campaign with relations or null
 */
export const getCampaign = async (
  id: string,
  teamId: string
): Promise<CampaignWithRelations | null> => {
  try {
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: {
        id,
        teamId,
      },
      include: {
        team: true,
        icp: true,
        _count: {
          select: { prospects: true }
        }
      },
    });

    return campaign;
  } catch (error) {
    console.error('❌ Failed to get campaign:', error);
    throw new Error('Failed to get campaign');
  }
};

/**
 * List campaigns for a team with optional filters
 * @param teamId - Team ID
 * @param filters - Optional filtering criteria
 * @returns Array of campaigns
 */
export const listCampaigns = async (
  teamId: string,
  filters?: CampaignFilters
): Promise<ProspectingCampaign[]> => {
  try {
    // Build where clause
    const where: Prisma.ProspectingCampaignWhereInput = { teamId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.icpId) {
      where.icpId = filters.icpId;
    }

    // Execute query
    const campaigns = await prisma.prospectingCampaign.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
      include: {
        _count: {
          select: { prospects: true }
        }
      }
    });

    return campaigns;
  } catch (error) {
    console.error('❌ Failed to list campaigns:', error);
    throw new Error('Failed to list campaigns');
  }
};

/**
 * Update campaign status
 * @param id - Campaign ID
 * @param status - New status
 * @param teamId - Team ID for access control
 */
export const updateCampaignStatus = async (
  id: string,
  status: CampaignStatus,
  teamId: string
): Promise<void> => {
  try {
    // Verify campaign belongs to team
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id, teamId },
    });

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Validate status transitions
    if (campaign.status === 'completed' || campaign.status === 'failed') {
      throw new Error(`Cannot change status from ${campaign.status}`);
    }

    // Update status
    const updateData: Prisma.ProspectingCampaignUpdateInput = { status };

    // Set completedAt if marking as completed or failed
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    await prisma.prospectingCampaign.update({
      where: { id },
      data: updateData,
    });

    console.log(`✅ Campaign ${id} status updated to ${status}`);
  } catch (error) {
    console.error('❌ Failed to update campaign status:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update campaign status');
  }
};

/**
 * Update campaign counts (discovered, qualified, converted)
 * @param id - Campaign ID
 * @param counts - Counts to increment
 * @param teamId - Team ID for access control
 */
export const updateCampaignCounts = async (
  id: string,
  counts: CampaignCounts,
  teamId: string
): Promise<void> => {
  try {
    // Verify campaign belongs to team
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id, teamId },
    });

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Build update data with increments
    const updateData: Prisma.ProspectingCampaignUpdateInput = {};

    if (counts.discovered !== undefined) {
      updateData.discoveredCount = { increment: counts.discovered };
    }

    if (counts.qualified !== undefined) {
      updateData.qualifiedCount = { increment: counts.qualified };
    }

    if (counts.converted !== undefined) {
      updateData.convertedCount = { increment: counts.converted };
    }

    // Update counts
    await prisma.prospectingCampaign.update({
      where: { id },
      data: updateData,
    });

    console.log(`✅ Campaign ${id} counts updated`);
  } catch (error) {
    console.error('❌ Failed to update campaign counts:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update campaign counts');
  }
};

/**
 * Pause a running campaign
 * @param id - Campaign ID
 * @param teamId - Team ID for access control
 */
export const pauseCampaign = async (
  id: string,
  teamId: string
): Promise<void> => {
  try {
    // Verify campaign belongs to team and is running
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id, teamId },
    });

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    if (campaign.status !== 'running') {
      throw new Error(`Cannot pause campaign with status ${campaign.status}`);
    }

    // Update status to paused
    await prisma.prospectingCampaign.update({
      where: { id },
      data: { status: 'paused' },
    });

    console.log(`✅ Campaign ${id} paused`);
  } catch (error) {
    console.error('❌ Failed to pause campaign:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to pause campaign');
  }
};

/**
 * Resume a paused campaign
 * @param id - Campaign ID
 * @param teamId - Team ID for access control
 */
export const resumeCampaign = async (
  id: string,
  teamId: string
): Promise<void> => {
  try {
    // Verify campaign belongs to team and is paused
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id, teamId },
    });

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    if (campaign.status !== 'paused') {
      throw new Error(`Cannot resume campaign with status ${campaign.status}`);
    }

    // Update status to running
    await prisma.prospectingCampaign.update({
      where: { id },
      data: { status: 'running' },
    });

    console.log(`✅ Campaign ${id} resumed`);
  } catch (error) {
    console.error('❌ Failed to resume campaign:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to resume campaign');
  }
};

/**
 * Complete a campaign
 * @param id - Campaign ID
 * @param teamId - Team ID for access control
 */
export const completeCampaign = async (
  id: string,
  teamId: string
): Promise<void> => {
  try {
    await updateCampaignStatus(id, 'completed', teamId);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to complete campaign');
  }
};

/**
 * Get campaign statistics
 * @param id - Campaign ID
 * @param teamId - Team ID for access control
 * @returns Campaign statistics
 */
export const getCampaignStats = async (
  id: string,
  teamId: string
): Promise<{
  campaign: ProspectingCampaign;
  conversionRate: number;
  qualificationRate: number;
  prospectsCount: number;
}> => {
  try {
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id, teamId },
      include: {
        _count: {
          select: { prospects: true }
        }
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    const conversionRate = campaign.discoveredCount > 0
      ? (campaign.convertedCount / campaign.discoveredCount) * 100
      : 0;

    const qualificationRate = campaign.discoveredCount > 0
      ? (campaign.qualifiedCount / campaign.discoveredCount) * 100
      : 0;

    return {
      campaign,
      conversionRate: Math.round(conversionRate * 100) / 100,
      qualificationRate: Math.round(qualificationRate * 100) / 100,
      prospectsCount: (campaign as any)._count?.prospects || 0,
    };
  } catch (error) {
    console.error('❌ Failed to get campaign stats:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get campaign stats');
  }
};

/**
 * Delete a campaign (and all related prospects)
 * @param id - Campaign ID
 * @param teamId - Team ID for access control
 */
export const deleteCampaign = async (
  id: string,
  teamId: string
): Promise<void> => {
  try {
    // Verify campaign belongs to team
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id, teamId },
    });

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Delete campaign (cascades to prospects due to onDelete: Cascade)
    await prisma.prospectingCampaign.delete({
      where: { id },
    });

    console.log(`✅ Campaign ${id} deleted`);
  } catch (error) {
    console.error('❌ Failed to delete campaign:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete campaign');
  }
};