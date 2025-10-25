import prisma from '../config/database';
import { AdCreative } from '@prisma/client';
import { vectorizeAndStore, searchByText, deleteVector, getTeamNamespace } from './vectorDb.service';
import { VectorMetadata } from './vectorDb.service';

/**
 * Ad Creative Service
 * Business logic for managing marketing content with vector storage for similarity search
 */

export interface CreateAdCreativeData {
  platform: string;
  type: string;
  headline: string;
  body: string;
  cta: string;
  mediaUrl?: string;
  metadata?: any;
}

export interface UpdateAdCreativeData {
  platform?: string;
  type?: string;
  headline?: string;
  body?: string;
  cta?: string;
  mediaUrl?: string;
  metadata?: any;
}

/**
 * Build vectorization text from ad creative data
 */
const buildCreativeVectorText = (data: CreateAdCreativeData | UpdateAdCreativeData): string => {
  const parts: string[] = [];

  if (data.headline) {
    parts.push(`Headline: ${data.headline}`);
  }

  if (data.body) {
    parts.push(`Body: ${data.body}`);
  }

  if (data.cta) {
    parts.push(`CTA: ${data.cta}`);
  }

  if (data.platform) {
    parts.push(`Platform: ${data.platform}`);
  }

  if (data.type) {
    parts.push(`Type: ${data.type}`);
  }

  return parts.join('\n');
};

/**
 * Create a new ad creative and vectorize its content
 * @param campaignId - Campaign ID
 * @param teamId - Team ID for access control
 * @param data - Ad creative data
 * @returns Created ad creative
 */
export const createAdCreative = async (
  campaignId: string,
  teamId: string,
  data: CreateAdCreativeData
): Promise<AdCreative> => {
  try {
    console.log(`🎨 Creating ad creative for campaign ${campaignId}`);

    // Verify campaign belongs to team
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, teamId },
    });

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Validate platform
    const validPlatforms = ['facebook', 'linkedin', 'tiktok', 'x'];
    if (!validPlatforms.includes(data.platform)) {
      throw new Error(`Invalid platform: ${data.platform}. Valid platforms are: ${validPlatforms.join(', ')}`);
    }

    // Validate type
    const validTypes = ['image', 'video', 'carousel', 'text'];
    if (!validTypes.includes(data.type)) {
      throw new Error(`Invalid type: ${data.type}. Valid types are: ${validTypes.join(', ')}`);
    }

    // Create ad creative
    const creative = await prisma.adCreative.create({
      data: {
        campaignId,
        platform: data.platform,
        type: data.type,
        headline: data.headline,
        body: data.body,
        cta: data.cta,
        mediaUrl: data.mediaUrl,
        metadata: data.metadata || {},
      },
    });

    // Vectorize creative copy for similarity search
    try {
      const vectorText = buildCreativeVectorText(data);
      const namespace = getTeamNamespace(teamId, 'CAMPAIGNS');

      const vectorMetadata: VectorMetadata = {
        teamId,
        type: 'ad_creative',
        campaignId: campaignId,
        creativeId: creative.id,
        platform: data.platform,
        text: vectorText,
        createdAt: new Date().toISOString(),
      };

      await vectorizeAndStore(vectorText, namespace, creative.id, vectorMetadata);

      console.log(`✅ Ad creative vectorized and stored`);
    } catch (vectorError) {
      console.error('⚠️  Failed to vectorize ad creative:', vectorError);
      // Don't fail creative creation if vectorization fails
    }

    console.log(`✅ Ad creative created successfully: ${creative.id}`);

    return creative;
  } catch (error) {
    console.error('❌ Failed to create ad creative:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create ad creative');
  }
};

/**
 * List ad creatives for a campaign, optionally filtered by platform
 * @param campaignId - Campaign ID
 * @param platform - Optional platform filter
 * @returns Array of ad creatives
 */
export const listAdCreatives = async (
  campaignId: string,
  platform?: string
): Promise<AdCreative[]> => {
  try {
    const where: any = { campaignId };

    if (platform) {
      const validPlatforms = ['facebook', 'linkedin', 'tiktok', 'x'];
      if (!validPlatforms.includes(platform)) {
        throw new Error(`Invalid platform: ${platform}. Valid platforms are: ${validPlatforms.join(', ')}`);
      }
      where.platform = platform;
    }

    const creatives = await prisma.adCreative.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return creatives;
  } catch (error) {
    console.error('❌ Failed to list ad creatives:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to list ad creatives');
  }
};

/**
 * Get ad creative by ID
 * @param creativeId - Creative ID
 * @param teamId - Team ID for access control
 * @returns Ad creative or null
 */
