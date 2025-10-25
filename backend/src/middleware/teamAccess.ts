import { Request, Response, NextFunction } from 'express';
import { isTeamMember, isTeamAdmin } from '../services/teams.service';
import prisma from '../config/database';

/**
 * Team Access Middleware
 * Enforces team-based data access and role verification
 */

// Extend Express Request interface to include team info
declare global {
  namespace Express {
    interface Request {
      teamId?: string;
      teamRole?: string;
      teamMember?: {
        id: string;
        role: string;
        userId: string;
        teamId: string;
      };
    }
  }
}

/**
 * Extract teamId from request (params, body, or query)
 */
const extractTeamId = (req: Request): string | null => {
  return req.params.teamId || req.body.teamId || req.query.teamId as string || null;
};

/**
 * Middleware: Require user to be a team member
 * Verifies user belongs to the team specified in request
 */
export const requireTeamMember = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    const userId = req.user.id;
    const teamId = extractTeamId(req);

    if (!teamId) {
      return res.status(400).json({
        error: 'Team ID required',
        message: 'Team ID must be provided in request params, body, or query',
      });
    }

    // Verify user is a member of the team
    const isMember = await isTeamMember(teamId, userId);

    if (!isMember) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this team',
      });
    }

    // Get team member details and add to request
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (teamMember) {
      req.teamId = teamId;
      req.teamRole = teamMember.role;
      req.teamMember = {
        id: teamMember.id,
        role: teamMember.role,
        userId: teamMember.userId,
        teamId: teamMember.teamId,
      };
    }

    next();
  } catch (error) {
    console.error('Error in requireTeamMember middleware:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify team membership',
    });
  }
};

/**
 * Middleware: Require user to be a team admin or owner
 * Verifies user has admin or owner role in the team
 */
export const requireTeamAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    const userId = req.user.id;
    const teamId = extractTeamId(req);

    if (!teamId) {
      return res.status(400).json({
        error: 'Team ID required',
        message: 'Team ID must be provided in request params, body, or query',
      });
    }

    // Verify user is admin or owner
    const isAdmin = await isTeamAdmin(teamId, userId);

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a team admin or owner to perform this action',
      });
    }

    // Get team member details and add to request
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (teamMember) {
      req.teamId = teamId;
      req.teamRole = teamMember.role;
      req.teamMember = {
        id: teamMember.id,
        role: teamMember.role,
        userId: teamMember.userId,
        teamId: teamMember.teamId,
      };
    }

    next();
  } catch (error) {
    console.error('Error in requireTeamAdmin middleware:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify team admin status',
    });
  }
};

/**
 * Middleware factory: Require user to have a specific role
 * Creates middleware that verifies user has the specified role
 *
 * @param role - Required role ('owner', 'admin', or 'member')
 */
export const requireTeamRole = (role: 'owner' | 'admin' | 'member') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource',
        });
      }

      const userId = req.user.id;
      const teamId = extractTeamId(req);

      if (!teamId) {
        return res.status(400).json({
          error: 'Team ID required',
          message: 'Team ID must be provided in request params, body, or query',
        });
      }

      // Get team member details
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId,
        },
      });

      if (!teamMember) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You are not a member of this team',
        });
      }

      // Role hierarchy: owner > admin > member
      const roleHierarchy: Record<string, number> = {
        owner: 3,
        admin: 2,
        member: 1,
      };

      const userRoleLevel = roleHierarchy[teamMember.role] || 0;
      const requiredRoleLevel = roleHierarchy[role] || 0;

      // User must have at least the required role level
      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({
          error: 'Access denied',
          message: `You must have ${role} role or higher to perform this action`,
        });
      }

      // Add team info to request
      req.teamId = teamId;
      req.teamRole = teamMember.role;
      req.teamMember = {
        id: teamMember.id,
        role: teamMember.role,
        userId: teamMember.userId,
        teamId: teamMember.teamId,
      };

      next();
    } catch (error) {
      console.error('Error in requireTeamRole middleware:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify team role',
      });
    }
  };
};

/**
 * Middleware: Require user to be team owner
 * Shorthand for requireTeamRole('owner')
 */
export const requireTeamOwner = requireTeamRole('owner');

/**
 * Helper: Check if request has team context
 */
export const hasTeamContext = (req: Request): boolean => {
  return !!(req.teamId && req.teamMember);
};

/**
 * Helper: Get team ID from request
 */
export const getTeamIdFromRequest = (req: Request): string | null => {
  return req.teamId || extractTeamId(req);
};
