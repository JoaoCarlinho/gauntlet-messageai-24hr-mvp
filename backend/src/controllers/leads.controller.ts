import { Request, Response } from 'express';
import {
  createLead,
  getLead,
  listLeads,
  updateLeadStatus,
  claimLead,
  addLeadActivity,
  getLeadActivities,
  searchLeads,
  updateLead,
  LeadFilters,
  LeadStatus,
  ActivityType,
} from '../services/leads.service';

/**
 * Lead Controller
 * Handles HTTP requests for lead management
 */

/**
 * @route   GET /api/v1/leads
 * @desc    List leads with filters
 * @access  Private (Team Member)
 */
export const getLeads = async (req: Request, res: Response) => {
  try {
    const teamId = req.query.teamId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!teamId) {
      return res.status(400).json({
        error: 'Team ID is required',
      });
    }

    // Build filters from query parameters
    const filters: LeadFilters = {};

    if (req.query.status) {
      filters.status = req.query.status as LeadStatus;
    }

    if (req.query.campaignId) {
      filters.campaignId = req.query.campaignId as string;
    }

    if (req.query.assignedUserId) {
      filters.assignedUserId = req.query.assignedUserId as string;
    }

    if (req.query.dateFrom) {
      filters.dateFrom = new Date(req.query.dateFrom as string);
    }

    if (req.query.dateTo) {
      filters.dateTo = new Date(req.query.dateTo as string);
    }

    if (req.query.qualificationScoreMin) {
      filters.qualificationScoreMin = parseInt(req.query.qualificationScoreMin as string);
    }

    if (req.query.qualificationScoreMax) {
      filters.qualificationScoreMax = parseInt(req.query.qualificationScoreMax as string);
    }

    const result = await listLeads(teamId, filters, page, limit);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting leads:', error);
    res.status(500).json({
      error: 'Failed to get leads',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   GET /api/v1/leads/:id
 * @desc    Get lead details
 * @access  Private (Team Member)
 */
export const getLeadById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teamId = req.query.teamId as string;

    if (!teamId) {
      return res.status(400).json({
        error: 'Team ID is required',
      });
    }

    const lead = await getLead(id, teamId);

    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found',
      });
    }

    res.status(200).json(lead);
  } catch (error) {
    console.error('Error getting lead:', error);
    res.status(500).json({
      error: 'Failed to get lead',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   POST /api/v1/leads
 * @desc    Create new lead
 * @access  Private (Team Member)
 */
export const createNewLead = async (req: Request, res: Response) => {
  try {
    const { teamId, campaignId, email, firstName, lastName, phone, company, jobTitle, source, rawData } = req.body;

    if (!teamId || !email) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['teamId and email are required'],
      });
    }

    const lead = await createLead(teamId, campaignId, {
      email,
      firstName,
      lastName,
      phone,
      company,
      jobTitle,
      source,
      rawData,
    });

    res.status(201).json({
      message: 'Lead created successfully',
      lead,
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({
      error: 'Failed to create lead',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   PUT /api/v1/leads/:id
 * @desc    Update lead
 * @access  Private (Team Member)
 */
export const updateLeadById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teamId = req.body.teamId as string;

    if (!teamId) {
      return res.status(400).json({
        error: 'Team ID is required',
      });
    }

    const { email, firstName, lastName, phone, company, jobTitle, source, qualificationScore } = req.body;

    const updateData: any = {};
    if (email) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (source) updateData.source = source;
    if (qualificationScore !== undefined) updateData.qualificationScore = qualificationScore;

    const lead = await updateLead(id, teamId, updateData);

    res.status(200).json({
      message: 'Lead updated successfully',
      lead,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      error: 'Failed to update lead',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   PUT /api/v1/leads/:id/status
 * @desc    Update lead status
 * @access  Private (Team Member)
 */
export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId, status, userId } = req.body;

    if (!teamId || !status) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['teamId and status are required'],
      });
    }

    // Validate status
    const validStatuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses,
      });
    }

    const lead = await updateLeadStatus(id, teamId, status, userId);

    res.status(200).json({
      message: 'Lead status updated successfully',
      lead,
    });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({
      error: 'Failed to update lead status',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   POST /api/v1/leads/:id/claim
 * @desc    Claim/assign lead to user
 * @access  Private (Team Member)
 */
export const claimLeadById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId, userId } = req.body;

    if (!teamId || !userId) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['teamId and userId are required'],
      });
    }

    const lead = await claimLead(id, userId, teamId);

    res.status(200).json({
      message: 'Lead claimed successfully',
      lead,
    });
  } catch (error) {
    console.error('Error claiming lead:', error);
    res.status(500).json({
      error: 'Failed to claim lead',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   POST /api/v1/leads/:id/activities
 * @desc    Add activity to lead
 * @access  Private (Team Member)
 */
export const addActivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, activityType, description } = req.body;

    if (!userId || !activityType || !description) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['userId, activityType, and description are required'],
      });
    }

    // Validate activity type
    const validActivityTypes: ActivityType[] = [
      'email',
      'call',
      'meeting',
      'note',
      'status_change',
      'assignment',
    ];
    if (!validActivityTypes.includes(activityType)) {
      return res.status(400).json({
        error: 'Invalid activity type',
        validActivityTypes,
      });
    }

    const activity = await addLeadActivity(id, userId, activityType, description);

    res.status(201).json({
      message: 'Activity added successfully',
      activity,
    });
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({
      error: 'Failed to add activity',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   GET /api/v1/leads/:id/activities
 * @desc    Get lead activities
 * @access  Private (Team Member)
 */
export const getActivities = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teamId = req.query.teamId as string;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!teamId) {
      return res.status(400).json({
        error: 'Team ID is required',
      });
    }

    const activities = await getLeadActivities(id, teamId, limit);

    res.status(200).json({
      activities,
      count: activities.length,
    });
  } catch (error) {
    console.error('Error getting activities:', error);
    res.status(500).json({
      error: 'Failed to get activities',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   POST /api/v1/leads/search
 * @desc    Search leads by name or email
 * @access  Private (Team Member)
 */
export const searchLeadsByQuery = async (req: Request, res: Response) => {
  try {
    const { teamId, query } = req.body;
    const limit = parseInt(req.body.limit as string) || 20;

    if (!teamId || !query) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['teamId and query are required'],
      });
    }

    const leads = await searchLeads(teamId, query, limit);

    res.status(200).json({
      leads,
      count: leads.length,
    });
  } catch (error) {
    console.error('Error searching leads:', error);
    res.status(500).json({
      error: 'Failed to search leads',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};
