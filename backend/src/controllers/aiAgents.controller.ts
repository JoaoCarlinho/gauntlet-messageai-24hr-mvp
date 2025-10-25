import { Request, Response } from 'express';
import * as productDefinerService from '../services/aiAgents/productDefiner.service';
import * as campaignAdvisorService from '../services/aiAgents/campaignAdvisor.service';
import * as contentGeneratorService from '../services/aiAgents/contentGenerator.service';
import * as contentLibraryService from '../services/contentLibrary.service';
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

/**
 * Generate ad copy for a specific platform
 *
 * POST /api/v1/ai/content-generator/ad-copy
 *
 * @param req.body.productId - Product ID
 * @param req.body.platform - Target platform
 * @param req.body.variations - Number of variations (default: 3)
 * @param req.body.saveToLibrary - Whether to save to content library (default: false)
 * @param req.user.teamId - Team ID from auth middleware
 * @returns Generated ad copy variations
 */
export const generateAdCopy = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, platform, variations = 3, saveToLibrary = false } = req.body;
    const teamId = (req as any).user?.teamId;

    if (!teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!productId || !platform) {
      res.status(400).json({
        error: 'productId and platform are required',
      });
      return;
    }

    // Generate ad copy
    const result = await contentGeneratorService.generateAdCopy(
      productId,
      teamId,
      platform,
      variations
    );

    // Optionally save to content library
    let savedContent = null;
    if (saveToLibrary) {
      savedContent = await contentLibraryService.saveContent({
        teamId,
        productId,
        contentType: 'ad_copy',
        platform,
        title: `${platform} Ad Copy - ${new Date().toLocaleDateString()}`,
        content: result,
        metadata: { variations },
      });
    }

    res.status(200).json({
      ...result,
      savedContentId: savedContent?.id,
    });
  } catch (error) {
    console.error('Error generating ad copy:', error);
    res.status(500).json({
      error: 'Failed to generate ad copy',
    });
  }
};

/**
 * Generate social media posts for a specific platform
 *
 * POST /api/v1/ai/content-generator/social-posts
 *
 * @param req.body.productId - Product ID
 * @param req.body.platform - Target platform
 * @param req.body.count - Number of posts (default: 5)
 * @param req.body.saveToLibrary - Whether to save to content library (default: false)
 * @param req.user.teamId - Team ID from auth middleware
 * @returns Generated social posts
 */
export const generateSocialPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, platform, count = 5, saveToLibrary = false } = req.body;
    const teamId = (req as any).user?.teamId;

    if (!teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!productId || !platform) {
      res.status(400).json({
        error: 'productId and platform are required',
      });
      return;
    }

    // Generate social posts
    const result = await contentGeneratorService.generateSocialPosts(
      productId,
      teamId,
      platform,
      count
    );

    // Optionally save to content library
    let savedContent = null;
    if (saveToLibrary) {
      savedContent = await contentLibraryService.saveContent({
        teamId,
        productId,
        contentType: 'social_post',
        platform,
        title: `${platform} Social Posts - ${new Date().toLocaleDateString()}`,
        content: result,
        metadata: { count },
      });
    }

    res.status(200).json({
      ...result,
      savedContentId: savedContent?.id,
    });
  } catch (error) {
    console.error('Error generating social posts:', error);
    res.status(500).json({
      error: 'Failed to generate social posts',
    });
  }
};

/**
 * Generate landing page copy
 *
 * POST /api/v1/ai/content-generator/landing-page
 *
 * @param req.body.productId - Product ID
 * @param req.body.saveToLibrary - Whether to save to content library (default: false)
 * @param req.user.teamId - Team ID from auth middleware
 * @returns Generated landing page sections
 */
