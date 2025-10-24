import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Webhook Verification Middleware
 * Verifies webhook signatures from social media platforms to ensure authenticity
 */

interface WebhookRequest extends Request {
  rawBody?: Buffer;
}

/**
 * Verify Facebook webhook signature
 * Facebook uses HMAC SHA256 with the app secret
 */
export const verifyFacebookSignature = (req: WebhookRequest, res: Response, next: NextFunction) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!signature || !appSecret) {
    console.error('Facebook webhook verification failed: Missing signature or app secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.rawBody) {
    console.error('Facebook webhook verification failed: Missing raw body');
    return res.status(400).json({ error: 'Bad Request' });
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.error('Facebook webhook verification failed: Invalid signature');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Facebook webhook signature verified successfully');
  next();
};

/**
 * Verify LinkedIn webhook signature
 * LinkedIn uses HMAC SHA256 with the client secret
 */
export const verifyLinkedInSignature = (req: WebhookRequest, res: Response, next: NextFunction) => {
  const signature = req.headers['x-linkedin-signature'] as string;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!signature || !clientSecret) {
    console.error('LinkedIn webhook verification failed: Missing signature or client secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.rawBody) {
    console.error('LinkedIn webhook verification failed: Missing raw body');
    return res.status(400).json({ error: 'Bad Request' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', clientSecret)
    .update(req.rawBody)
    .digest('base64');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.error('LinkedIn webhook verification failed: Invalid signature');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('LinkedIn webhook signature verified successfully');
  next();
};

/**
 * Verify TikTok webhook signature
 * TikTok uses HMAC SHA256 with the app secret
 */
export const verifyTikTokSignature = (req: WebhookRequest, res: Response, next: NextFunction) => {
  const signature = req.headers['x-tiktok-signature'] as string;
  const appSecret = process.env.TIKTOK_APP_SECRET;

  if (!signature || !appSecret) {
    console.error('TikTok webhook verification failed: Missing signature or app secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.rawBody) {
    console.error('TikTok webhook verification failed: Missing raw body');
    return res.status(400).json({ error: 'Bad Request' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.error('TikTok webhook verification failed: Invalid signature');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('TikTok webhook signature verified successfully');
  next();
};

/**
 * Verify X (Twitter) webhook signature
 * X uses HMAC SHA256 with the consumer secret
 */
export const verifyXSignature = (req: WebhookRequest, res: Response, next: NextFunction) => {
  const signature = req.headers['x-twitter-webhooks-signature'] as string;
  const consumerSecret = process.env.X_API_SECRET;

  if (!signature || !consumerSecret) {
    console.error('X webhook verification failed: Missing signature or consumer secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.rawBody) {
    console.error('X webhook verification failed: Missing raw body');
    return res.status(400).json({ error: 'Bad Request' });
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', consumerSecret)
    .update(req.rawBody)
    .digest('base64');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.error('X webhook verification failed: Invalid signature');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('X webhook signature verified successfully');
  next();
};

/**
 * Generic webhook verification middleware factory
 * Returns appropriate verification function based on platform
 */
export const createWebhookVerification = (platform: 'facebook' | 'linkedin' | 'tiktok' | 'x') => {
  const verifiers = {
    facebook: verifyFacebookSignature,
    linkedin: verifyLinkedInSignature,
    tiktok: verifyTikTokSignature,
    x: verifyXSignature
  };

  return verifiers[platform];
};

/**
 * Log all webhook attempts for security auditing
 */
export const logWebhookAttempt = (req: Request, res: Response, next: NextFunction) => {
  const platform = req.path.split('/').pop();
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  console.log(`Webhook attempt - Platform: ${platform}, IP: ${ip}, User-Agent: ${userAgent}, Timestamp: ${timestamp}`);

  next();
};
