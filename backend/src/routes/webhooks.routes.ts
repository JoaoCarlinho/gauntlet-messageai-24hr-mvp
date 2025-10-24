import { Router } from 'express';
import { 
  facebookWebhookVerification,
  facebookWebhook,
  linkedinWebhook,
  tiktokWebhook,
  xWebhook,
  webhookHealthCheck
} from '../controllers/webhooks.controller';
import { 
  verifyFacebookSignature,
  verifyLinkedInSignature,
  verifyTikTokSignature,
  verifyXSignature,
  logWebhookAttempt
} from '../middleware/webhookVerification';

/**
 * Webhook Routes
 * Public routes for receiving webhooks from social media platforms
 * No authentication required - webhooks are verified via signatures
 */

const router = Router();

// Raw body parser middleware for webhook signature verification
const rawBodyParser = (req: any, res: any, next: any) => {
  if (req.get('content-type')?.includes('application/json')) {
    let data = '';
    req.setEncoding('utf8');
    
    req.on('data', (chunk: string) => {
      data += chunk;
    });
    
    req.on('end', () => {
      req.rawBody = Buffer.from(data, 'utf8');
      try {
        req.body = JSON.parse(data);
      } catch (error) {
        console.error('Error parsing JSON body:', error);
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
};

// Apply raw body parser to all webhook routes
router.use(rawBodyParser);

// Apply webhook attempt logging to all routes
router.use(logWebhookAttempt);

/**
 * Facebook Webhook Routes
 */
// GET endpoint for webhook verification (Facebook requires this)
router.get('/facebook', facebookWebhookVerification);

// POST endpoint for receiving Facebook webhooks
router.post('/facebook', verifyFacebookSignature, facebookWebhook);

/**
 * LinkedIn Webhook Routes
 */
router.post('/linkedin', verifyLinkedInSignature, linkedinWebhook);

/**
 * TikTok Webhook Routes
 */
router.post('/tiktok', verifyTikTokSignature, tiktokWebhook);

/**
 * X (Twitter) Webhook Routes
 */
router.post('/x', verifyXSignature, xWebhook);

/**
 * Health Check Route
 */
router.get('/health', webhookHealthCheck);

export default router;
