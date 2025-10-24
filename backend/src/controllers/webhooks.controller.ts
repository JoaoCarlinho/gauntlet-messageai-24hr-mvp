import { Request, Response } from 'express';
import { webhookService } from '../services/webhooks.service';

/**
 * Webhook Controller
 * Handles webhook endpoints for social media platforms
 */

interface WebhookRequest extends Request {
  rawBody?: Buffer;
}

/**
 * Facebook webhook verification endpoint (GET)
 * Facebook requires this for webhook setup
 */
export const facebookWebhookVerification = async (req: Request, res: Response) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Facebook webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.error('Facebook webhook verification failed');
      res.status(403).json({ error: 'Forbidden' });
    }
  } catch (error) {
    console.error('Error in Facebook webhook verification:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Facebook webhook endpoint (POST)
 * Receives lead generation webhooks from Facebook
 */
export const facebookWebhook = async (req: WebhookRequest, res: Response) => {
  try {
    console.log('Received Facebook webhook:', JSON.stringify(req.body, null, 2));

    // Log webhook attempt
    await webhookService.logWebhook('facebook', 'lead_generation', req.body);

    // Process the webhook payload
    const leadData = await webhookService.processFacebookLeadWebhook(req.body);

    if (leadData) {
      // Check for duplicates
      const exists = await webhookService.checkLeadExists(leadData.leadId, 'facebook');
      
      if (!exists) {
        // Queue for processing
        await webhookService.queueLeadProcessing(leadData);
        console.log(`Facebook lead queued for processing: ${leadData.leadId}`);
      } else {
        console.log(`Facebook lead already exists, skipping: ${leadData.leadId}`);
      }
    }

    // Always respond with 200 OK to acknowledge receipt
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error processing Facebook webhook:', error);
    // Still respond with 200 to prevent Facebook from retrying
    res.status(200).json({ status: 'error', message: 'Processing failed' });
  }
};

/**
 * LinkedIn webhook endpoint (POST)
 * Receives lead generation webhooks from LinkedIn
 */
export const linkedinWebhook = async (req: WebhookRequest, res: Response) => {
  try {
    console.log('Received LinkedIn webhook:', JSON.stringify(req.body, null, 2));

    // Log webhook attempt
    await webhookService.logWebhook('linkedin', 'lead_generation', req.body);

    // Process the webhook payload
    const leadData = await webhookService.processLinkedInLeadWebhook(req.body);

    if (leadData) {
      // Check for duplicates
      const exists = await webhookService.checkLeadExists(leadData.leadId, 'linkedin');
      
      if (!exists) {
        // Queue for processing
        await webhookService.queueLeadProcessing(leadData);
        console.log(`LinkedIn lead queued for processing: ${leadData.leadId}`);
      } else {
        console.log(`LinkedIn lead already exists, skipping: ${leadData.leadId}`);
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error processing LinkedIn webhook:', error);
    res.status(200).json({ status: 'error', message: 'Processing failed' });
  }
};

/**
 * TikTok webhook endpoint (POST)
 * Receives lead generation webhooks from TikTok
 */
export const tiktokWebhook = async (req: WebhookRequest, res: Response) => {
  try {
    console.log('Received TikTok webhook:', JSON.stringify(req.body, null, 2));

    // Log webhook attempt
    await webhookService.logWebhook('tiktok', 'lead_generation', req.body);

    // Process the webhook payload
    const leadData = await webhookService.processTikTokLeadWebhook(req.body);

    if (leadData) {
      // Check for duplicates
      const exists = await webhookService.checkLeadExists(leadData.leadId, 'tiktok');
      
      if (!exists) {
        // Queue for processing
        await webhookService.queueLeadProcessing(leadData);
        console.log(`TikTok lead queued for processing: ${leadData.leadId}`);
      } else {
        console.log(`TikTok lead already exists, skipping: ${leadData.leadId}`);
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error processing TikTok webhook:', error);
    res.status(200).json({ status: 'error', message: 'Processing failed' });
  }
};

/**
 * X (Twitter) webhook endpoint (POST)
 * Receives webhooks from X (Twitter)
 */
export const xWebhook = async (req: WebhookRequest, res: Response) => {
  try {
    console.log('Received X webhook:', JSON.stringify(req.body, null, 2));

    // Log webhook attempt
    await webhookService.logWebhook('x', 'engagement', req.body);

    // Process the webhook payload
    const leadData = await webhookService.processXWebhook(req.body);

    if (leadData) {
      // Check for duplicates
      const exists = await webhookService.checkLeadExists(leadData.leadId, 'x');
      
      if (!exists) {
        // Queue for processing
        await webhookService.queueLeadProcessing(leadData);
        console.log(`X lead queued for processing: ${leadData.leadId}`);
      } else {
        console.log(`X lead already exists, skipping: ${leadData.leadId}`);
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error processing X webhook:', error);
    res.status(200).json({ status: 'error', message: 'Processing failed' });
  }
};

/**
 * Health check endpoint for webhooks
 */
export const webhookHealthCheck = async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      endpoints: {
        facebook: '/api/v1/webhooks/facebook',
        linkedin: '/api/v1/webhooks/linkedin',
        tiktok: '/api/v1/webhooks/tiktok',
        x: '/api/v1/webhooks/x'
      }
    });
  } catch (error) {
    console.error('Error in webhook health check:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
