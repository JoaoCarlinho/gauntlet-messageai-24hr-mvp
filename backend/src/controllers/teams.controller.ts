import { Request, Response } from 'express';
import {
  createTeam,
  getTeamById,
  getUserTeams,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
  getTeamMembers,
  TeamRole,
} from '../services/teams.service';

/**
 * Team Controller
 * Handles HTTP requests for team management
 */

/**
 * @route   POST /api/v1/teams
 * @desc    Create a new team
 * @access  Private
 */
export const createNewTeam = async (req: Request, res: Response) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['name and slug are required'],
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    // Validate slug format (lowercase, alphanumeric with hyphens)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({
        error: 'Invalid slug format',
        details: ['Slug must be lowercase alphanumeric with hyphens only'],
      });
    }

    const team = await createTeam(name, slug, req.user.id);

    res.status(201).json({
      message: 'Team created successfully',
      team,
    });
  } catch (error) {
    console.error('Error creating team:', error);

    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Team slug already exists',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to create team',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   GET /api/v1/teams
 * @desc    List all teams user belongs to
 * @access  Private
 */
export const getTeams = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const teams = await getUserTeams(req.user.id);

    res.status(200).json({
      teams,
      count: teams.length,
    });
  } catch (error) {
    console.error('Error getting teams:', error);
    res.status(500).json({
      error: 'Failed to get teams',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   GET /api/v1/teams/:id
 * @desc    Get team details
 * @access  Private (Team Member)
 */
export const getTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const team = await getTeamById(id, req.user.id);

    if (!team) {
      return res.status(404).json({
        error: 'Team not found',
      });
    }

    res.status(200).json(team);
  } catch (error) {
    console.error('Error getting team:', error);

    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({
        error: 'Access denied',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to get team',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   PUT /api/v1/teams/:id
 * @desc    Update team
 * @access  Private (Team Admin/Owner)
 */
export const updateTeamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!name && !slug) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['At least one field (name or slug) must be provided'],
      });
    }

    // Validate slug format if provided
    if (slug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(slug)) {
        return res.status(400).json({
          error: 'Invalid slug format',
          details: ['Slug must be lowercase alphanumeric with hyphens only'],
        });
      }
    }

    const updateData: { name?: string; slug?: string } = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;

    const team = await updateTeam(id, updateData, req.user.id);

    res.status(200).json({
      message: 'Team updated successfully',
      team,
    });
  } catch (error) {
    console.error('Error updating team:', error);

    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message,
        });
      }
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: 'Team slug already exists',
          message: error.message,
        });
      }
    }

    res.status(500).json({
      error: 'Failed to update team',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   DELETE /api/v1/teams/:id
 * @desc    Delete team (soft delete)
 * @access  Private (Team Owner)
 */
export const deleteTeamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    await deleteTeam(id, req.user.id);

    res.status(200).json({
      message: 'Team deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting team:', error);

    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({
        error: 'Access denied',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to delete team',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   GET /api/v1/teams/:id/members
 * @desc    List team members
 * @access  Private (Team Member)
 */
export const getMembers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const members = await getTeamMembers(id, req.user.id);

    res.status(200).json({
      members,
      count: members.length,
    });
  } catch (error) {
    console.error('Error getting team members:', error);

    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({
        error: 'Access denied',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to get team members',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   POST /api/v1/teams/:id/members
 * @desc    Add team member
 * @access  Private (Team Admin/Owner)
 */
export const addMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!userId || !role) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['userId and role are required'],
      });
    }

    // Validate role
    const validRoles: TeamRole[] = ['owner', 'admin', 'member'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        validRoles,
      });
    }

    const member = await addTeamMember(id, userId, role, req.user.id);

    res.status(201).json({
      message: 'Team member added successfully',
      member,
    });
  } catch (error) {
    console.error('Error adding team member:', error);

    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message,
        });
      }
      if (error.message.includes('already a member')) {
        return res.status(409).json({
          error: 'User already a member',
          message: error.message,
        });
      }
    }

    res.status(500).json({
      error: 'Failed to add team member',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   DELETE /api/v1/teams/:id/members/:userId
 * @desc    Remove team member
 * @access  Private (Team Admin/Owner)
 */
export const removeMember = async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    await removeTeamMember(id, userId, req.user.id);

    res.status(200).json({
      message: 'Team member removed successfully',
    });
  } catch (error) {
    console.error('Error removing team member:', error);

    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message,
        });
      }
      if (error.message.includes('last owner')) {
        return res.status(400).json({
          error: 'Cannot remove last owner',
          message: error.message,
        });
      }
    }

    res.status(500).json({
      error: 'Failed to remove team member',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

/**
 * @route   PUT /api/v1/teams/:id/members/:userId
 * @desc    Update team member role
 * @access  Private (Team Admin/Owner)
 */
export const updateMember = async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!role) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['role is required'],
      });
    }

    // Validate role
    const validRoles: TeamRole[] = ['owner', 'admin', 'member'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        validRoles,
      });
    }

    const member = await updateMemberRole(id, userId, role, req.user.id);

    res.status(200).json({
      message: 'Team member role updated successfully',
      member,
    });
  } catch (error) {
    console.error('Error updating team member role:', error);

    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message,
        });
      }
      if (error.message.includes('last owner')) {
        return res.status(400).json({
          error: 'Cannot change last owner role',
          message: error.message,
        });
      }
    }

    res.status(500).json({
      error: 'Failed to update team member role',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};
