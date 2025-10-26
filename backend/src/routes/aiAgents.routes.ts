import { Router } from 'express';
import * as aiAgentsController from '../controllers/aiAgents.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * AI Agents Routes
 *
 * All routes require authentication and team access
 * Rate limited to 100 requests/hour per user
 */

// Apply authentication middleware to all AI agent routes
router.use(authenticate);

// Product Definer Agent Routes
router.post(
  '/product-definer/start',
  aiAgentsController.startProductDefinerConversation
);

router.post(
  '/product-definer/message',
  aiAgentsController.sendProductDefinerMessage
);

router.post(
  '/product-definer/complete',
  aiAgentsController.completeProductDefinerConversation
);

router.get(
  '/product-definer/status/:conversationId',
  aiAgentsController.getProductDefinerStatus
);

// Campaign Advisor Agent Routes
router.post(
  '/campaign-advisor/start',
  aiAgentsController.startCampaignAdvisorConversation
);

router.post(
  '/campaign-advisor/message',
  aiAgentsController.sendCampaignAdvisorMessage
);

router.post(
  '/campaign-advisor/complete',
  aiAgentsController.completeCampaignAdvisorConversation
);

router.get(
  '/campaign-advisor/status/:conversationId',
  aiAgentsController.getCampaignAdvisorStatus
);

// Content Generator Agent Routes
router.post(
  '/content-generator/ad-copy',
  aiAgentsController.generateAdCopy
);

router.post(
  '/content-generator/social-posts',
  aiAgentsController.generateSocialPosts
);

router.post(
  '/content-generator/landing-page',
  aiAgentsController.generateLandingPage
);

router.post(
  '/content-generator/image-prompts',
  aiAgentsController.generateImagePrompts
);

router.post(
  '/content-generator/regenerate',
  aiAgentsController.regenerateContent
);

// Performance Analyzer Agent Routes
router.post(
  '/performance-analyzer/analyze',
  aiAgentsController.analyzeCampaignPerformance
);

router.post(
  '/performance-analyzer/optimize',
  aiAgentsController.getOptimizationRecommendations
);

router.post(
  '/performance-analyzer/compare',
  aiAgentsController.compareMultipleCampaigns
);

router.post(
  '/performance-analyzer/summary',
  aiAgentsController.getExecutiveSummary
);

// AI Conversation Management Routes
router.get(
  '/conversations',
  aiAgentsController.listAIConversations
);

router.get(
  '/conversations/:conversationId',
  aiAgentsController.getAIConversation
);

router.delete(
  '/conversations/:conversationId',
  aiAgentsController.deleteAIConversation
);

export default router;
