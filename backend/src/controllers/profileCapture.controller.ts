/**
 * Profile Capture Controller
 *
 * Handles manual lead capture from LinkedIn and Facebook profile URLs
 * Scrapes profile information and creates leads automatically
 *
 * Production features:
 * - Puppeteer/Playwright for JavaScript-rendered content
 * - Anti-detection measures (rotating proxies, user agents)
 * - Rate limiting for ToS compliance
 * - Facebook Graph API integration
 * - LinkedIn authentication support
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import advancedScraperService from '../services/advancedScraper.service';
import { LinkedInAccountManager } from '../services/linkedinAccountManager.service';
import { LinkedInAuthError, errorToResponse } from '../types/linkedin-errors';

interface CaptureProfileRequest {
  profileUrl: string;
  platform: 'linkedin' | 'facebook';
  teamId?: string; // Optional - can be inferred from auth
  icpId?: string; // Optional - for ICP matching
  // Advanced options
  useLinkedInAuth?: boolean;
  linkedInEmail?: string;
  linkedInPassword?: string;
  useFacebookGraphAPI?: boolean;
  facebookAccessToken?: string;
}

// Legacy functions removed - now using advancedScraperService

/**
 * POST /api/discovery-bot/capture-profile
 * Capture profile from LinkedIn or Facebook and create lead
 *
 * Now supports:
 * - Advanced scraping with Puppeteer
 * - LinkedIn authentication
 * - Facebook Graph API
 */
export async function captureProfile(req: Request, res: Response) {
  try {
    const {
      profileUrl,
      platform,
      teamId,
      icpId,
      useLinkedInAuth,
      linkedInEmail,
      linkedInPassword,
      useFacebookGraphAPI,
      facebookAccessToken,
    }: CaptureProfileRequest = req.body;

    // Get teamId from authenticated user if not provided in request
    const resolvedTeamId = teamId || req.user?.teamId;

    // Validate authentication and teamId
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!resolvedTeamId) {
      return res.status(400).json({
        error: 'Team ID is required. Please ensure your user is associated with a team.',
      });
    }

    // Validate input
    if (!profileUrl || !platform) {
      return res.status(400).json({
        error: 'Profile URL and platform are required',
      });
    }

    // Validate platform
    if (platform !== 'linkedin' && platform !== 'facebook') {
      return res.status(400).json({
        error: 'Platform must be either "linkedin" or "facebook"',
      });
    }

    // Validate LinkedIn auth requirements
    if (useLinkedInAuth && (!linkedInEmail || !linkedInPassword)) {
      return res.status(400).json({
        error: 'LinkedIn email and password are required when authentication is enabled',
      });
    }

    // Validate Facebook Graph API requirements
    if (useFacebookGraphAPI && !facebookAccessToken) {
      return res.status(400).json({
        error: 'Facebook access token is required when using Graph API',
      });
    }

    let profileData;

    // Scrape profile based on platform and options
    if (platform === 'linkedin') {
      // Store credentials if LinkedIn authentication is enabled
      if (useLinkedInAuth && linkedInEmail && linkedInPassword) {
        await LinkedInAccountManager.storeCredentials(
          req.user.id,
          linkedInEmail,
          linkedInPassword
        );
      }

      // Check rate limits before scraping
      const rateLimitCheck = await LinkedInAccountManager.canMakeRequest(req.user.id);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: rateLimitCheck.reason || 'Rate limit exceeded',
            retryable: true,
            retryAfterMs: rateLimitCheck.waitTimeMs,
            userAction: `Please wait ${Math.ceil((rateLimitCheck.waitTimeMs || 0) / 1000)} seconds before trying again.`,
          },
        });
      }

      profileData = await advancedScraperService.scrapeLinkedInProfile(profileUrl, {
        userId: req.user.id,
        email: linkedInEmail,
        password: linkedInPassword,
        headless: true,
        timeout: 30000,
      });
    } else if (platform === 'facebook') {
      if (useFacebookGraphAPI) {
        // Use Facebook Graph API
        const profileId = advancedScraperService.extractFacebookProfileId(profileUrl);
        profileData = await advancedScraperService.fetchFacebookProfileViaGraphAPI(profileId, {
          accessToken: facebookAccessToken!,
          fields: ['id', 'name', 'work', 'location', 'about', 'email'],
        });
      } else {
        // Use Puppeteer scraping
        profileData = await advancedScraperService.scrapeFacebookProfile(profileUrl, {
          headless: true,
          timeout: 30000,
        });
      }
    }

    if (!profileData) {
      return res.status(500).json({
        error: 'Failed to retrieve profile data',
      });
    }

    // Parse name into first and last name
    const nameParts = profileData.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create lead in database
    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        jobTitle: profileData.title || '',
        company: profileData.company || '',
        source: `manual_${platform}${useFacebookGraphAPI ? '_graph_api' : ''}${useLinkedInAuth ? '_auth' : ''}`,
        status: 'new',
        teamId: resolvedTeamId,
        // Store additional profile data in rawData
        rawData: {
          platform: profileData.platform,
          capturedAt: new Date().toISOString(),
          captureMethod: useFacebookGraphAPI ? 'graph_api' : useLinkedInAuth ? 'authenticated_scraping' : 'puppeteer_scraping',
          bio: profileData.bio || '',
          location: profileData.location || '',
          profileUrl: profileData.profileUrl,
          ...(profileData.additionalData && { additionalData: profileData.additionalData }),
        },
        // Store social profile URLs
        socialProfiles: {
          [platform]: profileData.profileUrl,
        },
      },
    });

    // If ICP ID provided, perform ICP matching/scoring
    if (icpId) {
      // TODO: Implement ICP scoring logic
      // This would involve:
      // 1. Load ICP embedding from database
      // 2. Generate embedding for lead
      // 3. Calculate similarity score
      // 4. Update lead with ICP match score
    }

    return res.status(201).json({
      success: true,
      lead: {
        id: lead.id,
        name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
        firstName: lead.firstName,
        lastName: lead.lastName,
        jobTitle: lead.jobTitle,
        company: lead.company,
        platform: profileData.platform,
      },
      message: 'Profile captured successfully',
    });
  } catch (error) {
    console.error('Profile capture error:', error);

    // Handle LinkedIn-specific errors with structured responses
    if (error instanceof LinkedInAuthError) {
      const errorResponse = errorToResponse(error);

      // Map error codes to HTTP status codes
      const statusCode = (() => {
        switch (error.code) {
          case 'RATE_LIMIT_EXCEEDED':
            return 429;
          case 'CHECKPOINT_REQUIRED':
          case 'ACCOUNT_ON_COOLDOWN':
            return 403;
          case 'NO_CREDENTIALS':
          case 'LOGIN_FAILED':
            return 401;
          case 'SESSION_EXPIRED':
            return 401;
          default:
            return 500;
        }
      })();

      return res.status(statusCode).json(errorResponse);
    }

    if (error instanceof Error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SCRAPING_FAILED',
          message: error.message,
          retryable: true,
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to capture profile',
        retryable: false,
      },
    });
  } finally {
    // Clean up browser instance
    await advancedScraperService.closeBrowser();
  }
}

