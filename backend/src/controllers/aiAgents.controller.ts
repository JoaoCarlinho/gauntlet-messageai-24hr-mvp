import { Request, Response } from 'express';
import * as productDefinerService from '../services/aiAgents/productDefiner.service';
import * as campaignAdvisorService from '../services/aiAgents/campaignAdvisor.service';
import { streamToSSE } from '../utils/streaming';

/**
 * AI Agents Controller
 *
 * HTTP endpoints for AI agent interactions including:
 * - Product Definer agent
 * - Future agents (Campaign Advisor, Content Generator, etc.)
 */

/**
 * Start a new product definer conversation
 *
 * POST /api/v1/ai/product-definer/start
 *
 * @param req.user.userId - User ID from auth middleware
 * @param req.user.teamId - Team ID from auth middleware
 * @returns conversationId
 */
export const startProductDefinerConversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const teamId = (req as any).user?.teamId;

    if (!userId || !teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const conversationId = await productDefinerService.startConversation(
      userId,
      teamId
    );

    res.status(201).json({
      conversationId,
      message: 'Conversation started',
    });
  } catch (error) {
    console.error('Error starting product definer conversation:', error);
    res.status(500).json({
      error: 'Failed to start conversation',
    });
  }
};

/**
 * Send a message to the product definer agent
 *
 * POST /api/v1/ai/product-definer/message
 *
 * Streams AI response using Server-Sent Events (SSE)
 *
 * @param req.body.conversationId - Conversation ID
 * @param req.body.message - User's message
 * @param req.user.userId - User ID from auth middleware
 * @param req.user.teamId - Team ID from auth middleware
 * @returns SSE stream with AI response
 */
export const sendProductDefinerMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { conversationId, message } = req.body;
    const userId = (req as any).user?.userId;
    const teamId = (req as any).user?.teamId;

    if (!userId || !teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!conversationId || !message) {
      res.status(400).json({
        error: 'conversationId and message are required',
      });
      return;
    }

    // Initialize SSE connection
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection message
    res.write(': SSE connection established\n\n');
    res.flushHeaders();

    // Process message and get streaming result
    const result = await productDefinerService.processMessage(
      conversationId,
      userId,
      teamId,
      message
    );

    // Stream AI response to client using SSE
    await streamToSSE(result, res);
  } catch (error) {
    console.error('Error sending product definer message:', error);

    // Send error event if SSE not yet ended
    if (!res.writableEnded) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error: 'Failed to process message',
        })}\n\n`
      );
      res.end();
    }
  }
};

/**
 * Complete a product definer conversation
 *
 * POST /api/v1/ai/product-definer/complete
 *
 * Marks conversation as completed and returns created entities
 *
 * @param req.body.conversationId - Conversation ID
 * @param req.user.userId - User ID from auth middleware
 * @param req.user.teamId - Team ID from auth middleware
 * @returns Created product and ICP IDs
 */
export const completeProductDefinerConversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.body;
    const userId = (req as any).user?.userId;
    const teamId = (req as any).user?.teamId;

    if (!userId || !teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!conversationId) {
      res.status(400).json({
        error: 'conversationId is required',
      });
      return;
    }

    // Get conversation summary
    const summary = await productDefinerService.getConversationSummary(
      conversationId,
      userId,
      teamId
    );

    res.status(200).json({
      conversationId,
      status: summary.status,
      productSaved: summary.productSaved,
      icpSaved: summary.icpSaved,
      productId: summary.productId,
      icpId: summary.icpId,
    });
  } catch (error) {
    console.error('Error completing product definer conversation:', error);
    res.status(500).json({
      error: 'Failed to complete conversation',
    });
  }
};

/**
 * Get conversation summary/status
 *
 * GET /api/v1/ai/product-definer/status/:conversationId
 *
 * @param req.params.conversationId - Conversation ID
 * @param req.user.userId - User ID from auth middleware
 * @param req.user.teamId - Team ID from auth middleware
 * @returns Conversation status and created entities
 */
export const getProductDefinerStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = (req as any).user?.userId;
    const teamId = (req as any).user?.teamId;

    if (!userId || !teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get conversation summary
    const summary = await productDefinerService.getConversationSummary(
      conversationId,
      userId,
      teamId
    );

    res.status(200).json(summary);
  } catch (error) {
    console.error('Error getting product definer status:', error);
    res.status(500).json({
      error: 'Failed to get conversation status',
    });
  }
};

/**
 * Start a new campaign planning conversation
 *
 * POST /api/v1/ai/campaign-advisor/start
 *
 * @param req.body.productId - Product ID for campaign
 * @param req.body.icpId - ICP ID for targeting
 * @param req.user.userId - User ID from auth middleware
 * @param req.user.teamId - Team ID from auth middleware
 * @returns conversationId
 */
export const startCampaignAdvisorConversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, icpId } = req.body;
    const userId = (req as any).user?.userId;
    const teamId = (req as any).user?.teamId;

    if (!userId || !teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!productId || !icpId) {
      res.status(400).json({
        error: 'productId and icpId are required',
      });
      return;
    }

    const conversationId = await campaignAdvisorService.startCampaignPlanning(
      userId,
      teamId,
      productId,
      icpId
    );

    res.status(201).json({
      conversationId,
      message: 'Campaign planning conversation started',
    });
  } catch (error) {
    console.error('Error starting campaign advisor conversation:', error);
    res.status(500).json({
      error: 'Failed to start conversation',
    });
  }
};

/**
 * Send a message to the campaign advisor agent
 *
 * POST /api/v1/ai/campaign-advisor/message
 *
 * Streams AI response using Server-Sent Events (SSE)
 *
 * @param req.body.conversationId - Conversation ID
 * @param req.body.message - User's message
 * @param req.user.userId - User ID from auth middleware
 * @param req.user.teamId - Team ID from auth middleware
 * @returns SSE stream with AI response
 */
export const sendCampaignAdvisorMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { conversationId, message } = req.body;
    const userId = (req as any).user?.userId;
    const teamId = (req as any).user?.teamId;

    if (!userId || !teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!conversationId || !message) {
      res.status(400).json({
        error: 'conversationId and message are required',
      });
      return;
    }

    // Initialize SSE connection
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection message
    res.write(': SSE connection established\n\n');
    res.flushHeaders();

    // Process message and get streaming result
    const result = await campaignAdvisorService.processMessage(
      conversationId,
      userId,
      teamId,
      message
    );

    // Stream AI response to client using SSE
    await streamToSSE(result, res);
  } catch (error) {
    console.error('Error sending campaign advisor message:', error);

    // Send error event if SSE not yet ended
    if (!res.writableEnded) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error: 'Failed to process message',
        })}\n\n`
      );
      res.end();
    }
  }
};

