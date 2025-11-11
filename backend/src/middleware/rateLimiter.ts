import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate Limiting Middleware
 * Prevents API abuse and ensures fair usage
 */

// Default rate limiter - 100 requests per 15 minutes
export const defaultRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});

// Strict rate limiter for auth endpoints - 5 requests per 15 minutes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true
});

// Enrichment rate limiter - 10 requests per minute
export const enrichmentRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Enrichment rate limit exceeded. Please slow down.',
  keyGenerator: (req: Request): string => {
    return req.user?.teamId || req.ip || 'unknown';
  }
});

// Export rate limiter - 5 exports per hour
export const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Export rate limit exceeded. Maximum 5 exports per hour.'
});

// Create custom rate limiter
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false
  });
};

export default {
  defaultRateLimiter,
  authRateLimiter,
  enrichmentRateLimiter,
  exportRateLimiter,
  createRateLimiter
};