/**
 * GET /api/discovery-bot/capture-profile/status
 * Check if profile URL has already been captured
 */
export async function checkProfileStatus(req: Request, res: Response) {
  try {
    const { profileUrl } = req.query;

    if (!profileUrl || typeof profileUrl !== 'string') {
      return res.status(400).json({
        error: 'Profile URL is required',
      });
    }

    // Check if lead with this profile URL already exists in socialProfiles JSON field
    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          {
            socialProfiles: {
              path: ['linkedin'],
              equals: profileUrl,
            },
          },
          {
            socialProfiles: {
              path: ['facebook'],
              equals: profileUrl,
            },
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        status: true,
      },
    });

    if (existingLead) {
      return res.json({
        exists: true,
        lead: existingLead,
        message: 'This profile has already been captured',
      });
    }

    return res.json({
      exists: false,
      message: 'Profile not yet captured',
    });
  } catch (error) {
    console.error('Profile status check error:', error);
    return res.status(500).json({
      error: 'Failed to check profile status',
    });
  }
}

/**
 * GET /api/linkedin/rate-limits
 * Get current rate limit status and usage statistics
 */
export async function getLinkedInRateLimits(req: Request, res: Response) {
  try {
    // Validate authentication
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const userId = req.user.id;

    // Check if user can make a request (this includes rate limit checks)
    const rateLimitCheck = await LinkedInAccountManager.canMakeRequest(userId);

    // Get recent request history
    const recentRequests = await LinkedInAccountManager.getRequestHistory(userId, 24);

    // Calculate hourly and daily usage
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    const requestsLastHour = recentRequests.filter(
      (r) => new Date(r.requestedAt).getTime() > oneHourAgo
    ).length;

    const requestsToday = recentRequests.filter(
      (r) => new Date(r.requestedAt).getTime() > oneDayAgo
    ).length;

    return res.json({
      success: true,
      rateLimits: {
        allowed: rateLimitCheck.allowed,
        reason: rateLimitCheck.reason,
        waitTimeMs: rateLimitCheck.waitTimeMs,
        usage: {
          lastHour: requestsLastHour,
          maxPerHour: 20,
          today: requestsToday,
          maxPerDay: 100,
        },
        nextAvailable: rateLimitCheck.waitTimeMs
          ? new Date(now + rateLimitCheck.waitTimeMs).toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error('Rate limit fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch rate limit information',
    });
  }
}

/**
 * GET /api/linkedin/account-health
 * Get LinkedIn account health metrics
 */
export async function getLinkedInAccountHealth(req: Request, res: Response) {
  try {
    // Validate authentication
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const userId = req.user.id;

    // Get account health data
    const health = await LinkedInAccountManager.getAccountHealth(userId);

    if (!health) {
      return res.json({
        success: true,
        health: {
          hasCredentials: false,
          message: 'No LinkedIn credentials stored',
        },
      });
    }

    // Get credentials for additional context
    const credentials = await LinkedInAccountManager.getCredentials(userId);

    return res.json({
      success: true,
      health: {
        hasCredentials: !!credentials,
        isActive: credentials?.isActive || false,
        accountStatus: health.isOnCooldown ? 'cooldown' : 'active',
        metrics: {
          totalRequests: health.totalRequests,
          successfulRequests: health.successfulRequests,
          failedRequests: health.failedRequests,
          consecutiveFailures: health.consecutiveFailures,
          successRate:
            health.totalRequests > 0
              ? Math.round((health.successfulRequests / health.totalRequests) * 100)
              : 0,
        },
        cooldown: health.isOnCooldown
          ? {
              active: true,
              until: health.cooldownUntil,
              reason: 'Account temporarily paused due to consecutive failures',
            }
          : {
              active: false,
            },
        lastActivity: {
          lastRequestAt: health.lastRequestAt,
          lastSuccessAt: health.lastSuccessAt,
          lastFailureAt: health.lastFailureAt,
        },
        timestamps: {
          createdAt: health.createdAt,
          updatedAt: health.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Account health fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch account health information',
    });
  }
}
