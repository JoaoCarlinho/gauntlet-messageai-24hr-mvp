export const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--disable-blink-features=AutomationControlled',
  '--disable-features=IsolateOrigins,site-per-process',
  '--disable-web-security',
  '--window-position=0,0',
  '--ignore-certificate-errors',
  '--disable-notifications',
  '--disable-permissions-api',
  '--mute-audio',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

export const VIEWPORT_PRESETS = [
  { width: 1920, height: 1080, deviceScaleFactor: 1 },
  { width: 1366, height: 768, deviceScaleFactor: 1 },
  { width: 1536, height: 864, deviceScaleFactor: 1 },
  { width: 1440, height: 900, deviceScaleFactor: 1 },
  { width: 2560, height: 1440, deviceScaleFactor: 1 },
];

export const USER_AGENT_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
];

export function getRandomViewport() {
  return VIEWPORT_PRESETS[Math.floor(Math.random() * VIEWPORT_PRESETS.length)];
}

export function getRandomUserAgent() {
  return USER_AGENT_POOL[Math.floor(Math.random() * USER_AGENT_POOL.length)];
}
