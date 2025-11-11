import prisma from '../config/database';
import { scoreProspect, batchScoreProspects } from './prospectScoring.service';
import { listProspects } from './prospects.service';
import { generateBatchEmbeddings } from './embedding.service';
import { fetchVector } from './vectorDb.service';

/**
 * Batch Scoring Service
 * Efficiently scores multiple prospects in batch
 */

export interface BatchScoringResult {
  processed: number;
  qualified: number;
  avgScore: number;
  breakdown: {
    hot: number;
    qualified: number;
    warm: number;
    discard: number;
  };
  errors?: string[];
}

/**
 * Score all prospects in a campaign
 * @param campaignId - Campaign ID
 * @param teamId - Team ID for access control
 * @param maxCount - Maximum number of prospects to process (default 100)
 * @returns Batch scoring summary
 */
export const scoreBatch = async (
  campaignId: string,
  teamId: string,
  maxCount: number = 100
): Promise<BatchScoringResult> => {
  try {
    console.log(`🎯 Batch scoring prospects for campaign ${campaignId}`);

    // Validate campaign belongs to team
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id: campaignId, teamId },
      include: { icp: true }
    });

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    if (!campaign.icp) {
      throw new Error('Campaign has no ICP defined');
    }

    // Query prospects to score (status="new")
    const prospects = await listProspects(campaignId, teamId, {
      status: 'new',
      limit: maxCount
    });

    if (prospects.length === 0) {
      console.log('No prospects to score');
      return {
        processed: 0,
        qualified: 0,
        avgScore: 0,
        breakdown: { hot: 0, qualified: 0, warm: 0, discard: 0 },
        errors: []
      };
    }

    console.log(`📊 Scoring ${prospects.length} prospects`);

    // Use optimized batch scoring if possible
    const startTime = Date.now();
    const result = await scoreBatchOptimized(prospects, campaign, teamId);
    const duration = Date.now() - startTime;

    console.log(`✅ Batch scoring completed in ${duration}ms`);

    // Update campaign counters
    if (result.qualified > 0) {
      await prisma.prospectingCampaign.update({
        where: { id: campaignId },
        data: {
          qualifiedCount: { increment: result.qualified }
        }
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Failed to score batch:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to score batch');
  }
};

/**
 * Optimized batch scoring using batch embeddings
 */
const scoreBatchOptimized = async (
  prospects: any[],
  campaign: any,
  teamId: string
): Promise<BatchScoringResult> => {
  try {
    // Build prospect texts for all prospects
    const prospectTexts = prospects.map(prospect => buildProspectText(prospect));

    // Generate embeddings in batch (single API call)
    console.log('🔄 Generating batch embeddings...');
    const prospectVectors = await generateBatchEmbeddings(prospectTexts);

    // Query ICP vector once
    console.log('📥 Fetching ICP vector...');
    const namespace = `team_${teamId}_icps`;
    const icpVectorRecord = await fetchVector(namespace, campaign.icp.id);

    if (!icpVectorRecord || !icpVectorRecord.values) {
      throw new Error('ICP vector not found');
    }

    const icpVector = icpVectorRecord.values;

    // Calculate scores for all prospects
    console.log('📊 Calculating scores...');
    const scores = prospects.map((prospect, index) => {
      const prospectVector = prospectVectors[index];
      const vectorSimilarity = cosineSimilarity(prospectVector, icpVector);

      // Calculate weighted score components
      const demographicsScore = scoreDemographics(prospect, campaign.icp);
      const firmographicsScore = scoreFirmographics(prospect, campaign.icp);
      const psychographicsScore = vectorSimilarity;
      const activityScore = 0.5; // Placeholder

      const icpMatchScore =
        demographicsScore * 0.30 +
        firmographicsScore * 0.25 +
        psychographicsScore * 0.25 +
        activityScore * 0.20;

      const qualityScore = calculateQualityScore(prospect);
      const qualification = getQualificationTier(icpMatchScore);

      return {
        prospectId: prospect.id,
        icpMatchScore,
        qualityScore,
        qualification
      };
    });

    // Batch update all prospects in a single transaction
    console.log('💾 Updating prospect records...');
    await prisma.$transaction(
      scores.map(score =>
        prisma.prospect.update({
          where: { id: score.prospectId },
          data: {
            icpMatchScore: score.icpMatchScore,
            qualityScore: score.qualityScore
          }
        })
      )
    );

    // Calculate metrics
    const qualifiedCount = scores.filter(s => s.icpMatchScore >= 0.75).length;
    const avgScore = scores.reduce((sum, s) => sum + s.icpMatchScore, 0) / scores.length;

    const breakdown = {
      hot: scores.filter(s => s.qualification === 'hot').length,
      qualified: scores.filter(s => s.qualification === 'qualified').length,
      warm: scores.filter(s => s.qualification === 'warm').length,
      discard: scores.filter(s => s.qualification === 'discard').length
    };

    return {
      processed: scores.length,
      qualified: qualifiedCount,
      avgScore: Math.round(avgScore * 100) / 100,
      breakdown,
      errors: []
    };
  } catch (error) {
    console.error('❌ Batch scoring optimization failed, falling back to sequential:', error);
    // Fall back to sequential processing if batch fails
    return scoreBatchSequential(prospects, campaign, teamId);
  }
};

/**
 * Fallback sequential scoring with concurrency limit
 */
const scoreBatchSequential = async (
  prospects: any[],
  campaign: any,
  teamId: string
): Promise<BatchScoringResult> => {
  // Process prospects in smaller batches to avoid rate limits
  const batchSize = 10;
  const allResults: any[] = [];
  const errors: string[] = [];

  for (let i = 0; i < prospects.length; i += batchSize) {
    const batch = prospects.slice(i, i + batchSize);
    const batchPromises = batch.map(async (prospect) => {
      try {
        return await scoreProspect(prospect.id, teamId);
      } catch (error) {
        const errorMsg = `Failed to score ${prospect.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        errors.push(errorMsg);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    allResults.push(...batchResults.filter(r => r !== null));
  }

  // Calculate metrics
  const qualifiedCount = allResults.filter(r => r.icpMatchScore >= 0.75).length;
  const avgScore = allResults.reduce((sum, r) => sum + r.icpMatchScore, 0) / allResults.length;

  const breakdown = {
    hot: allResults.filter(r => r.qualification === 'hot').length,
    qualified: allResults.filter(r => r.qualification === 'qualified').length,
    warm: allResults.filter(r => r.qualification === 'warm').length,
    discard: allResults.filter(r => r.qualification === 'discard').length
  };

  return {
    processed: allResults.length,
    qualified: qualifiedCount,
    avgScore: Math.round(avgScore * 100) / 100,
    breakdown,
    errors
  };
};

/**
 * Helper functions (duplicated from prospectScoring.service for optimization)
 */
const buildProspectText = (prospect: any): string => {
  const profileData = prospect.profileData || {};
  const bio = profileData.bio || profileData.summary || prospect.headline || '';

  return `Job: ${prospect.headline || 'Unknown'} at ${prospect.companyName || 'Unknown'}
Location: ${prospect.location || 'Unknown'}
Bio: ${bio}`;
};

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) return 0;

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
};

const scoreDemographics = (prospect: any, icp: any): number => {
  const demographics = icp.demographics || {};
  if (!demographics.titles && !demographics.locations) return 0.5;

  let score = 0;
  let weight = 0;

  if (demographics.titles && demographics.titles.length > 0) {
    const prospectTitle = (prospect.headline || '').toLowerCase();
    const icpTitles = demographics.titles.map((t: string) => t.toLowerCase());

    const titleMatch = icpTitles.some((title: string) => {
      const keywords = title.split(' ').filter(k => k.length > 2);
      return keywords.some(keyword => prospectTitle.includes(keyword));
    });

    if (titleMatch) score += 0.6;
    weight += 0.6;
  }

  if (demographics.locations && demographics.locations.length > 0) {
    const prospectLocation = (prospect.location || '').toLowerCase();
    const icpLocations = demographics.locations.map((l: string) => l.toLowerCase());

    const locationMatch = icpLocations.some((loc: string) =>
      prospectLocation.includes(loc) || loc.includes(prospectLocation)
    );

    if (locationMatch) score += 0.4;
    weight += 0.4;
  }

  return weight > 0 ? Math.min(score / weight, 1.0) : 0.5;
};

const scoreFirmographics = (prospect: any, icp: any): number => {
  const firmographics = icp.firmographics || {};
  if (!firmographics.industries) return 0.5;

  const companyName = (prospect.companyName || '').toLowerCase();
  const profileData = prospect.profileData || {};
  const industry = (profileData.industry || '').toLowerCase();

  const icpIndustries = (firmographics.industries || []).map((i: string) => i.toLowerCase());

  const industryMatch = icpIndustries.some((ind: string) =>
    companyName.includes(ind) ||
    industry.includes(ind) ||
    ind.includes(industry)
  );

  return industryMatch ? 0.8 : 0.4;
};

const calculateQualityScore = (prospect: any): number => {
  let score = 0;

  if (prospect.name) score += 0.2;
  if (prospect.headline) score += 0.2;
  if (prospect.companyName) score += 0.2;
  if (prospect.location) score += 0.1;
  if (prospect.profileUrl) score += 0.1;

  const contactInfo = prospect.contactInfo || {};
  if (contactInfo.email) score += 0.2;

  return Math.min(score, 1.0);
};

const getQualificationTier = (score: number): string => {
  if (score >= 0.85) return 'hot';
  if (score >= 0.75) return 'qualified';
  if (score >= 0.65) return 'warm';
  return 'discard';
};

/**
 * Score prospects by IDs
 * @param prospectIds - Array of prospect IDs to score
 * @param teamId - Team ID for access control
 * @returns Batch scoring summary
 */
export const scoreProspectsByIds = async (
  prospectIds: string[],
  teamId: string
): Promise<BatchScoringResult> => {
  try {
    const results = await batchScoreProspects(prospectIds, teamId);

    const qualifiedCount = results.filter(r => r.icpMatchScore >= 0.75).length;
    const avgScore = results.reduce((sum, r) => sum + r.icpMatchScore, 0) / results.length;

    const breakdown = {
      hot: results.filter(r => r.qualification === 'hot').length,
      qualified: results.filter(r => r.qualification === 'qualified').length,
      warm: results.filter(r => r.qualification === 'warm').length,
      discard: results.filter(r => r.qualification === 'discard').length
    };

    return {
      processed: results.length,
      qualified: qualifiedCount,
      avgScore: Math.round(avgScore * 100) / 100,
      breakdown,
      errors: []
    };
  } catch (error) {
    console.error('❌ Failed to score prospects by IDs:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to score prospects');
  }
};

export default {
  scoreBatch,
  scoreProspectsByIds
};