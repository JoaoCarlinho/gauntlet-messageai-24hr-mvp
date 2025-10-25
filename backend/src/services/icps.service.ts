import prisma from '../config/database';
import { ICP } from '@prisma/client';
import { vectorizeAndStore, searchByText, deleteVector, getTeamNamespace } from './vectorDb.service';
import { VectorMetadata } from './vectorDb.service';

/**
 * ICP Service
 * Business logic for Ideal Customer Profile management with vector embeddings
 */

export interface CreateICPData {
  name: string;
  demographics?: any;
  firmographics?: any;
  psychographics?: any;
  behaviors?: any;
}

export interface UpdateICPData {
  name?: string;
  demographics?: any;
  firmographics?: any;
  psychographics?: any;
  behaviors?: any;
}

/**
 * Build vectorization text from ICP data
 */
const buildICPVectorText = (data: CreateICPData | UpdateICPData, name?: string): string => {
  const parts: string[] = [];

  // Use provided name or data.name
  const icpName = name || data.name;
  if (icpName) {
    parts.push(`ICP: ${icpName}`);
  }

  // Demographics (age, location, job titles, etc.)
  if (data.demographics) {
    const demo = data.demographics;
    const demoText: string[] = [];

    if (demo.jobTitles && Array.isArray(demo.jobTitles)) {
      demoText.push(`Job Titles: ${demo.jobTitles.join(', ')}`);
    }
    if (demo.ageRange) {
      demoText.push(`Age Range: ${demo.ageRange}`);
    }
    if (demo.location) {
      demoText.push(`Location: ${demo.location}`);
    }
    if (demo.education) {
      demoText.push(`Education: ${demo.education}`);
    }

    if (demoText.length > 0) {
      parts.push(`Demographics: ${demoText.join('; ')}`);
    }
  }

  // Firmographics (company size, industry, revenue, etc.)
  if (data.firmographics) {
    const firm = data.firmographics;
    const firmText: string[] = [];

    if (firm.industry) {
      firmText.push(`Industry: ${firm.industry}`);
    }
    if (firm.companySize) {
      firmText.push(`Company Size: ${firm.companySize}`);
    }
    if (firm.revenue) {
      firmText.push(`Revenue: ${firm.revenue}`);
    }
    if (firm.geography) {
      firmText.push(`Geography: ${firm.geography}`);
    }

    if (firmText.length > 0) {
      parts.push(`Firmographics: ${firmText.join('; ')}`);
    }
  }

  // Psychographics (pain points, goals, motivations, etc.)
  if (data.psychographics) {
    const psycho = data.psychographics;

    if (psycho.painPoints && Array.isArray(psycho.painPoints)) {
      parts.push(`Pain Points: ${psycho.painPoints.join(', ')}`);
    }
    if (psycho.goals && Array.isArray(psycho.goals)) {
      parts.push(`Goals: ${psycho.goals.join(', ')}`);
    }
    if (psycho.motivations && Array.isArray(psycho.motivations)) {
      parts.push(`Motivations: ${psycho.motivations.join(', ')}`);
    }
    if (psycho.challenges && Array.isArray(psycho.challenges)) {
      parts.push(`Challenges: ${psycho.challenges.join(', ')}`);
    }
  }

  // Behaviors (buying triggers, decision process, etc.)
  if (data.behaviors) {
    const behav = data.behaviors;

    if (behav.buyingTriggers && Array.isArray(behav.buyingTriggers)) {
      parts.push(`Buying Triggers: ${behav.buyingTriggers.join(', ')}`);
    }
    if (behav.decisionProcess) {
      parts.push(`Decision Process: ${behav.decisionProcess}`);
    }
    if (behav.preferredChannels && Array.isArray(behav.preferredChannels)) {
      parts.push(`Preferred Channels: ${behav.preferredChannels.join(', ')}`);
    }
  }

  return parts.join('\n');
};

/**
 * Create a new ICP and vectorize its attributes
 * @param productId - Product ID
 * @param teamId - Team ID
 * @param data - ICP data
 * @returns Created ICP
 */
export const createICP = async (
  productId: string,
  teamId: string,
  data: CreateICPData
): Promise<ICP> => {
  try {
    console.log(`👤 Creating ICP for product ${productId}: ${data.name}`);

    // Verify product belongs to team
    const product = await prisma.product.findFirst({
      where: { id: productId, teamId },
    });

    if (!product) {
      throw new Error('Product not found or access denied');
    }

    // Create ICP in database
    const icp = await prisma.iCP.create({
      data: {
        productId,
        name: data.name,
        demographics: data.demographics || {},
        firmographics: data.firmographics || {},
        psychographics: data.psychographics || {},
        behaviors: data.behaviors || {},
      },
    });

    // Vectorize ICP information
    try {
      const vectorText = buildICPVectorText(data);
      const namespace = getTeamNamespace(teamId, 'ICPS');

      const vectorMetadata: VectorMetadata = {
        teamId,
        type: 'icp',
        icpId: icp.id,
        productId: productId,
        name: icp.name,
        text: vectorText,
        createdAt: new Date().toISOString(),
      };

      await vectorizeAndStore(vectorText, namespace, icp.id, vectorMetadata);

      console.log(`✅ ICP vectorized and stored`);
    } catch (vectorError) {
      console.error('⚠️  Failed to vectorize ICP:', vectorError);
      // Don't fail ICP creation if vectorization fails
    }

    console.log(`✅ ICP created successfully: ${icp.id}`);

    return icp;
  } catch (error) {
    console.error('❌ Failed to create ICP:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create ICP');
  }
};

/**
 * Get ICP by ID
 * @param icpId - ICP ID
 * @param teamId - Team ID for access control
 * @returns ICP or null
 */
