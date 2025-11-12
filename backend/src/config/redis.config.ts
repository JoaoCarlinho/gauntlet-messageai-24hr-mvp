import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false'; // Default to true unless explicitly disabled

let redisClient: Redis | null = null;

if (REDIS_ENABLED) {
  try {
    redisClient = new Redis(REDIS_URL, {
      password: REDIS_PASSWORD,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    redisClient.on('error', (err: Error) => {
      console.error('[Redis] Connection error:', err);
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Client ready for commands');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      if (redisClient) {
        await redisClient.quit();
        console.log('[Redis] Connection closed');
      }
    });
  } catch (error) {
    console.error('[Redis] Failed to initialize:', error);
    redisClient = null;
  }
} else {
  console.warn('[Redis] Redis is disabled - LinkedIn session caching will not be available');
}

export { redisClient };
export default redisClient;
