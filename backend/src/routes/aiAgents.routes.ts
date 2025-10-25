import { Router } from 'express';
import * as aiAgentsController from '../controllers/aiAgents.controller';

const router = Router();

/**
 * AI Agents Routes
 *
 * All routes require authentication and team access
 * Rate limited to 100 requests/hour per user
 */

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

// Future agent routes will be added here:
// - Content Generator routes
// - Discovery Bot routes
// - Performance Analyzer routes

export default router;
