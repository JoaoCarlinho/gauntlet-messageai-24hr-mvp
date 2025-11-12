import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

export const redisClient = new Redis(REDIS_URL, {
  password: REDIS_PASSWORD,
  retryStrategy(times) {
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

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
});

redisClient.on('ready', () => {
  console.log('[Redis] Client ready for commands');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisClient.quit();
  console.log('[Redis] Connection closed');
});

export default redisClient;
