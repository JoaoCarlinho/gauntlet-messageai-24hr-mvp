/**
 * Advanced Scraper Service
 *
 * Production-ready web scraping service with:
 * - Puppeteer for JavaScript-rendered content
 * - Anti-detection measures (stealth plugin, user agent rotation)
 * - Support for authenticated and unauthenticated scraping
 * - Facebook Graph API integration
 * - LinkedIn session management and rate limiting
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import { LinkedInSessionManager } from './linkedinSessionManager.service';
import { LinkedInAccountManager } from './linkedinAccountManager.service';
import { LinkedInVerificationService } from './linkedinVerification.service';
import { HumanBehaviorSimulator } from '../utils/human-behavior.util';
import { BROWSER_ARGS, getRandomViewport, getRandomUserAgent } from '../config/puppeteer-stealth.config';
import { LinkedInErrors } from '../types/linkedin-errors';
import { LinkedInLogger } from '../utils/linkedin-logger.util';
import { hashEmail } from '../utils/encryption.util';

// Add stealth plugin to avoid detection
puppeteerExtra.use(StealthPlugin());

export interface ScrapedProfile {
  name: string;
  title?: string;
  company?: string;
  location?: string;
  bio?: string;
  profileUrl: string;
  platform: 'linkedin' | 'facebook';
  additionalData?: Record<string, any>;
}

export interface ScraperOptions {
  useAuthentication?: boolean;
  email?: string;
  password?: string;
  headless?: boolean;
  timeout?: number;
  userId?: string; // Required for rate limiting and session management
}

export interface FacebookGraphAPIOptions {
  accessToken: string;
  fields?: string[];
}

class AdvancedScraperService {
  private browser: Browser | null = null;
  private verificationPages: Map<string, Page> = new Map(); // Store pages waiting for verification

  /**
   * Initialize browser instance with enhanced anti-detection
   */
  private async initBrowser(headless: boolean = true): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    this.browser = await puppeteerExtra.launch({
      headless: headless,
      args: BROWSER_ARGS,
    });

    return this.browser;
  }

  /**
   * Create stealth page with randomized fingerprinting
   */
  private async createStealthPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage();

    // Set random user agent and viewport
    const userAgent = getRandomUserAgent();
    const viewport = getRandomViewport();

    await page.setUserAgent(userAgent);
    await page.setViewport(viewport);

    // Enhanced anti-detection measures
    await page.evaluateOnNewDocument(() => {
      // @ts-ignore - Running in browser context
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // @ts-ignore - Running in browser context
      // Randomize plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // @ts-ignore - Running in browser context
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      // @ts-ignore - Running in browser context
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          // @ts-ignore - Running in browser context
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);

      // @ts-ignore - Running in browser context
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    // Add realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    return page;
  }

  /**
   * Scrape LinkedIn profile with authentication, rate limiting, and session management
   */
  async scrapeLinkedInProfile(
    profileUrl: string,
    options: ScraperOptions = {}
  ): Promise<ScrapedProfile> {
    const startTime = Date.now();
    const { userId, email, password } = options;

    // Validate required parameters
    if (!userId || !email || !password) {
      throw LinkedInErrors.NO_CREDENTIALS();
    }

    // Check rate limits BEFORE scraping
    const rateLimitCheck = await LinkedInAccountManager.canMakeRequest(userId);
    if (!rateLimitCheck.allowed) {
      throw LinkedInErrors.RATE_LIMIT_EXCEEDED(
        rateLimitCheck.waitTimeMs || 0,
        rateLimitCheck.reason || 'Rate limit exceeded'
      );
    }

    const browser = await this.initBrowser(options.headless !== false);
    const page = await this.createStealthPage(browser);
    const emailHash = hashEmail(email);

    let sessionType: 'cached' | 'fresh' = 'cached';

    try {
      // Try to load existing session
      const existingSession = await LinkedInSessionManager.loadSession(email);

      if (existingSession) {
        console.log('[LinkedIn] Reusing cached session');
        LinkedInLogger.logSessionAction('reused', emailHash);

        // Set cookies from cached session
        await page.setCookie(...existingSession.cookies);
        await page.setUserAgent(existingSession.userAgent);
      } else {
        console.log('[LinkedIn] No cached session, performing login');
        sessionType = 'fresh';

        // Perform login and save session
        await this.loginToLinkedIn(page, email, password, userId);

        // Save session after successful login
        const credentialRecord = await LinkedInAccountManager.getCredentials(userId);
        if (credentialRecord) {
          await LinkedInSessionManager.saveSession(page, email, credentialRecord.credentialId);
          LinkedInLogger.logSessionAction('created', emailHash);
        }

        // Apply 90-150 second delay after login
        await HumanBehaviorSimulator.randomDelay();
      }

      // Navigate to profile with human-like behavior
      await HumanBehaviorSimulator.hesitate();
      await page.goto(profileUrl, {
        waitUntil: 'networkidle2',
        timeout: options.timeout || 30000,
      });

      // Simulate reading page title
      const pageTitle = await page.title();
      await HumanBehaviorSimulator.simulateReading(pageTitle.length);

      // Check for checkpoint challenge
      const currentUrl = page.url();
      if (currentUrl.includes('/checkpoint') || currentUrl.includes('/challenge')) {
        await LinkedInSessionManager.invalidateSession(email);
        LinkedInLogger.logCheckpoint(userId, emailHash, profileUrl);

        await LinkedInAccountManager.logRequest(
          userId,
          email,
          profileUrl,
          false,
          Date.now() - startTime,
          'Checkpoint challenge triggered'
        );

        throw LinkedInErrors.CHECKPOINT_REQUIRED();
      }

      // Simulate human scrolling and mouse movement
      await HumanBehaviorSimulator.simulateMouseMovement(page);
      await HumanBehaviorSimulator.simulateScrolling(page);

      // Extract profile data
      const profileData = await page.evaluate(() => {
        // @ts-expect-error - Running in browser context with DOM API
        const name = document.querySelector('h1.text-heading-xlarge, h1.top-card-layout__title')?.textContent?.trim() || '';
        // @ts-expect-error - Running in browser context with DOM API
        const headline = document.querySelector('div.text-body-medium, div.top-card-layout__headline')?.textContent?.trim() || '';
        // @ts-expect-error - Running in browser context with DOM API
        const location = document.querySelector('span.text-body-small.inline.t-black--light.break-words, div.top-card__subline-item:nth-child(1)')?.textContent?.trim() || '';

        // Extract experience
        // @ts-expect-error - Running in browser context with DOM API
        const experienceSection = document.querySelector('#experience');
        let currentCompany = '';
        if (experienceSection) {
          const firstJob = experienceSection.parentElement?.querySelector('li');
          currentCompany = firstJob?.querySelector('span[aria-hidden="true"]')?.textContent?.trim() || '';
        }

        // Extract bio/about
        // @ts-expect-error - Running in browser context with DOM API
        const aboutSection = document.querySelector('#about');
        const bio = aboutSection?.parentElement?.querySelector('div.display-flex span[aria-hidden="true"]')?.textContent?.trim() || '';

        return {
          name,
          headline,
          location,
          currentCompany,
          bio,
        };
      });

      await page.close();

      // Log successful request
      const responseTime = Date.now() - startTime;
      await LinkedInAccountManager.logRequest(
        userId,
        email,
        profileUrl,
        true,
        responseTime
      );

      LinkedInLogger.logScrapingAttempt(profileUrl, userId, true, responseTime, sessionType);

      return {
        name: profileData.name || 'Unknown',
        title: profileData.headline || '',
        company: profileData.currentCompany || profileData.headline.split(' at ').pop()?.trim() || '',
        location: profileData.location || '',
        bio: profileData.bio || '',
        profileUrl,
        platform: 'linkedin',
      };
    } catch (error) {
      await page.close();

      // Log failed request
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await LinkedInAccountManager.logRequest(
        userId,
        email,
        profileUrl,
        false,
        responseTime,
        errorMessage
      );

      LinkedInLogger.logScrapingAttempt(profileUrl, userId, false, responseTime, sessionType);

      // Re-throw LinkedIn-specific errors
      if (error instanceof Error && error.name === 'LinkedInAuthError') {
        throw error;
      }

      throw LinkedInErrors.SCRAPING_FAILED(errorMessage);
    }
  }

  /**
   * Login to LinkedIn with human-like behavior
   */
  private async loginToLinkedIn(page: Page, email: string, password: string, userId: string): Promise<void> {
    const emailHash = hashEmail(email);

    try {
      // Navigate to login page
      await page.goto('https://www.linkedin.com/login', {
        waitUntil: 'networkidle2',
      });

      // Simulate reading the page
      await HumanBehaviorSimulator.simulateReading(200);

      // Random mouse movements before interacting
      await HumanBehaviorSimulator.simulateMouseMovement(page, 2);

      // Hesitate before typing
      await HumanBehaviorSimulator.hesitate();

      // Type email with human-like delays
      await HumanBehaviorSimulator.typeHumanLike(page, '#username', email);
      await HumanBehaviorSimulator.hesitate();

      // Type password with human-like delays
      await HumanBehaviorSimulator.typeHumanLike(page, '#password', password);

      // Simulate reading button text
      await HumanBehaviorSimulator.simulateReading(20);
      await HumanBehaviorSimulator.hesitate();

      // Click login button
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.click('button[type="submit"]'),
      ]);

      // Wait for page to settle
      await HumanBehaviorSimulator.simulateReading(100);

      // Check if login was successful
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        LinkedInLogger.logAuthAttempt(userId, emailHash, false, 'Login failed - still on login page');
        throw LinkedInErrors.LOGIN_FAILED();
      }

      if (currentUrl.includes('/checkpoint') || currentUrl.includes('/challenge')) {
        // Check if it's email verification (2FA) or a permanent checkpoint
        const isEmailVerification = await page.evaluate(() => {
          // @ts-ignore - Running in browser context
          const pinInput = document.querySelector('input[name="pin"], input[id="input__email_verification_pin"]');
          // @ts-ignore - Running in browser context
          const verificationText = document.body.textContent?.toLowerCase() || '';
          return !!(pinInput ||
                   verificationText.includes('verification code') ||
                   verificationText.includes('enter the code') ||
                   verificationText.includes('we sent a code'));
        });

        if (isEmailVerification) {
          console.log('[LinkedIn] Email verification required');

          // Create verification session and keep page alive
          const verificationSessionId = await LinkedInVerificationService.createVerificationSession(
            userId,
            email,
            currentUrl,
            page
          );

          // Store page for later verification (don't close it)
          this.verificationPages.set(verificationSessionId, page);

          LinkedInLogger.logAuthAttempt(userId, emailHash, false, 'Email verification required');
          throw LinkedInErrors.EMAIL_VERIFICATION_REQUIRED(verificationSessionId);
        } else {
          // This is a permanent checkpoint (CAPTCHA, etc.)
          LinkedInLogger.logAuthAttempt(userId, emailHash, false, 'Checkpoint challenge triggered');
          await LinkedInSessionManager.invalidateSession(email);
          throw LinkedInErrors.CHECKPOINT_REQUIRED();
        }
      }

      LinkedInLogger.logAuthAttempt(userId, emailHash, true);
      console.log('[LinkedIn] Login successful');
    } catch (error) {
      if (error instanceof Error && error.name === 'LinkedInAuthError') {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      LinkedInLogger.logAuthAttempt(userId, emailHash, false, errorMessage);
      throw LinkedInErrors.LOGIN_FAILED();
    }
  }

  /**
   * Scrape Facebook profile with Puppeteer
   */
  async scrapeFacebookProfile(
    profileUrl: string,
    options: ScraperOptions = {}
  ): Promise<ScrapedProfile> {
    const browser = await this.initBrowser(options.headless !== false);
    const page = await this.createStealthPage(browser);

    try {
      // Navigate to profile
      await page.goto(profileUrl, {
        waitUntil: 'networkidle2',
        timeout: options.timeout || 30000,
      });

      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1000));

      // Extract profile data
      const profileData = await page.evaluate(() => {
        // @ts-expect-error - Running in browser context with DOM API
        const name = document.querySelector('h1')?.textContent?.trim() || '';
        // @ts-expect-error - Running in browser context with DOM API
        const bio = document.querySelector('[data-ad-comet-preview="message"]')?.textContent?.trim() || '';

        // Try to find work/location info
        let work = '';
        let location = '';
        // @ts-expect-error - Running in browser context with DOM API
        const infoElements = document.querySelectorAll('span.x193iq5w');
        // @ts-expect-error - Element type available in browser context
        infoElements.forEach((el: Element) => {
          const text = el.textContent?.trim() || '';
          if (text.includes('Works at') || text.includes('Work')) {
            work = text.replace(/Works at|Work/gi, '').trim();
          }
          if (text.includes('Lives in') || text.includes('From')) {
            location = text.replace(/Lives in|From/gi, '').trim();
          }
        });

        return {
          name,
          bio,
          work,
          location,
        };
      });

      await page.close();

      return {
        name: profileData.name || 'Unknown',
        title: '',
        company: profileData.work || '',
        location: profileData.location || '',
        bio: profileData.bio || '',
        profileUrl,
        platform: 'facebook',
      };
    } catch (error) {
      await page.close();
      throw new Error(`Failed to scrape Facebook profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch Facebook profile using Graph API
   */
  async fetchFacebookProfileViaGraphAPI(
    profileId: string,
    options: FacebookGraphAPIOptions
  ): Promise<ScrapedProfile> {
    try {
      const fields = options.fields || ['id', 'name', 'work', 'location', 'about', 'email'];
      const url = `https://graph.facebook.com/v18.0/${profileId}`;

      const response = await axios.get(url, {
        params: {
          fields: fields.join(','),
          access_token: options.accessToken,
        },
      });

      const data = response.data;

      // Extract work information
      let company = '';
      let title = '';
      if (data.work && Array.isArray(data.work) && data.work.length > 0) {
        const currentWork = data.work[0];
        company = currentWork.employer?.name || '';
        title = currentWork.position?.name || '';
      }

      // Extract location
      let location = '';
      if (data.location) {
        location = data.location.name || '';
      }

      return {
        name: data.name || 'Unknown',
        title,
        company,
        location,
        bio: data.about || '',
        profileUrl: `https://www.facebook.com/${profileId}`,
        platform: 'facebook',
        additionalData: {
          email: data.email,
          fbId: data.id,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Facebook Graph API error: ${message}`);
      }
      throw new Error(`Failed to fetch Facebook profile via Graph API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract Facebook profile ID from URL
   */
  extractFacebookProfileId(url: string): string {
    // Handle various Facebook URL formats
    // https://www.facebook.com/username
    // https://facebook.com/profile.php?id=123456789

    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Check for profile.php?id= format
      if (pathname.includes('profile.php')) {
        const id = urlObj.searchParams.get('id');
        if (id) return id;
      }

      // Extract username from path
      const username = pathname.split('/').filter(Boolean)[0];
      return username || '';
    } catch (error) {
      throw new Error('Invalid Facebook profile URL');
    }
  }

  /**
   * Submit verification code for pending session
   */
  async submitVerificationCode(
    verificationSessionId: string,
    verificationCode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the stored page
      const page = this.verificationPages.get(verificationSessionId);
      if (!page) {
        return { success: false, error: 'Verification session not found or expired' };
      }

      // Submit the code using the service
      const result = await LinkedInVerificationService.submitVerificationCode(
        verificationSessionId,
        verificationCode,
        page
      );

      // If successful or failed, clean up the page
      if (result.success || !result.error?.includes('Invalid verification code')) {
        this.verificationPages.delete(verificationSessionId);
        // Don't close the page yet - it may be needed for scraping
      }

      return result;
    } catch (error) {
      console.error('[Scraper] Error submitting verification code:', error);
      return { success: false, error: 'Failed to submit verification code' };
    }
  }

  /**
   * Get verification page for manual scraping after verification
   */
  getVerificationPage(verificationSessionId: string): Page | undefined {
    return this.verificationPages.get(verificationSessionId);
  }

  /**
   * Clean up verification page
   */
  async cleanupVerificationPage(verificationSessionId: string): Promise<void> {
    const page = this.verificationPages.get(verificationSessionId);
    if (page) {
      await page.close();
      this.verificationPages.delete(verificationSessionId);
    }
  }

  /**
   * Close browser instance
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export default new AdvancedScraperService();