export const generateLandingPage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, saveToLibrary = false } = req.body;
    const teamId = (req as any).user?.teamId;

    if (!teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!productId) {
      res.status(400).json({
        error: 'productId is required',
      });
      return;
    }

    // Generate landing page copy
    const result = await contentGeneratorService.generateLandingPageCopy(
      productId,
      teamId
    );

    // Optionally save to content library
    let savedContent = null;
    if (saveToLibrary) {
      savedContent = await contentLibraryService.saveContent({
        teamId,
        productId,
        contentType: 'landing_page',
        title: `Landing Page Copy - ${new Date().toLocaleDateString()}`,
        content: result,
      });
    }

    res.status(200).json({
      ...result,
      savedContentId: savedContent?.id,
    });
  } catch (error) {
    console.error('Error generating landing page:', error);
    res.status(500).json({
      error: 'Failed to generate landing page copy',
    });
  }
};

/**
 * Generate image prompts for DALL-E
 *
 * POST /api/v1/ai/content-generator/image-prompts
 *
 * @param req.body.productId - Product ID
 * @param req.body.concept - Visual concept
 * @param req.body.count - Number of prompt variations (default: 3)
 * @param req.body.saveToLibrary - Whether to save to content library (default: false)
 * @param req.user.teamId - Team ID from auth middleware
 * @returns Generated DALL-E prompts
 */
export const generateImagePrompts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, concept, count = 3, saveToLibrary = false } = req.body;
    const teamId = (req as any).user?.teamId;

    if (!teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!productId || !concept) {
      res.status(400).json({
        error: 'productId and concept are required',
      });
      return;
    }

    // Generate image prompts
    const result = await contentGeneratorService.generateImagePrompts(
      productId,
      teamId,
      concept,
      count
    );

    // Optionally save to content library
    let savedContent = null;
    if (saveToLibrary) {
      savedContent = await contentLibraryService.saveContent({
        teamId,
        productId,
        contentType: 'image_prompt',
        title: `Image Prompts: ${concept} - ${new Date().toLocaleDateString()}`,
        content: result,
        metadata: { concept, count },
      });
    }

    res.status(200).json({
      ...result,
      savedContentId: savedContent?.id,
    });
  } catch (error) {
    console.error('Error generating image prompts:', error);
    res.status(500).json({
      error: 'Failed to generate image prompts',
    });
  }
};

/**
 * Regenerate content with modifications
 *
 * POST /api/v1/ai/content-generator/regenerate
 *
 * @param req.body.contentId - Content ID from library
 * @param req.body.instruction - Modification instruction
 * @param req.body.saveToLibrary - Whether to save regenerated version (default: false)
 * @param req.user.teamId - Team ID from auth middleware
 * @returns Regenerated content
 */
export const regenerateContent = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { contentId, instruction, saveToLibrary = false } = req.body;
    const teamId = (req as any).user?.teamId;

    if (!teamId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!contentId || !instruction) {
      res.status(400).json({
        error: 'contentId and instruction are required',
      });
      return;
    }

    // Get original content
    const originalContent = await contentLibraryService.getContent(
      contentId,
      teamId
    );

    if (!originalContent) {
      res.status(404).json({
        error: 'Content not found',
      });
      return;
    }

    // Regenerate content
    const result = await contentGeneratorService.regenerateContent(
      JSON.stringify(originalContent.content),
      instruction,
      originalContent.contentType
    );

    // Optionally save to content library
    let savedContent = null;
    if (saveToLibrary) {
      savedContent = await contentLibraryService.saveContent({
        teamId,
        productId: originalContent.productId || undefined,
        campaignId: originalContent.campaignId || undefined,
        contentType: originalContent.contentType as any,
        platform: originalContent.platform || undefined,
        title: `${originalContent.title} (Regenerated)`,
        content: result,
        metadata: {
          originalContentId: contentId,
          instruction,
        },
      });
    }

    res.status(200).json({
      result,
      savedContentId: savedContent?.id,
    });
  } catch (error) {
    console.error('Error regenerating content:', error);
    res.status(500).json({
      error: 'Failed to regenerate content',
    });
  }
};
