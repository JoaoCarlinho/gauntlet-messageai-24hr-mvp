import prisma from '../config/database';
import { Prospect, Prisma } from '@prisma/client';

/**
 * Prospect Service
 * Business logic for prospect management with team-based access control
 */

export interface ProspectCreateInput {
  campaignId: string;
  platform: 'linkedin' | 'facebook' | 'twitter' | 'csv';
  platformProfileId: string;
  profileUrl: string;
  name?: string;
  headline?: string;
  location?: string;
  companyName?: string;
  companyUrl?: string;
  contactInfo?: any;
  profileData: any;
}

export interface ProspectUpdateInput {
  name?: string;
  headline?: string;
  location?: string;
  companyName?: string;
  companyUrl?: string;
  contactInfo?: any;
  profileData?: any;
  enrichmentData?: any;
  icpMatchScore?: number;
  qualityScore?: number;
  status?: 'new' | 'enriched' | 'qualified' | 'converted' | 'rejected';
  enrichedAt?: Date;
}

export interface ProspectFilters {
  status?: string;
  minScore?: number;
  maxScore?: number;
  platform?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create a new prospect
 * @param data - Prospect creation data
 * @param teamId - Team ID for access control
 * @returns Created prospect
 */
export const createProspect = async (
  data: ProspectCreateInput,
  teamId: string
): Promise<Prospect> => {
  try {
    console.log(`🎯 Creating prospect for campaign ${data.campaignId}`);

    // Verify campaign belongs to team
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id: data.campaignId, teamId },
    });

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Check for duplicate prospect on same platform
    const existingProspect = await prisma.prospect.findUnique({
      where: {
        platform_platformProfileId: {
          platform: data.platform,
          platformProfileId: data.platformProfileId,
        },
      },
    });

    if (existingProspect) {
      throw new Error(`Prospect already exists on ${data.platform} with ID ${data.platformProfileId}`);
    }

    // Create prospect in database
    const prospect = await prisma.prospect.create({
      data: {
        campaignId: data.campaignId,
        platform: data.platform,
        platformProfileId: data.platformProfileId,
        profileUrl: data.profileUrl,
        name: data.name || null,
        headline: data.headline || null,
        location: data.location || null,
        companyName: data.companyName || null,
        companyUrl: data.companyUrl || null,
        contactInfo: data.contactInfo || null,
        profileData: data.profileData,
        status: 'new',
      },
    });

    // Update campaign's discovered count
    await prisma.prospectingCampaign.update({
      where: { id: data.campaignId },
      data: {
        discoveredCount: { increment: 1 }
      },
    });

    console.log(`✅ Prospect created successfully: ${prospect.id}`);
    return prospect;
  } catch (error) {
    console.error('❌ Failed to create prospect:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create prospect');
  }
};

/**
 * Get a single prospect by ID
 * @param id - Prospect ID
 * @param teamId - Team ID for access control
 * @returns Prospect or null if not found/unauthorized
 */
export const getProspect = async (
  id: string,
  teamId: string
): Promise<Prospect | null> => {
  try {
    const prospect = await prisma.prospect.findFirst({
      where: {
        id,
        campaign: { teamId },
      },
    });

    return prospect;
  } catch (error) {
    console.error('❌ Failed to get prospect:', error);
    throw new Error('Failed to get prospect');
  }
};

/**
 * List prospects for a campaign with optional filters
 * @param campaignId - Campaign ID
 * @param teamId - Team ID for access control
 * @param filters - Optional filtering criteria
 * @returns Array of prospects
 */
export const listProspects = async (
  campaignId: string,
  teamId: string,
  filters?: ProspectFilters
): Promise<Prospect[]> => {
  try {
    // Verify campaign belongs to team
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id: campaignId, teamId },
    });

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Build where clause
    const where: Prisma.ProspectWhereInput = { campaignId };

    // Apply filters
    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.platform) {
      where.platform = filters.platform;
    }

    if (filters?.minScore !== undefined || filters?.maxScore !== undefined) {
      where.icpMatchScore = {};
      if (filters.minScore !== undefined) {
        where.icpMatchScore.gte = filters.minScore;
      }
      if (filters.maxScore !== undefined) {
        where.icpMatchScore.lte = filters.maxScore;
      }
    }

    // Execute query
    const prospects = await prisma.prospect.findMany({
      where,
      orderBy: { discoveredAt: 'desc' },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });

    return prospects;
  } catch (error) {
    console.error('❌ Failed to list prospects:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to list prospects');
  }
};

/**
 * Update a prospect
 * @param id - Prospect ID
 * @param data - Update data
 * @param teamId - Team ID for access control
 * @returns Updated prospect
 */
