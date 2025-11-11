import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * GDPR Controller
 * Handles data export and deletion requests for GDPR compliance
 */

/**
 * Export all user data
 * GET /api/v1/gdpr/export
 */
export const exportUserData = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamId = req.user?.teamId;

    if (!userId || !teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found'
      });
    }

    // Collect all user-related data
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: true,
        conversations: {
          include: { messages: true }
        },
        leads: true
      }
    });

    // Get prospects created by user's team
    const prospects = await prisma.prospect.findMany({
      where: { campaign: { teamId } }
    });

    // Get campaigns
    const campaigns = await prisma.prospectingCampaign.findMany({
      where: { teamId }
    });

    const exportData = {
      user: {
        id: userData?.id,
        email: userData?.email,
        name: userData?.name,
        createdAt: userData?.createdAt
      },
      team: userData?.team,
      conversations: userData?.conversations,
      leads: userData?.leads,
      prospects,
      campaigns,
      exportDate: new Date().toISOString()
    };

    // Return as JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="gdpr-export-${userId}.json"`);
    return res.json(exportData);
  } catch (error) {
    console.error('❌ GDPR export error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export data'
    });
  }
};

/**
 * Delete all user data
 * DELETE /api/v1/gdpr/delete
 */
export const deleteUserData = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamId = req.user?.teamId;
    const { confirmation } = req.body;

    if (!userId || !teamId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found'
      });
    }

    if (confirmation !== 'DELETE_MY_DATA') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please confirm deletion with confirmation: "DELETE_MY_DATA"'
      });
    }

    // Use transaction for atomic deletion
    await prisma.$transaction(async (tx) => {
      // Delete messages
      await tx.message.deleteMany({
        where: { conversation: { userId } }
      });

      // Delete conversations
      await tx.conversation.deleteMany({
        where: { userId }
      });

      // Delete leads
      await tx.lead.deleteMany({
        where: { teamId }
      });

      // Delete prospects
      await tx.prospect.deleteMany({
        where: { campaign: { teamId } }
      });

      // Delete campaigns
      await tx.prospectingCampaign.deleteMany({
        where: { teamId }
      });

      // Delete enrichment logs
      await tx.enrichmentLog.deleteMany({
        where: { teamId }
      });

      // Finally, delete user
      await tx.user.delete({
        where: { id: userId }
      });
    });

    return res.status(200).json({
      success: true,
      message: 'All user data has been permanently deleted'
    });
  } catch (error) {
    console.error('❌ GDPR deletion error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete data'
    });
  }
};

export default {
  exportUserData,
  deleteUserData
};