import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createNewLead,
  updateLeadById,
  updateStatus,
  claimLeadById,
  addActivity,
  getActivities,
  searchLeadsByQuery,
} from '../controllers/leads.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Lead Routes
 * All routes require authentication
 * Team access should be verified in controllers via teamId
 */

/**
 * @route   GET /api/v1/leads
 * @desc    List leads with filters
 * @access  Private
 * @query   teamId, status, campaignId, assignedUserId, dateFrom, dateTo, qualificationScoreMin, qualificationScoreMax, page, limit
 */
router.get('/', authenticate, getLeads);

/**
 * @route   POST /api/v1/leads
 * @desc    Create new lead
 * @access  Private
 * @body    teamId, campaignId?, email, name, phone?, source?, metadata?
 */
router.post('/', authenticate, createNewLead);

/**
 * @route   POST /api/v1/leads/search
 * @desc    Search leads by name or email
 * @access  Private
 * @body    teamId, query, limit?
 */
router.post('/search', authenticate, searchLeadsByQuery);

/**
 * @route   GET /api/v1/leads/:id
 * @desc    Get lead details
 * @access  Private
 * @query   teamId
 */
router.get('/:id', authenticate, getLeadById);

/**
 * @route   PUT /api/v1/leads/:id
 * @desc    Update lead
 * @access  Private
 * @body    teamId, email?, name?, phone?, source?, metadata?, qualificationScore?
 */
router.put('/:id', authenticate, updateLeadById);

/**
 * @route   PUT /api/v1/leads/:id/status
 * @desc    Update lead status
 * @access  Private
 * @body    teamId, status, userId?
 */
router.put('/:id/status', authenticate, updateStatus);

/**
 * @route   POST /api/v1/leads/:id/claim
 * @desc    Claim/assign lead to user
 * @access  Private
 * @body    teamId, userId
 */
router.post('/:id/claim', authenticate, claimLeadById);

/**
 * @route   POST /api/v1/leads/:id/activities
 * @desc    Add activity to lead
 * @access  Private
 * @body    userId, activityType, description
 */
router.post('/:id/activities', authenticate, addActivity);

/**
 * @route   GET /api/v1/leads/:id/activities
 * @desc    Get lead activities
 * @access  Private
 * @query   teamId, limit?
 */
router.get('/:id/activities', authenticate, getActivities);

export default router;
