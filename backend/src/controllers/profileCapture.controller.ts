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
import { prisma } from '../config/database';
import advancedScraperService from '../services/advancedScraper.service';

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
      profileData = await advancedScraperService.scrapeLinkedInProfile(profileUrl, {
        useAuthentication: useLinkedInAuth,
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

    // Create lead in database
    const lead = await prisma.lead.create({
      data: {
        name: profileData.name,
        title: profileData.title || '',
        company: profileData.company || '',
        location: profileData.location || '',
        profileUrl: profileData.profileUrl,
        source: `manual_${platform}${useFacebookGraphAPI ? '_graph_api' : ''}${useLinkedInAuth ? '_auth' : ''}`,
        status: 'new',
        // Add teamId if provided
        ...(teamId && { teamId }),
        // Add metadata
        metadata: {
          platform: profileData.platform,
          capturedAt: new Date().toISOString(),
          captureMethod: useFacebookGraphAPI ? 'graph_api' : useLinkedInAuth ? 'authenticated_scraping' : 'puppeteer_scraping',
          bio: profileData.bio || '',
          ...(profileData.additionalData && { additionalData: profileData.additionalData }),
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
        name: lead.name,
        title: lead.title,
        company: lead.company,
        platform: profileData.platform,
      },
      message: 'Profile captured successfully',
    });
  } catch (error) {
    console.error('Profile capture error:', error);

    if (error instanceof Error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: 'Failed to capture profile',
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

    // Check if lead with this profile URL already exists
    const existingLead = await prisma.lead.findFirst({
      where: {
        profileUrl,
      },
      select: {
        id: true,
        name: true,
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