export const getAdCreative = async (
  creativeId: string,
  teamId: string
): Promise<AdCreative | null> => {
  try {
    const creative = await prisma.adCreative.findFirst({
      where: {
        id: creativeId,
        campaign: {
          teamId,
        },
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return creative;
  } catch (error) {
    console.error('❌ Failed to get ad creative:', error);
    throw new Error('Failed to get ad creative');
  }
};

/**
 * Update ad creative and re-vectorize
 * @param creativeId - Creative ID
 * @param teamId - Team ID for access control
 * @param data - Updated ad creative data
 * @returns Updated ad creative
 */
export const updateAdCreative = async (
  creativeId: string,
  teamId: string,
  data: UpdateAdCreativeData
): Promise<AdCreative> => {
  try {
    // Verify creative belongs to team
    const existingCreative = await prisma.adCreative.findFirst({
      where: {
        id: creativeId,
        campaign: {
          teamId,
        },
      },
    });

    if (!existingCreative) {
      throw new Error('Ad creative not found or access denied');
    }

    console.log(`📝 Updating ad creative ${creativeId}`);

    // Validate platform if provided
    if (data.platform) {
      const validPlatforms = ['facebook', 'linkedin', 'tiktok', 'x'];
      if (!validPlatforms.includes(data.platform)) {
        throw new Error(`Invalid platform: ${data.platform}. Valid platforms are: ${validPlatforms.join(', ')}`);
      }
    }

    // Validate type if provided
    if (data.type) {
      const validTypes = ['image', 'video', 'carousel', 'text'];
      if (!validTypes.includes(data.type)) {
        throw new Error(`Invalid type: ${data.type}. Valid types are: ${validTypes.join(', ')}`);
      }
    }

    // Update ad creative
    const creative = await prisma.adCreative.update({
      where: { id: creativeId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Re-vectorize if content changed
    const shouldRevectorize =
      data.headline ||
      data.body ||
      data.cta ||
      data.platform ||
      data.type;

    if (shouldRevectorize) {
      try {
        // Build updated vector text with all current data
        const vectorData = {
          headline: creative.headline,
          body: creative.body,
          cta: creative.cta,
          platform: creative.platform,
          type: creative.type,
        };

        const vectorText = buildCreativeVectorText(vectorData);
        const namespace = getTeamNamespace(teamId, 'CAMPAIGNS');

        const vectorMetadata: VectorMetadata = {
          teamId,
          type: 'ad_creative',
          campaignId: existingCreative.campaignId,
          creativeId: creative.id,
          platform: creative.platform,
          text: vectorText,
          updatedAt: new Date().toISOString(),
        };

        await vectorizeAndStore(vectorText, namespace, creative.id, vectorMetadata);

        console.log(`✅ Ad creative re-vectorized`);
      } catch (vectorError) {
        console.error('⚠️  Failed to re-vectorize ad creative:', vectorError);
        // Don't fail update if vectorization fails
      }
    }

    console.log(`✅ Ad creative updated successfully`);

    return creative;
  } catch (error) {
    console.error('❌ Failed to update ad creative:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update ad creative');
  }
};

/**
 * Delete ad creative and its vectors
 * @param creativeId - Creative ID
 * @param teamId - Team ID for access control
 */
export const deleteAdCreative = async (
  creativeId: string,
  teamId: string
): Promise<void> => {
  try {
    // Verify creative belongs to team
    const creative = await prisma.adCreative.findFirst({
      where: {
        id: creativeId,
        campaign: {
          teamId,
        },
      },
    });

    if (!creative) {
      throw new Error('Ad creative not found or access denied');
    }

    console.log(`🗑️  Deleting ad creative ${creativeId}`);

    // Delete ad creative from database
    await prisma.adCreative.delete({
      where: { id: creativeId },
    });

    // Delete vector from Pinecone
    try {
      const namespace = getTeamNamespace(teamId, 'CAMPAIGNS');
      await deleteVector(namespace, creativeId);
      console.log(`✅ Ad creative vector deleted`);
    } catch (vectorError) {
      console.error('⚠️  Failed to delete ad creative vector:', vectorError);
      // Don't fail deletion if vector deletion fails
    }

    console.log(`✅ Ad creative deleted successfully`);
  } catch (error) {
    console.error('❌ Failed to delete ad creative:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete ad creative');
  }
};

/**
 * Search ad creatives by similarity
 * @param teamId - Team ID
 * @param query - Search query text
 * @param topK - Number of results to return
 * @returns Array of matching ad creatives with scores
 */
export const searchAdCreatives = async (
  teamId: string,
  query: string,
  topK: number = 5
): Promise<Array<{ creative: AdCreative; score: number }>> => {
  try {
    console.log(`🔍 Searching ad creatives for team ${teamId}: "${query}"`);

    // Perform semantic search in vector database
    const namespace = getTeamNamespace(teamId, 'CAMPAIGNS');
    const results = await searchByText(query, namespace, topK, { teamId, type: 'ad_creative' });

    // Fetch full creative details for matching results
    const creativeResults = await Promise.all(
      results.map(async (result) => {
        const creativeId = result.id;
        const creative = await prisma.adCreative.findUnique({
          where: { id: creativeId },
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        });

        return {
          creative: creative!,
          score: result.score,
        };
      })
    );

    // Filter out any null results (deleted creatives)
    const validResults = creativeResults.filter((r) => r.creative !== null);

    console.log(`✅ Found ${validResults.length} matching ad creatives`);

    return validResults;
  } catch (error) {
    console.error('❌ Failed to search ad creatives:', error);
    throw new Error('Failed to search ad creatives');
  }
};

export default {
  createAdCreative,
  listAdCreatives,
  getAdCreative,
  updateAdCreative,
  deleteAdCreative,
  searchAdCreatives,
};