export const updateProspect = async (
  id: string,
  data: ProspectUpdateInput,
  teamId: string
): Promise<Prospect> => {
  try {
    // Verify prospect belongs to team via campaign
    const existingProspect = await prisma.prospect.findFirst({
      where: {
        id,
        campaign: { teamId },
      },
      include: { campaign: true },
    });

    if (!existingProspect) {
      throw new Error('Prospect not found or access denied');
    }

    // Update prospect
    const prospect = await prisma.prospect.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.headline !== undefined && { headline: data.headline }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.companyUrl !== undefined && { companyUrl: data.companyUrl }),
        ...(data.contactInfo !== undefined && { contactInfo: data.contactInfo }),
        ...(data.profileData !== undefined && { profileData: data.profileData }),
        ...(data.enrichmentData !== undefined && { enrichmentData: data.enrichmentData }),
        ...(data.icpMatchScore !== undefined && { icpMatchScore: data.icpMatchScore }),
        ...(data.qualityScore !== undefined && { qualityScore: data.qualityScore }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.enrichedAt !== undefined && { enrichedAt: data.enrichedAt }),
      },
    });

    // Update campaign counters if status changed
    if (data.status && data.status !== existingProspect.status) {
      const updates: Prisma.ProspectingCampaignUpdateInput = {};

      // Handle status transitions for counter updates
      if (data.status === 'qualified' && existingProspect.status !== 'qualified') {
        updates.qualifiedCount = { increment: 1 };
      } else if (existingProspect.status === 'qualified' && data.status !== 'qualified') {
        updates.qualifiedCount = { decrement: 1 };
      }

      if (data.status === 'converted' && existingProspect.status !== 'converted') {
        updates.convertedCount = { increment: 1 };
      } else if (existingProspect.status === 'converted' && data.status !== 'converted') {
        updates.convertedCount = { decrement: 1 };
      }

      if (Object.keys(updates).length > 0) {
        await prisma.prospectingCampaign.update({
          where: { id: existingProspect.campaignId },
          data: updates,
        });
      }
    }

    console.log(`✅ Prospect updated successfully: ${prospect.id}`);
    return prospect;
  } catch (error) {
    console.error('❌ Failed to update prospect:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update prospect');
  }
};

/**
 * Delete a prospect
 * @param id - Prospect ID
 * @param teamId - Team ID for access control
 */
export const deleteProspect = async (
  id: string,
  teamId: string
): Promise<void> => {
  try {
    // Verify prospect belongs to team via campaign
    const prospect = await prisma.prospect.findFirst({
      where: {
        id,
        campaign: { teamId },
      },
    });

    if (!prospect) {
      throw new Error('Prospect not found or access denied');
    }

    // Delete prospect
    await prisma.prospect.delete({
      where: { id },
    });

    // Update campaign's discovered count
    await prisma.prospectingCampaign.update({
      where: { id: prospect.campaignId },
      data: {
        discoveredCount: { decrement: 1 },
        ...(prospect.status === 'qualified' && { qualifiedCount: { decrement: 1 } }),
        ...(prospect.status === 'converted' && { convertedCount: { decrement: 1 } }),
      },
    });

    console.log(`✅ Prospect deleted successfully: ${id}`);
  } catch (error) {
    console.error('❌ Failed to delete prospect:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete prospect');
  }
};

/**
 * Batch create prospects (for CSV uploads)
 * @param prospects - Array of prospect data
 * @param campaignId - Campaign ID
 * @param teamId - Team ID for access control
 * @returns Created prospects count
 */
export const batchCreateProspects = async (
  prospects: ProspectCreateInput[],
  campaignId: string,
  teamId: string
): Promise<{ created: number; skipped: number; errors: string[] }> => {
  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Verify campaign belongs to team
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id: campaignId, teamId },
    });

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Process prospects in batches
    for (const prospectData of prospects) {
      try {
        // Check for duplicate
        const exists = await prisma.prospect.findUnique({
          where: {
            platform_platformProfileId: {
              platform: prospectData.platform,
              platformProfileId: prospectData.platformProfileId,
            },
          },
        });

        if (exists) {
          results.skipped++;
          continue;
        }

        // Create prospect
        await prisma.prospect.create({
          data: {
            campaignId,
            platform: prospectData.platform,
            platformProfileId: prospectData.platformProfileId,
            profileUrl: prospectData.profileUrl,
            name: prospectData.name || null,
            headline: prospectData.headline || null,
            location: prospectData.location || null,
            companyName: prospectData.companyName || null,
            companyUrl: prospectData.companyUrl || null,
            contactInfo: prospectData.contactInfo || null,
            profileData: prospectData.profileData,
            status: 'new',
          },
        });

        results.created++;
      } catch (error) {
        results.errors.push(
          `Failed to create prospect ${prospectData.platformProfileId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    // Update campaign's discovered count
    if (results.created > 0) {
      await prisma.prospectingCampaign.update({
        where: { id: campaignId },
        data: {
          discoveredCount: { increment: results.created }
        },
      });
    }

    console.log(`✅ Batch created ${results.created} prospects, skipped ${results.skipped}`);
    return results;
  } catch (error) {
    console.error('❌ Failed to batch create prospects:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to batch create prospects');
  }
};