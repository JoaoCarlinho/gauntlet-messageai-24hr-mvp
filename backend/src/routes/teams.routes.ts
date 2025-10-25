import { Router } from 'express';
import {
  createNewTeam,
  getTeams,
  getTeam,
  updateTeamById,
  deleteTeamById,
  getMembers,
  addMember,
  removeMember,
  updateMember,
} from '../controllers/teams.controller';
import { authenticate } from '../middleware/auth';
import { requireTeamMember, requireTeamAdmin, requireTeamOwner } from '../middleware/teamAccess';

const router = Router();

/**
 * Team Routes
 * All routes require authentication
 * Team-specific routes use team access middleware
 */

/**
 * @route   POST /api/v1/teams
 * @desc    Create a new team
 * @access  Private
 * @body    name, slug
 */
router.post('/', authenticate, createNewTeam);

/**
 * @route   GET /api/v1/teams
 * @desc    List all teams user belongs to
 * @access  Private
 */
router.get('/', authenticate, getTeams);

/**
 * @route   GET /api/v1/teams/:id
 * @desc    Get team details
 * @access  Private (Team Member)
 * @params  id (teamId)
 */
router.get('/:id', authenticate, requireTeamMember, getTeam);

/**
 * @route   PUT /api/v1/teams/:id
 * @desc    Update team
 * @access  Private (Team Admin/Owner)
 * @params  id (teamId)
 * @body    name?, slug?
 */
router.put('/:id', authenticate, requireTeamAdmin, updateTeamById);

/**
 * @route   DELETE /api/v1/teams/:id
 * @desc    Delete team (soft delete)
 * @access  Private (Team Owner)
 * @params  id (teamId)
 */
router.delete('/:id', authenticate, requireTeamOwner, deleteTeamById);

/**
 * @route   GET /api/v1/teams/:id/members
 * @desc    List team members
 * @access  Private (Team Member)
 * @params  id (teamId)
 */
router.get('/:id/members', authenticate, requireTeamMember, getMembers);

/**
 * @route   POST /api/v1/teams/:id/members
 * @desc    Add team member
 * @access  Private (Team Admin/Owner)
 * @params  id (teamId)
 * @body    userId, role
 */
router.post('/:id/members', authenticate, requireTeamAdmin, addMember);

/**
 * @route   DELETE /api/v1/teams/:id/members/:userId
 * @desc    Remove team member
 * @access  Private (Team Admin/Owner)
 * @params  id (teamId), userId (memberId)
 */
router.delete('/:id/members/:userId', authenticate, requireTeamAdmin, removeMember);

/**
 * @route   PUT /api/v1/teams/:id/members/:userId
 * @desc    Update team member role
 * @access  Private (Team Admin/Owner)
 * @params  id (teamId), userId (memberId)
 * @body    role
 */
router.put('/:id/members/:userId', authenticate, requireTeamAdmin, updateMember);

export default router;
