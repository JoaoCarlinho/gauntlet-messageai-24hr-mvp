import { Page } from 'puppeteer';
import redisClient from '../config/redis.config';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt, hashEmail } from '../utils/encryption.util';
import { LinkedInLogger } from '../utils/linkedin-logger.util';
import { linkedInRateLimits } from '../config/linkedin-rate-limits.config';

const prisma = new PrismaClient();

interface SessionData {
  cookies: any[];
  userAgent: string;
  savedAt: string;
  expiresAt: string;
}

export class LinkedInSessionManager {
  private static REDIS_KEY_PREFIX = 'linkedin:session:';

  static async saveSession(
    page: Page,
    accountEmail: string,
    credentialId: string
  ): Promise<void> {
    try {
      const allCookies = await page.cookies();
      const linkedinCookies = allCookies.filter((c) => c.domain.includes('linkedin.com'));

      if (linkedinCookies.length === 0) {
        throw new Error('No LinkedIn cookies found after login');
      }

      const userAgent = await page.evaluate(() => navigator.userAgent);
      const emailHash = hashEmail(accountEmail);

      const sessionData: SessionData = {
        cookies: linkedinCookies,
        userAgent,
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + linkedInRateLimits.cookieMaxAge).toISOString(),
      };

      // Save to Redis if available
      if (redisClient) {
        const redisKey = `${this.REDIS_KEY_PREFIX}${emailHash}`;
        await redisClient.setex(redisKey, 86400, JSON.stringify(sessionData));
      }

      const encrypted = encrypt(JSON.stringify(sessionData));
      await prisma.linkedInUserSession.create({
        data: {
          credentialId,
          encryptedCookies: encrypted.ciphertext,
          encryptionIv: encrypted.iv,
          encryptionAuthTag: encrypted.authTag,
          userAgent,
          expiresAt: new Date(Date.now() + linkedInRateLimits.cookieMaxAge),
          isValid: true,
        },
      });

      LinkedInLogger.logSessionAction('created', emailHash, {
        cookieCount: linkedinCookies.length,
        expiresAt: sessionData.expiresAt,
      });

      console.log('[SessionManager] Session saved');
    } catch (error) {
      console.error('[SessionManager] Failed to save session:', error);
      throw error;
    }
  }

  static async loadSession(accountEmail: string): Promise<SessionData | null> {
    const emailHash = hashEmail(accountEmail);
    const redisKey = `${this.REDIS_KEY_PREFIX}${emailHash}`;

    try {
      // Try Redis first if available
      if (redisClient) {
        const cached = await redisClient.get(redisKey);

        if (cached) {
          const sessionData = JSON.parse(cached);
          LinkedInLogger.logSessionAction('reused', emailHash, { source: 'redis' });
          return sessionData;
        }
      }

      const credentialRecord = await prisma.linkedInUserCredential.findFirst({
        where: { emailHash },
        include: {
          sessions: {
            where: {
              isValid: true,
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!credentialRecord?.sessions?.[0]) {
        console.log('[SessionManager] No valid session found');
        return null;
      }

      const dbSession = credentialRecord.sessions[0];
      const decrypted = decrypt({
        ciphertext: dbSession.encryptedCookies,
        iv: dbSession.encryptionIv,
        authTag: dbSession.encryptionAuthTag,
      });
      const sessionData: SessionData = JSON.parse(decrypted);

      // Restore to Redis if available
      if (redisClient) {
        await redisClient.setex(redisKey, 86400, decrypted);
      }

      await prisma.linkedInUserSession.update({
        where: { id: dbSession.id },
        data: { lastUsedAt: new Date() },
      });

      LinkedInLogger.logSessionAction('reused', emailHash, { source: 'postgresql' });
      return sessionData;
    } catch (error) {
      console.error('[SessionManager] Failed to load session:', error);
      return null;
    }
  }

  static async invalidateSession(accountEmail: string): Promise<void> {
    const emailHash = hashEmail(accountEmail);
    const redisKey = `${this.REDIS_KEY_PREFIX}${emailHash}`;

    try {
      // Clear from Redis if available
      if (redisClient) {
        await redisClient.del(redisKey);
      }

      const credentialRecord = await prisma.linkedInUserCredential.findFirst({
        where: { emailHash },
      });

      if (credentialRecord) {
        await prisma.linkedInUserSession.updateMany({
          where: {
            credentialId: credentialRecord.id,
            isValid: true,
          },
          data: {
            isValid: false,
          },
        });
      }

      LinkedInLogger.logSessionAction('invalidated', emailHash);
      console.log('[SessionManager] Session invalidated');
    } catch (error) {
      console.error('[SessionManager] Failed to invalidate session:', error);
      throw error;
    }
  }

  static async setCookiesInPage(page: Page, sessionData: SessionData): Promise<void> {
    try {
      await page.setCookie(...sessionData.cookies);
      await page.setUserAgent(sessionData.userAgent);
      console.log('[SessionManager] Cookies and user agent set');
    } catch (error) {
      console.error('[SessionManager] Failed to set cookies:', error);
      throw error;
    }
  }

  static async validateSession(page: Page): Promise<boolean> {
    try {
      await page.goto('https://www.linkedin.com/feed/', {
        waitUntil: 'networkidle2',
        timeout: 10000,
      });

      const url = page.url();

      if (url.includes('/login') || url.includes('/checkpoint')) {
        console.log('[SessionManager] Session validation failed');
        return false;
      }

      console.log('[SessionManager] Session validated successfully');
      return true;
    } catch (error) {
      console.error('[SessionManager] Session validation error:', error);
      return false;
    }
  }
}
