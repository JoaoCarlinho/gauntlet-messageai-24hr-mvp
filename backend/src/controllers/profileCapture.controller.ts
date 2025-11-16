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
import { LinkedInVerificationService } from '../services/linkedinVerification.service';
import { LinkedInConnectionService } from '../services/linkedinConnection.service';
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
  // Enhanced scraping options
  autoConnect?: boolean; // Auto-connect with LinkedIn profiles
  captureScreenshot?: boolean; // Capture and upload screenshot (default true)
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
      autoConnect = false,
      captureScreenshot = true,
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

      // Use enhanced scraping for complete profile data
      const { profile: enhancedProfile, connectionResult } =
        await advancedScraperService.scrapeLinkedInProfileEnhanced(profileUrl, {
          userId: req.user.id,
          email: linkedInEmail,
          password: linkedInPassword,
          headless: true,
          timeout: 30000,
          autoConnect,
          captureScreenshot,
        });

      // Check connection rate limits if auto-connect is enabled
      if (autoConnect && linkedInEmail) {
        const connectionRateLimit = await LinkedInConnectionService.canMakeConnectionRequest(linkedInEmail);
        if (!connectionRateLimit.allowed) {
          console.warn(`[Profile Capture] Connection rate limit exceeded: ${connectionRateLimit.reason}`);
        }
      }

      // Log connection request if attempted
      if (connectionResult && linkedInEmail) {
        await LinkedInConnectionService.logConnectionRequest(
          req.user.id,
          linkedInEmail,
          profileUrl,
          enhancedProfile.name,
          enhancedProfile.headline,
          connectionResult.action === 'connected' ? connectionResult.message : undefined,
          connectionResult.success ? 'sent' : 'failed',
          connectionResult.error
        );

        // Increment connection counter if successful
        if (connectionResult.success && connectionResult.action === 'connected') {
          await LinkedInConnectionService.incrementConnectionRequest(linkedInEmail);
        }
      }

      // Convert enhanced profile to legacy format for compatibility
      profileData = {
        name: enhancedProfile.name,
        title: enhancedProfile.headline,
        company: enhancedProfile.experience[0]?.company || '',
        location: enhancedProfile.location,
        bio: enhancedProfile.about,
        profileUrl: enhancedProfile.profileUrl,
        platform: 'linkedin' as const,
        additionalData: {
          enhancedProfile, // Store complete profile data
          connectionResult,
        },
      };
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

    // Extract enhanced profile data if available
    const enhancedProfile = profileData.additionalData?.enhancedProfile;
    const connectionResult = profileData.additionalData?.connectionResult;

    // Create lead in database with enhanced data
    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        jobTitle: profileData.title || '',
        company: profileData.company || '',
        source: `manual_${platform}${useFacebookGraphAPI ? '_graph_api' : ''}${useLinkedInAuth ? '_auth' : ''}`,
        status: 'new',
        teamId: resolvedTeamId,
        // Store comprehensive profile data in rawData
        rawData: {
          platform: profileData.platform,
          capturedAt: new Date().toISOString(),
          captureMethod: useFacebookGraphAPI ? 'graph_api' : useLinkedInAuth ? 'enhanced_authenticated_scraping' : 'puppeteer_scraping',
          bio: profileData.bio || '',
          location: profileData.location || '',
          profileUrl: profileData.profileUrl,
          // Enhanced LinkedIn data
          ...(enhancedProfile && {
            experience: enhancedProfile.experience,
            education: enhancedProfile.education,
            certifications: enhancedProfile.certifications,
            contactInfo: enhancedProfile.contactInfo,
            screenshotUrl: enhancedProfile.screenshotUrl,
            dataCompleteness: enhancedProfile.dataCompleteness,
            missingFields: enhancedProfile.missingFields,
          }),
          // Connection result
          ...(connectionResult && {
            connectionStatus: connectionResult.action,
            connectionMessage: connectionResult.message,
            connectionError: connectionResult.error,
          }),
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
        // Include enhanced data summary
        ...(enhancedProfile && {
          dataCompleteness: enhancedProfile.dataCompleteness,
          screenshotUrl: enhancedProfile.screenshotUrl,
          experienceCount: enhancedProfile.experience.length,
          educationCount: enhancedProfile.education.length,
          certificationsCount: enhancedProfile.certifications.length,
          hasContactInfo: !!(enhancedProfile.contactInfo.email || enhancedProfile.contactInfo.phone),
        }),
        // Include connection result
        ...(connectionResult && {
          connectionStatus: connectionResult.action,
          connectionSuccess: connectionResult.success,
        }),
      },
      message: enhancedProfile?.dataCompleteness.needsManualReview
        ? 'Profile captured with partial data - manual review recommended'
        : 'Profile captured successfully',
    });
  } catch (error) {
    console.error('Profile capture error:', error);

    // Handle LinkedIn-specific errors with structured responses
    if (error instanceof LinkedInAuthError) {
      const errorResponse = errorToResponse(error);

      // For email verification, include the session ID
      if (error.code === 'EMAIL_VERIFICATION_REQUIRED') {
        return res.status(202).json({
          ...errorResponse,
          verificationSessionId: (error as any).verificationSessionId,
        });
      }

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
      (r: any) => new Date(r.requestTime).getTime() > oneHourAgo
    ).length;

    const requestsToday = recentRequests.filter(
      (r: any) => new Date(r.requestTime).getTime() > oneDayAgo
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
        isActive: health.isActive,
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

/**
 * POST /api/linkedin/submit-verification-code
 * Submit email verification code to complete LinkedIn authentication
 */
export async function submitLinkedInVerificationCode(req: Request, res: Response) {
  try {
    // Validate authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { verificationSessionId, verificationCode } = req.body;

    // Validate input
    if (!verificationSessionId || !verificationCode) {
      return res.status(400).json({
        success: false,
        error: 'Verification session ID and code are required',
      });
    }

    // Verify that the session belongs to the user
    const session = await LinkedInVerificationService.getVerificationSession(verificationSessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Verification session not found or expired',
      });
    }

    if (session.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to verification session',
      });
    }

    // Submit verification code
    const result = await advancedScraperService.submitVerificationCode(
      verificationSessionId,
      verificationCode
    );

    if (result.success) {
      return res.json({
        success: true,
        message: 'Verification successful - you can now continue with profile scraping',
      });
    } else {
      // Get updated session to check remaining attempts
      const updatedSession = await LinkedInVerificationService.getVerificationSession(verificationSessionId);

      return res.status(400).json({
        success: false,
        error: result.error || 'Verification failed',
        attemptsRemaining: updatedSession?.attemptsRemaining || 0,
      });
    }
  } catch (error) {
    console.error('Verification code submission error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit verification code',
    });
  }
}

/**
 * GET /api/linkedin/verification-status/:sessionId
 * Check the status of a verification session
 */
export async function getVerificationStatus(req: Request, res: Response) {
  try {
    // Validate authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
    }

    // Get session
    const session = await LinkedInVerificationService.getVerificationSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Verification session not found or expired',
      });
    }

    // Verify ownership
    if (session.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to verification session',
      });
    }

    return res.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        attemptsRemaining: session.attemptsRemaining,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    console.error('Verification status check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check verification status',
    });
  }
}
