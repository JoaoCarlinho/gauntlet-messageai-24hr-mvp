import { Router } from 'express';
import * as aiAgentsController from '../controllers/aiAgents.controller';

const router = Router();

/**
 * Public Routes
 *
 * These routes are publicly accessible (NO AUTHENTICATION REQUIRED)
 * Used for prospect-facing features like the Discovery Bot
 */

// Discovery Bot Public Routes
router.post(
  '/discovery/start',
  aiAgentsController.startPublicDiscoverySession
);

router.post(
  '/discovery/message',
  aiAgentsController.sendPublicDiscoveryMessage
);

router.post(
  '/discovery/complete',
  aiAgentsController.completePublicDiscoverySession
);

export default router;
