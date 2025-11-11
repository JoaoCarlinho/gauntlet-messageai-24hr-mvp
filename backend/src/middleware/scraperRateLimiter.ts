/**
 * Scraper Rate Limiter Middleware
 *
 * Rate limiting for web scraping endpoints to comply with platform ToS
 * and prevent abuse
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiter for LinkedIn scraping
 * More conservative due to LinkedIn's strict policies
 */
export const linkedInScraperLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many LinkedIn profile scraping requests. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the LinkedIn scraping rate limit. Please try again in 15 minutes.',
      retryAfter: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  },
});

/**
 * Rate limiter for Facebook scraping
 * Slightly more lenient than LinkedIn
 */
export const facebookScraperLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per windowMs
  message: {
    error: 'Too many Facebook profile scraping requests. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the Facebook scraping rate limit. Please try again in 15 minutes.',
      retryAfter: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  },
});

/**
 * General rate limiter for all profile capture endpoints
 * Applies regardless of platform
 */
export const profileCaptureLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 requests per hour across all platforms
  message: {
    error: 'Too many profile capture requests. Please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the hourly profile capture limit. Please try again in 1 hour.',
      retryAfter: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  },
});

/**
 * Graph API rate limiter (more generous since it's official API)
 */
export const graphAPILimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many Graph API requests. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
