import prisma from '../config/database';
import { Lead, LeadActivity } from '@prisma/client';

/**
 * Lead Service
 * Handles CRUD operations and business logic for lead management
 */

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'status_change' | 'assignment';

export interface CreateLeadData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
  campaignId?: string;
  rawData?: any;
}

export interface LeadFilters {
  status?: string;
  campaignId?: string;
  assignedUserId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  qualificationScoreMin?: number;
  qualificationScoreMax?: number;
}

/**
 * Create a new lead
 */
export const createLead = async (
  teamId: string,
  campaignId: string | undefined,
  data: CreateLeadData
): Promise<Lead> => {
  try {
    const lead = await prisma.lead.create({
      data: {
        teamId,
        campaignId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        company: data.company,
        jobTitle: data.jobTitle,
        source: data.source || 'manual',
        status: 'new',
        qualificationScore: 0,
        rawData: data.rawData || {},
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            platforms: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return lead;
  } catch (error) {
    console.error('Error creating lead:', error);
    throw new Error('Failed to create lead');
  }
};

/**
 * Get lead by ID
 */
export const getLead = async (leadId: string, teamId: string): Promise<Lead | null> => {
  try {
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        teamId,
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            platforms: true,
            status: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        discoverySessions: {
          select: {
            id: true,
            transcript: true,
            summary: true,
            score: true,
            status: true,
            startedAt: true,
            completedAt: true,
          },
        },
        activities: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    return lead;
  } catch (error) {
    console.error('Error getting lead:', error);
    throw new Error('Failed to get lead');
  }
};

/**
 * List leads with filters
 */
export const listLeads = async (
  teamId: string,
  filters: LeadFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<{ leads: Lead[]; total: number; page: number; totalPages: number }> => {
  try {
    const where: any = {
      teamId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.campaignId) {
      where.campaignId = filters.campaignId;
    }

    if (filters.assignedUserId) {
      where.assignedUserId = filters.assignedUserId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    if (filters.qualificationScoreMin !== undefined || filters.qualificationScoreMax !== undefined) {
      where.qualificationScore = {};
      if (filters.qualificationScoreMin !== undefined) {
        where.qualificationScore.gte = filters.qualificationScoreMin;
      }
      if (filters.qualificationScoreMax !== undefined) {
        where.qualificationScore.lte = filters.qualificationScoreMax;
      }
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              platforms: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Error listing leads:', error);
    throw new Error('Failed to list leads');
  }
};

/**
 * Update lead status
 */
export const updateLeadStatus = async (
  leadId: string,
  teamId: string,
  newStatus: LeadStatus,
  userId?: string
): Promise<Lead> => {
  try {
    // Verify lead belongs to team
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, teamId },
    });

    if (!lead) {
      throw new Error('Lead not found or access denied');
    }

    // Update lead status
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // Log activity if userId provided
    if (userId) {
      await addLeadActivity(
        leadId,
        userId,
        'status_change',
        `Status changed from ${lead.status} to ${newStatus}`
      );
    }

    return updatedLead;
  } catch (error) {
    console.error('Error updating lead status:', error);
    throw new Error('Failed to update lead status');
  }
};

/**
 * Claim/assign lead to user
 */
export const claimLead = async (
  leadId: string,
  userId: string
): Promise<Lead> => {
  try {
    // First, find the lead by ID only
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Verify user is member of the lead's team (not the provided teamId)
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: lead.teamId,
        userId,
      },
    });

    if (!teamMember) {
      throw new Error('User is not a member of this lead\'s team');
    }

    // Assign lead to user
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedUserId: userId,
        updatedAt: new Date(),
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    await addLeadActivity(
      leadId,
      userId,
      'assignment',
      `Lead assigned to ${updatedLead.assignedUser?.displayName || 'user'}`
    );

    return updatedLead;
  } catch (error) {
    console.error('Error claiming lead:', error);
    throw new Error('Failed to claim lead');
  }
};

/**
 * Add lead activity
 */
export const addLeadActivity = async (
  leadId: string,
  userId: string,
  activityType: ActivityType,
  description: string
): Promise<LeadActivity> => {
  try {
    const activity = await prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        type: activityType,
        description,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    return activity;
  } catch (error) {
    console.error('Error adding lead activity:', error);
    throw new Error('Failed to add lead activity');
  }
};

/**
 * Get lead activities
 */
export const getLeadActivities = async (
  leadId: string,
  teamId: string,
  limit: number = 50
): Promise<LeadActivity[]> => {
  try {
    // Verify lead belongs to team
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, teamId },
      select: { id: true },
    });

    if (!lead) {
      throw new Error('Lead not found or access denied');
    }

    const activities = await prisma.leadActivity.findMany({
      where: { leadId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return activities;
  } catch (error) {
    console.error('Error getting lead activities:', error);
    throw new Error('Failed to get lead activities');
  }
};

/**
 * Search leads by name or email
 */
export const searchLeads = async (
  teamId: string,
  query: string,
  limit: number = 20
): Promise<Lead[]> => {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        teamId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return leads;
  } catch (error) {
    console.error('Error searching leads:', error);
    throw new Error('Failed to search leads');
  }
};

/**
 * Update lead
 */
export const updateLead = async (
  leadId: string,
  teamId: string,
  data: Partial<Lead>
): Promise<Lead> => {
  try {
    // Verify lead belongs to team
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, teamId },
    });

    if (!lead) {
      throw new Error('Lead not found or access denied');
    }

    // Filter out fields that shouldn't be updated directly
    const { id, teamId: _, createdAt, ...updateData } = data as any;

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    return updatedLead;
  } catch (error) {
    console.error('Error updating lead:', error);
    throw new Error('Failed to update lead');
  }
};

/**
 * Calculate lead qualification score (placeholder)
 * This will be enhanced with AI in future PRs
 */
export const calculateQualificationScore = async (
  leadId: string
): Promise<number> => {
  try {
    // For now, return a simple score based on available data
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        discoverySessions: true,
        activities: true,
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    let score = 0;

    // Has phone: +10
    if (lead.phone) score += 10;

    // Has discovery session: +30
    if (lead.discoverySessions && lead.discoverySessions.length > 0) score += 30;

    // Number of activities: +5 per activity (max 30)
    score += Math.min(lead.activities.length * 5, 30);

    // Has completed discovery with score: +30
    const completedSession = lead.discoverySessions?.find(s => s.status === 'completed');
    if (completedSession && completedSession.score) score += 30;

    return Math.min(score, 100);
  } catch (error) {
    console.error('Error calculating qualification score:', error);
    return 0;
  }
};
