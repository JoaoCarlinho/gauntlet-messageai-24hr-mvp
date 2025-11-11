import prisma from '../config/database';
import { Prospect } from '@prisma/client';
import { generateEmbedding } from './embedding.service';
import { fetchVector } from './vectorDb.service';
import { getProspect, updateProspect } from './prospects.service';

/**
 * Prospect Scoring Service
 * Calculates ICP match scores using vector similarity and weighted criteria
 */

export interface ScoringResult {
  prospectId: string;
  icpMatchScore: number;
  qualityScore: number;
  qualification: 'hot' | 'qualified' | 'warm' | 'discard';
  breakdown?: {
    demographics: number;
    firmographics: number;
    psychographics: number;
    activity: number;
  };
}

export interface ICPCriteria {
  demographics?: {
    titles?: string[];
    locations?: string[];
  };
  firmographics?: {
    industries?: string[];
    companySizes?: string[];
  };
}

/**
 * Score a prospect against ICP vectors
 * @param prospectId - Prospect ID to score
 * @param teamId - Team ID for access control
 * @returns Scoring result with qualification tier
 */
export const scoreProspect = async (
  prospectId: string,
  teamId: string
): Promise<ScoringResult> => {
  try {
    console.log(`🎯 Scoring prospect ${prospectId} for team ${teamId}`);

    // Load prospect with campaign and ICP
    const prospect = await getProspect(prospectId, teamId);
    if (!prospect) {
      throw new Error('Prospect not found');
    }

    // Get campaign with ICP
    const campaign = await prisma.prospectingCampaign.findFirst({
      where: { id: prospect.campaignId, teamId },
      include: { icp: true }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (!campaign.icp) {
      throw new Error('Campaign has no ICP defined');
    }

    // Build prospect vector text
    const prospectText = buildProspectText(prospect);

    // Generate embedding vector
    const prospectVector = await generateEmbedding(prospectText);

    // Query ICP vector from Pinecone
    const icpVector = await queryICPVector(campaign.icp.id, teamId);

    // Calculate cosine similarity
    const vectorSimilarity = cosineSimilarity(prospectVector, icpVector);

    // Calculate weighted scores
    const demographicsScore = scoreDemographics(
      prospect,
      campaign.icp.demographics as ICPCriteria['demographics']
    );
    const firmographicsScore = scoreFirmographics(
      prospect,
      campaign.icp.firmographics as ICPCriteria['firmographics']
    );
    const psychographicsScore = vectorSimilarity; // Semantic similarity
    const activityScore = 0.5; // Placeholder for future implementation

    // Calculate weighted ICP match score
    const icpMatchScore =
      demographicsScore * 0.30 +
      firmographicsScore * 0.25 +
      psychographicsScore * 0.25 +
      activityScore * 0.20;

    // Calculate quality score based on data completeness
    const qualityScore = calculateQualityScore(prospect);

    // Update prospect record
    await updateProspect(
      prospectId,
      {
        icpMatchScore,
        qualityScore
      },
      teamId
    );

    // Determine qualification tier
    const qualification = getQualificationTier(icpMatchScore);

    console.log(`✅ Prospect scored: ${icpMatchScore.toFixed(2)} (${qualification})`);

    return {
      prospectId,
      icpMatchScore,
      qualityScore,
      qualification,
      breakdown: {
        demographics: demographicsScore,
        firmographics: firmographicsScore,
        psychographics: psychographicsScore,
        activity: activityScore
      }
    };
  } catch (error) {
    console.error('❌ Failed to score prospect:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to score prospect');
  }
};

/**
 * Build prospect text for vectorization
 * @param prospect - Prospect data
 * @returns Formatted text for embedding
 */
const buildProspectText = (prospect: Prospect): string => {
  const profileData = prospect.profileData as any || {};
  const bio = profileData.bio || profileData.summary || prospect.headline || '';

  return `Job: ${prospect.headline || 'Unknown'} at ${prospect.companyName || 'Unknown'}
Location: ${prospect.location || 'Unknown'}
Bio: ${bio}`;
};

/**
 * Calculate cosine similarity between two vectors
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Similarity score between 0 and 1
 */
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same dimension');
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
};

/**
 * Score demographics match (title, location)
 * @param prospect - Prospect data
 * @param icpDemographics - ICP demographics criteria
 * @returns Score between 0 and 1
 */
const scoreDemographics = (
  prospect: Prospect,
  icpDemographics?: ICPCriteria['demographics']
): number => {
  if (!icpDemographics) {
    return 0.5; // Neutral score if no criteria
  }

  let score = 0;
  let weight = 0;

  // Title matching
  if (icpDemographics.titles && icpDemographics.titles.length > 0) {
    const prospectTitle = (prospect.headline || '').toLowerCase();
    const icpTitles = icpDemographics.titles.map(t => t.toLowerCase());

    // Check for exact or partial matches
    const titleMatch = icpTitles.some(title => {
      const keywords = title.split(' ').filter(k => k.length > 2);
      return keywords.some(keyword => prospectTitle.includes(keyword));
    });

    if (titleMatch) {
      score += 0.6;
    }
    weight += 0.6;
  }

  // Location matching
  if (icpDemographics.locations && icpDemographics.locations.length > 0) {
    const prospectLocation = (prospect.location || '').toLowerCase();
    const icpLocations = icpDemographics.locations.map(l => l.toLowerCase());

    const locationMatch = icpLocations.some(loc =>
      prospectLocation.includes(loc) || loc.includes(prospectLocation)
    );

    if (locationMatch) {
      score += 0.4;
    }
    weight += 0.4;
  }

  return weight > 0 ? Math.min(score / weight, 1.0) : 0.5;
};

/**
 * Score firmographics match (company, industry)
 * @param prospect - Prospect data
 * @param icpFirmographics - ICP firmographics criteria
 * @returns Score between 0 and 1
 */
const scoreFirmographics = (
  prospect: Prospect,
  icpFirmographics?: ICPCriteria['firmographics']
): number => {
  if (!icpFirmographics) {
    return 0.5; // Neutral score if no criteria
  }

  let score = 0;

  // Industry matching
  if (icpFirmographics.industries && icpFirmographics.industries.length > 0) {
    const companyName = (prospect.companyName || '').toLowerCase();
    const profileData = prospect.profileData as any || {};
    const industry = (profileData.industry || '').toLowerCase();

    const icpIndustries = icpFirmographics.industries.map(i => i.toLowerCase());

    // Check company name or industry field for matches
    const industryMatch = icpIndustries.some(ind =>
      companyName.includes(ind) ||
      industry.includes(ind) ||
      ind.includes(industry)
    );

    if (industryMatch) {
      score = 0.8;
    } else {
      score = 0.4; // Partial credit if no match
    }
  } else {
    score = 0.5; // Neutral if no criteria
  }

  return score;
};

/**
 * Calculate quality score based on data completeness
 * @param prospect - Prospect data
 * @returns Quality score between 0 and 1
 */
const calculateQualityScore = (prospect: Prospect): number => {
  let score = 0;
  const weights = {
    name: 0.2,
    headline: 0.2,
    companyName: 0.2,
    location: 0.1,
    email: 0.2,
    profileUrl: 0.1
  };

  if (prospect.name) score += weights.name;
  if (prospect.headline) score += weights.headline;
  if (prospect.companyName) score += weights.companyName;
  if (prospect.location) score += weights.location;
  if (prospect.profileUrl) score += weights.profileUrl;

  // Check for email in contactInfo
  const contactInfo = prospect.contactInfo as any;
  if (contactInfo?.email) {
    score += weights.email;
  }

  return Math.min(score, 1.0);
};

/**
 * Get qualification tier based on score
 * @param score - ICP match score
 * @returns Qualification tier
 */
const getQualificationTier = (score: number): 'hot' | 'qualified' | 'warm' | 'discard' => {
  if (score >= 0.85) return 'hot';
  if (score >= 0.75) return 'qualified';
  if (score >= 0.65) return 'warm';
  return 'discard';
};

/**
 * Query ICP vector from Pinecone
 * @param icpId - ICP ID
 * @param teamId - Team ID for namespace
 * @returns ICP vector
 */
const queryICPVector = async (icpId: string, teamId: string): Promise<number[]> => {
  try {
    const namespace = `team_${teamId}_icps`;
    const result = await fetchVector(namespace, icpId);

    if (!result || !result.values) {
      throw new Error('ICP vector not found in Pinecone');
    }

    return result.values;
  } catch (error) {
    console.error('❌ Failed to fetch ICP vector:', error);
    throw new Error('Failed to fetch ICP vector');
  }
};

/**
 * Batch score multiple prospects
 * @param prospectIds - Array of prospect IDs
 * @param teamId - Team ID for access control
 * @returns Array of scoring results
 */
export const batchScoreProspects = async (
  prospectIds: string[],
  teamId: string
): Promise<ScoringResult[]> => {
  const results: ScoringResult[] = [];
  const errors: string[] = [];

  console.log(`🎯 Batch scoring ${prospectIds.length} prospects`);

  for (const prospectId of prospectIds) {
    try {
      const result = await scoreProspect(prospectId, teamId);
      results.push(result);
    } catch (error) {
      const errorMsg = `Failed to score prospect ${prospectId}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} prospects failed scoring`);
  }

  console.log(`✅ Scored ${results.length} prospects successfully`);

  return results;
};

export default {
  scoreProspect,
  batchScoreProspects,
  getQualificationTier,
  calculateQualityScore
};