export const getICP = async (
  icpId: string,
  teamId: string
): Promise<ICP | null> => {
  try {
    const icp = await prisma.iCP.findFirst({
      where: {
        id: icpId,
        product: {
          teamId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
            platforms: true,
          },
        },
      },
    });

    return icp;
  } catch (error) {
    console.error('❌ Failed to get ICP:', error);
    throw new Error('Failed to get ICP');
  }
};

/**
 * List all ICPs for a product
 * @param productId - Product ID
 * @param teamId - Team ID for access control
 * @returns Array of ICPs
 */
export const listICPs = async (
  productId: string,
  teamId: string
): Promise<ICP[]> => {
  try {
    // Verify product belongs to team
    const product = await prisma.product.findFirst({
      where: { id: productId, teamId },
    });

    if (!product) {
      throw new Error('Product not found or access denied');
    }

    const icps = await prisma.iCP.findMany({
      where: { productId },
      include: {
        _count: {
          select: {
            campaigns: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return icps;
  } catch (error) {
    console.error('❌ Failed to list ICPs:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to list ICPs');
  }
};

/**
 * Update ICP and re-vectorize
 * @param icpId - ICP ID
 * @param teamId - Team ID for access control
 * @param data - Updated ICP data
 * @returns Updated ICP
 */
export const updateICP = async (
  icpId: string,
  teamId: string,
  data: UpdateICPData
): Promise<ICP> => {
  try {
    // Verify ICP belongs to team
    const existingICP = await prisma.iCP.findFirst({
      where: {
        id: icpId,
        product: {
          teamId,
        },
      },
    });

    if (!existingICP) {
      throw new Error('ICP not found or access denied');
    }

    console.log(`📝 Updating ICP ${icpId}`);

    // Update ICP in database
    const icp = await prisma.iCP.update({
      where: { id: icpId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Re-vectorize if relevant fields changed
    const shouldRevectorize =
      data.name ||
      data.demographics ||
      data.firmographics ||
      data.psychographics ||
      data.behaviors;

    if (shouldRevectorize) {
      try {
        // Build updated vector text with all current data
        const vectorData = {
          demographics: icp.demographics,
          firmographics: icp.firmographics,
          psychographics: icp.psychographics,
          behaviors: icp.behaviors,
        };

        const vectorText = buildICPVectorText(vectorData, icp.name);
        const namespace = getTeamNamespace(teamId, 'ICPS');

        const vectorMetadata: VectorMetadata = {
          teamId,
          type: 'icp',
          icpId: icp.id,
          productId: existingICP.productId,
          name: icp.name,
          text: vectorText,
          updatedAt: new Date().toISOString(),
        };

        await vectorizeAndStore(vectorText, namespace, icp.id, vectorMetadata);

        console.log(`✅ ICP re-vectorized`);
      } catch (vectorError) {
        console.error('⚠️  Failed to re-vectorize ICP:', vectorError);
        // Don't fail update if vectorization fails
      }
    }

    console.log(`✅ ICP updated successfully`);

    return icp;
  } catch (error) {
    console.error('❌ Failed to update ICP:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update ICP');
  }
};

/**
 * Delete ICP and its vectors
 * @param icpId - ICP ID
 * @param teamId - Team ID for access control
 */
export const deleteICP = async (
  icpId: string,
  teamId: string
): Promise<void> => {
  try {
    // Verify ICP belongs to team
    const icp = await prisma.iCP.findFirst({
      where: {
        id: icpId,
        product: {
          teamId,
        },
      },
    });

    if (!icp) {
      throw new Error('ICP not found or access denied');
    }

    console.log(`🗑️  Deleting ICP ${icpId}`);

    // Delete ICP from database (cascade will delete related campaigns)
    await prisma.iCP.delete({
      where: { id: icpId },
    });

    // Delete vector from Pinecone
    try {
      const namespace = getTeamNamespace(teamId, 'ICPS');
      await deleteVector(namespace, icpId);
      console.log(`✅ ICP vector deleted`);
    } catch (vectorError) {
      console.error('⚠️  Failed to delete ICP vector:', vectorError);
      // Don't fail deletion if vector deletion fails
    }

    console.log(`✅ ICP deleted successfully`);
  } catch (error) {
    console.error('❌ Failed to delete ICP:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete ICP');
  }
};

/**
 * Semantic search across ICPs
 * @param teamId - Team ID
 * @param query - Search query text
 * @param topK - Number of results to return
 * @returns Array of matching ICPs with scores
 */
export const searchICPs = async (
  teamId: string,
  query: string,
  topK: number = 5
): Promise<Array<{ icp: ICP; score: number }>> => {
  try {
    console.log(`🔍 Searching ICPs for team ${teamId}: "${query}"`);

    // Perform semantic search in vector database
    const namespace = getTeamNamespace(teamId, 'ICPS');
    const results = await searchByText(query, namespace, topK, { teamId });

    // Fetch full ICP details for matching results
    const icpResults = await Promise.all(
      results.map(async (result) => {
        const icpId = result.id;
        const icp = await prisma.iCP.findUnique({
          where: { id: icpId },
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                campaigns: true,
              },
            },
          },
        });

        return {
          icp: icp!,
          score: result.score,
        };
      })
    );

    // Filter out any null results (deleted ICPs)
    const validResults = icpResults.filter((r) => r.icp !== null);

    console.log(`✅ Found ${validResults.length} matching ICPs`);

    return validResults;
  } catch (error) {
    console.error('❌ Failed to search ICPs:', error);
    throw new Error('Failed to search ICPs');
  }
};

export default {
  createICP,
  getICP,
  listICPs,
  updateICP,
  deleteICP,
  searchICPs,
};
