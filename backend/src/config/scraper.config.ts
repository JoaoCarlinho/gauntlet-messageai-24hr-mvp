/**
 * Scraper Configuration
 *
 * Configuration settings for the advanced scraper service
 * including rate limits, timeouts, and anti-detection settings
 */

export interface ScraperConfig {
  // Rate limiting settings (per IP per time window)
  rateLimits: {
    linkedin: {
      windowMs: number; // Time window in milliseconds
      maxRequests: number; // Maximum requests per window
    };
    facebook: {
      windowMs: number;
      maxRequests: number;
    };
    overall: {
      windowMs: number;
      maxRequests: number;
    };
  };

  // Timeout settings (in milliseconds)
  timeouts: {
    default: number;
    authentication: number;
    scraping: number;
  };

  // Puppeteer settings
  puppeteer: {
    headless: boolean;
    defaultViewport: {
      width: number;
      height: number;
    };
    args: string[];
  };

  // Anti-detection settings
  antiDetection: {
    enableStealth: boolean;
    rotateUserAgents: boolean;
    randomDelayRange: {
      min: number; // Minimum delay in ms
      max: number; // Maximum delay in ms
    };
  };

  // Proxy settings (optional)
  proxy?: {
    enabled: boolean;
    servers: string[]; // Array of proxy URLs
    rotateOnRequest: boolean;
  };
}

const scraperConfig: ScraperConfig = {
  rateLimits: {
    linkedin: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10,
    },
    facebook: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 15,
    },
    overall: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 50,
    },
  },

  timeouts: {
    default: 30000, // 30 seconds
    authentication: 45000, // 45 seconds for login flows
    scraping: 30000, // 30 seconds for scraping
  },

  puppeteer: {
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
      '--disable-blink-features=AutomationControlled',
    ],
  },

  antiDetection: {
    enableStealth: true,
    rotateUserAgents: true,
    randomDelayRange: {
      min: 1000,
      max: 3000,
    },
  },

  // Proxy configuration - disabled by default
  // To enable, set PROXY_ENABLED=true and provide PROXY_SERVERS as comma-separated URLs
  proxy: {
    enabled: process.env.PROXY_ENABLED === 'true',
    servers: process.env.PROXY_SERVERS ? process.env.PROXY_SERVERS.split(',') : [],
    rotateOnRequest: true,
  },
};

/**
 * User agent strings for rotation
 * These are updated periodically to reflect current browser versions
 */
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

/**
 * Get a random user agent from the pool
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Get a random proxy from the pool (if enabled)
 */
export function getRandomProxy(): string | undefined {
  if (!scraperConfig.proxy?.enabled || !scraperConfig.proxy.servers.length) {
    return undefined;
  }
  return scraperConfig.proxy.servers[
    Math.floor(Math.random() * scraperConfig.proxy.servers.length)
  ];
}

/**
 * Generate a random delay within the configured range
 */
export function getRandomDelay(): number {
  const { min, max } = scraperConfig.antiDetection.randomDelayRange;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default scraperConfig;
