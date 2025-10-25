import prisma from '../config/database';
import { Team, TeamMember } from '@prisma/client';

/**
 * Team Service
 * Handles team CRUD operations and multi-tenancy with data isolation
 */

export type TeamRole = 'owner' | 'admin' | 'member';

export interface CreateTeamData {
  name: string;
  slug: string;
}

export interface UpdateTeamData {
  name?: string;
  slug?: string;
}

/**
 * Create a new team and add creator as owner
 */
export const createTeam = async (
  name: string,
  slug: string,
  creatorUserId: string
): Promise<Team> => {
  try {
    // Check if slug is already taken
    const existingTeam = await prisma.team.findUnique({
      where: { slug },
    });

    if (existingTeam) {
      throw new Error('Team slug already exists');
    }

    // Create team and add creator as owner in a transaction
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name,
          slug,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: creatorUserId,
          role: 'owner',
        },
      });

      return newTeam;
    });

    return team;
  } catch (error) {
    console.error('Error creating team:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create team');
  }
};

/**
 * Get team by ID (verify user is member)
 */
export const getTeamById = async (
  teamId: string,
  userId: string
): Promise<Team | null> => {
  try {
    // Verify user is a member of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (!membership) {
      throw new Error('Access denied: User is not a member of this team');
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            products: true,
            campaigns: true,
            leads: true,
          },
        },
      },
    });

    return team;
  } catch (error) {
    console.error('Error getting team:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get team');
  }
};

/**
 * Get all teams user belongs to
 */
export const getUserTeams = async (userId: string): Promise<Team[]> => {
  try {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            _count: {
              select: {
                members: true,
                products: true,
                campaigns: true,
                leads: true,
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => m.team);
  } catch (error) {
    console.error('Error getting user teams:', error);
    throw new Error('Failed to get user teams');
  }
};

/**
 * Update team (admin only)
 */
export const updateTeam = async (
  teamId: string,
  data: UpdateTeamData,
  userId: string
): Promise<Team> => {
  try {
    // Verify user is admin or owner
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
        role: { in: ['admin', 'owner'] },
      },
    });

    if (!membership) {
      throw new Error('Access denied: User must be an admin or owner');
    }

    // If slug is being updated, check if it's available
    if (data.slug) {
      const existingTeam = await prisma.team.findFirst({
        where: {
          slug: data.slug,
          id: { not: teamId },
        },
      });

      if (existingTeam) {
        throw new Error('Team slug already exists');
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return updatedTeam;
  } catch (error) {
    console.error('Error updating team:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update team');
  }
};

/**
 * Soft delete team (owner only)
 */
export const deleteTeam = async (
  teamId: string,
  userId: string
): Promise<Team> => {
  try {
    // Verify user is owner
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
        role: 'owner',
      },
    });

    if (!membership) {
      throw new Error('Access denied: Only team owner can delete the team');
    }

    // Soft delete by setting deletedAt
    const deletedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        deletedAt: new Date(),
      },
    });

    return deletedTeam;
  } catch (error) {
    console.error('Error deleting team:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete team');
  }
};

/**
 * Add team member
 */
export const addTeamMember = async (
  teamId: string,
  userIdToAdd: string,
  role: TeamRole,
  requestingUserId: string
): Promise<TeamMember> => {
  try {
    // Verify requesting user is admin or owner
    const requestingMembership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: requestingUserId,
        role: { in: ['admin', 'owner'] },
      },
    });

    if (!requestingMembership) {
      throw new Error('Access denied: User must be an admin or owner');
    }

    // Check if user is already a member
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: userIdToAdd,
      },
    });

    if (existingMembership) {
      throw new Error('User is already a member of this team');
    }

    // Add member
    const newMember = await prisma.teamMember.create({
      data: {
        teamId,
        userId: userIdToAdd,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return newMember;
  } catch (error) {
    console.error('Error adding team member:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to add team member');
  }
};

/**
 * Remove team member
 */
export const removeTeamMember = async (
  teamId: string,
  memberIdToRemove: string,
  requestingUserId: string
): Promise<void> => {
  try {
    // Verify requesting user is admin or owner
    const requestingMembership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: requestingUserId,
        role: { in: ['admin', 'owner'] },
      },
    });

    if (!requestingMembership) {
      throw new Error('Access denied: User must be an admin or owner');
    }

    // Get member to remove
    const memberToRemove = await prisma.teamMember.findFirst({
      where: {
        id: memberIdToRemove,
        teamId,
      },
    });

    if (!memberToRemove) {
      throw new Error('Member not found');
    }

    // Prevent removing the last owner
    if (memberToRemove.role === 'owner') {
      const ownerCount = await prisma.teamMember.count({
        where: {
          teamId,
          role: 'owner',
        },
      });

      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last owner of the team');
      }
    }

    // Remove member
    await prisma.teamMember.delete({
      where: { id: memberIdToRemove },
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to remove team member');
  }
};

/**
 * Update member role
 */
export const updateMemberRole = async (
  teamId: string,
  memberId: string,
  newRole: TeamRole,
  requestingUserId: string
): Promise<TeamMember> => {
  try {
    // Verify requesting user is admin or owner
    const requestingMembership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: requestingUserId,
        role: { in: ['admin', 'owner'] },
      },
    });

    if (!requestingMembership) {
      throw new Error('Access denied: User must be an admin or owner');
    }

    // Get member to update
    const memberToUpdate = await prisma.teamMember.findFirst({
      where: {
        id: memberId,
        teamId,
      },
    });

    if (!memberToUpdate) {
      throw new Error('Member not found');
    }

    // Prevent changing role of last owner
    if (memberToUpdate.role === 'owner' && newRole !== 'owner') {
      const ownerCount = await prisma.teamMember.count({
        where: {
          teamId,
          role: 'owner',
        },
      });

      if (ownerCount <= 1) {
        throw new Error('Cannot change role of the last owner');
      }
    }

    // Update role
    const updatedMember = await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        role: newRole,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return updatedMember;
  } catch (error) {
    console.error('Error updating member role:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update member role');
  }
};

/**
 * Get all team members
 */
export const getTeamMembers = async (
  teamId: string,
  userId: string
): Promise<TeamMember[]> => {
  try {
    // Verify user is a member of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (!membership) {
      throw new Error('Access denied: User is not a member of this team');
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // owner, admin, member
        { joinedAt: 'asc' },
      ],
    });

    return members;
  } catch (error) {
    console.error('Error getting team members:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get team members');
  }
};

/**
 * Check if user is a team member
 */
export const isTeamMember = async (
  teamId: string,
  userId: string
): Promise<boolean> => {
  try {
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    return !!membership;
  } catch (error) {
    console.error('Error checking team membership:', error);
    return false;
  }
};

/**
 * Check if user is a team admin or owner
 */
export const isTeamAdmin = async (
  teamId: string,
  userId: string
): Promise<boolean> => {
  try {
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
        role: { in: ['admin', 'owner'] },
      },
    });

    return !!membership;
  } catch (error) {
    console.error('Error checking team admin status:', error);
    return false;
  }
};