/**
 * Complete a campaign advisor conversation
 *
 * POST /api/v1/ai/campaign-advisor/complete
 *
 * Marks conversation as completed and returns created campaign
 *
 * @param req.body.conversationId - Conversation ID
 * @param req.user.userId - User ID from auth middleware
 * @param req.user.teamId - Team ID from auth middleware
 * @returns Created campaign ID
 */
export const completeCampaignAdvisorConversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.body;
    const userId = (req as any).user?.userId;
    const teamId = (req as any).user?.teamId;

    if (!userId || !teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!conversationId) {
      res.status(400).json({
        error: 'conversationId is required',
      });
      return;
    }

    // Get conversation summary
    const summary = await campaignAdvisorService.getConversationSummary(
      conversationId,
      userId,
      teamId
    );

    res.status(200).json({
      conversationId,
      status: summary.status,
      campaignSaved: summary.campaignSaved,
      campaignId: summary.campaignId,
    });
  } catch (error) {
    console.error('Error completing campaign advisor conversation:', error);
    res.status(500).json({
      error: 'Failed to complete conversation',
    });
  }
};

/**
 * Get campaign advisor conversation summary/status
 *
 * GET /api/v1/ai/campaign-advisor/status/:conversationId
 *
 * @param req.params.conversationId - Conversation ID
 * @param req.user.userId - User ID from auth middleware
 * @param req.user.teamId - Team ID from auth middleware
 * @returns Conversation status and created campaign
 */
export const getCampaignAdvisorStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = (req as any).user?.userId;
    const teamId = (req as any).user?.teamId;

    if (!userId || !teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get conversation summary
    const summary = await campaignAdvisorService.getConversationSummary(
      conversationId,
      userId,
      teamId
    );

    res.status(200).json(summary);
  } catch (error) {
    console.error('Error getting campaign advisor status:', error);
    res.status(500).json({
      error: 'Failed to get conversation status',
    });
  }
};
