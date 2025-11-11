/**
 * Advanced Scraper Service
 *
 * Production-ready web scraping service with:
 * - Puppeteer for JavaScript-rendered content
 * - Anti-detection measures (stealth plugin, user agent rotation)
 * - Support for authenticated and unauthenticated scraping
 * - Facebook Graph API integration
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';

// Add stealth plugin to avoid detection
puppeteerExtra.use(StealthPlugin());

// User agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

// Get random user agent
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Random delay to appear more human-like
function randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

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
}

export interface FacebookGraphAPIOptions {
  accessToken: string;
  fields?: string[];
}

class AdvancedScraperService {
  private browser: Browser | null = null;

  /**
   * Initialize browser instance
   */
  private async initBrowser(headless: boolean = true): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    this.browser = await puppeteerExtra.launch({
      headless: headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    return this.browser;
  }

  /**
   * Setup page with anti-detection measures
   */
  private async setupPage(page: Page): Promise<void> {
    // Set random user agent
    await page.setUserAgent(getRandomUserAgent());

    // Set viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    // Remove webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
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
  }

  /**
   * Scrape LinkedIn profile with Puppeteer
   */
  async scrapeLinkedInProfile(
    profileUrl: string,
    options: ScraperOptions = {}
  ): Promise<ScrapedProfile> {
    const browser = await this.initBrowser(options.headless !== false);
    const page = await browser.newPage();

    try {
      await this.setupPage(page);

      // If authentication is required
      if (options.useAuthentication && options.email && options.password) {
        await this.loginToLinkedIn(page, options.email, options.password);
        await randomDelay(2000, 4000);
      }

      // Navigate to profile
      await page.goto(profileUrl, {
        waitUntil: 'networkidle2',
        timeout: options.timeout || 30000,
      });

      await randomDelay(1500, 2500);

      // Extract profile data
      const profileData = await page.evaluate(() => {
        const name = document.querySelector('h1.text-heading-xlarge, h1.top-card-layout__title')?.textContent?.trim() || '';
        const headline = document.querySelector('div.text-body-medium, div.top-card-layout__headline')?.textContent?.trim() || '';
        const location = document.querySelector('span.text-body-small.inline.t-black--light.break-words, div.top-card__subline-item:nth-child(1)')?.textContent?.trim() || '';

        // Extract experience
        const experienceSection = document.querySelector('#experience');
        let currentCompany = '';
        if (experienceSection) {
          const firstJob = experienceSection.parentElement?.querySelector('li');
          currentCompany = firstJob?.querySelector('span[aria-hidden="true"]')?.textContent?.trim() || '';
        }

        // Extract bio/about
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
      throw new Error(`Failed to scrape LinkedIn profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Login to LinkedIn
   */
  private async loginToLinkedIn(page: Page, email: string, password: string): Promise<void> {
    try {
      await page.goto('https://www.linkedin.com/login', {
        waitUntil: 'networkidle2',
      });

      await randomDelay(1000, 2000);

      // Fill in email
      await page.type('#username', email, { delay: 100 });
      await randomDelay(500, 1000);

      // Fill in password
      await page.type('#password', password, { delay: 100 });
      await randomDelay(500, 1000);

      // Click login button
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]'),
      ]);

      await randomDelay(2000, 3000);

      // Check if login was successful
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/checkpoint')) {
        throw new Error('LinkedIn login failed or requires additional verification');
      }
    } catch (error) {
      throw new Error(`LinkedIn authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    const page = await browser.newPage();

    try {
      await this.setupPage(page);

      // Navigate to profile
      await page.goto(profileUrl, {
        waitUntil: 'networkidle2',
        timeout: options.timeout || 30000,
      });

      await randomDelay(2000, 3000);

      // Extract profile data
      const profileData = await page.evaluate(() => {
        const name = document.querySelector('h1')?.textContent?.trim() || '';
        const bio = document.querySelector('[data-ad-comet-preview="message"]')?.textContent?.trim() || '';

        // Try to find work/location info
        let work = '';
        let location = '';
        const infoElements = document.querySelectorAll('span.x193iq5w');
        infoElements.forEach(el => {
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
