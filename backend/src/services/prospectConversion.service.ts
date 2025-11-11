import prisma from '../config/database';
import { getProspect, updateProspect } from './prospects.service';

/**
 * Prospect Conversion Service
 * Converts qualified prospects into CRM leads
 */

export interface ConversionResult {
  leadId: string;
  prospectId: string;
  message: string;
  nextSteps?: string;
}

/**
 * Convert a qualified prospect to a lead
 * @param prospectId - Prospect ID to convert
 * @param teamId - Team ID for access control
 * @returns Conversion result with lead ID
 */
export const convertProspectToLead = async (
  prospectId: string,
  teamId: string
): Promise<ConversionResult> => {
  try {
    console.log(`🔄 Converting prospect ${prospectId} to lead`);

    // Load prospect with campaign
    const prospect = await prisma.prospect.findFirst({
      where: {
        id: prospectId,
        campaign: { teamId }
      },
      include: {
        campaign: true
      }
    });

    if (!prospect) {
      throw new Error('Prospect not found or access denied');
    }

    // Check if already converted
    if (prospect.convertedToLeadId) {
      throw new ConflictError('Prospect already converted to lead');
    }

    // Validate qualification criteria
    const isQualified =
      prospect.status === 'qualified' ||
      prospect.status === 'enriched' && (prospect.icpMatchScore || 0) >= 0.75;

    if (!isQualified) {
      throw new BadRequestError(
        'Prospect does not meet qualification criteria (status="qualified" or icpMatchScore ≥0.75)'
      );
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Extract contact info
      const contactInfo = prospect.contactInfo as any || {};
      const profileData = prospect.profileData as any || {};
      const enrichmentData = prospect.enrichmentData as any || {};

      // Parse name into first/last
      const { firstName, lastName } = parseName(prospect.name || '');

      // Create Lead record
      const lead = await tx.lead.create({
        data: {
          teamId,
          campaignId: prospect.campaignId,
          prospectId: prospect.id,
          email: contactInfo.email || null,
          phone: contactInfo.phone || null,
          firstName,
          lastName,
          company: prospect.companyName || null,
          jobTitle: prospect.headline || null,
          source: `Social Prospecting - ${prospect.campaign.name}`,
          status: 'new',
          qualificationScore: prospect.icpMatchScore || 0,
          socialProfiles: {
            [prospect.platform]: prospect.profileUrl,
            ...(profileData.linkedin && { linkedin: profileData.linkedin }),
            ...(profileData.twitter && { twitter: profileData.twitter }),
            ...(profileData.facebook && { facebook: profileData.facebook })
          },
          enrichmentScore: prospect.qualityScore || 0,
          lastEnrichedAt: prospect.enrichedAt,
          rawData: {
            prospectData: profileData,
            enrichmentData: enrichmentData,
            location: prospect.location,
            companyUrl: prospect.companyUrl
          }
        }
      });

      // Update Prospect status
      await tx.prospect.update({
        where: { id: prospect.id },
        data: {
          status: 'converted',
          convertedToLeadId: lead.id,
          updatedAt: new Date()
        }
      });

      // Update Campaign counters
      await tx.prospectingCampaign.update({
        where: { id: prospect.campaignId },
        data: {
          convertedCount: { increment: 1 }
        }
      });

      console.log(`✅ Prospect converted to lead: ${lead.id}`);

      return lead;
    });

    return {
      leadId: result.id,
      prospectId: prospect.id,
      message: 'Prospect converted successfully',
      nextSteps: 'Lead is now available in CRM pipeline for outreach'
    };
  } catch (error) {
    console.error('❌ Failed to convert prospect:', error);

    if (error instanceof ConflictError || error instanceof BadRequestError) {
      throw error;
    }

    throw new Error(
      error instanceof Error ? error.message : 'Failed to convert prospect'
    );
  }
};

/**
 * Batch convert multiple prospects to leads
 * @param prospectIds - Array of prospect IDs
 * @param teamId - Team ID for access control
 * @returns Array of conversion results
 */
export const batchConvertProspects = async (
  prospectIds: string[],
  teamId: string
): Promise<{ successful: ConversionResult[]; failed: { prospectId: string; error: string }[] }> => {
  const successful: ConversionResult[] = [];
  const failed: { prospectId: string; error: string }[] = [];

  console.log(`🔄 Batch converting ${prospectIds.length} prospects`);

  for (const prospectId of prospectIds) {
    try {
      const result = await convertProspectToLead(prospectId, teamId);
      successful.push(result);
    } catch (error) {
      failed.push({
        prospectId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  console.log(`✅ Converted ${successful.length} prospects, ${failed.length} failed`);

  return { successful, failed };
};

/**
 * Parse full name into first and last name
 */
const parseName = (fullName: string): { firstName: string; lastName: string } => {
  if (!fullName) {
    return { firstName: '', lastName: '' };
  }

  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  } else if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] };
  } else {
    // For 3+ parts, first part is first name, rest is last name
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }
};

/**
 * Custom error classes
 */
export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BadRequestError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export default {
  convertProspectToLead,
  batchConvertProspects
};