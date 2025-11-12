import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt, hashEmail } from '../utils/encryption.util';
import { LinkedInLogger } from '../utils/linkedin-logger.util';
import { linkedInRateLimits } from '../config/linkedin-rate-limits.config';

const prisma = new PrismaClient();

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  waitTimeMs?: number;
}

export class LinkedInAccountManager {
  // Credential Management
  static async storeCredentials(
    userId: string,
    email: string,
    password: string
  ): Promise<void> {
    try {
      const emailHash = hashEmail(email);
      const encryptedEmail = encrypt(email.toLowerCase().trim());
      const encryptedPassword = encrypt(password);

      await prisma.linkedInUserCredential.upsert({
        where: { userId },
        create: {
          userId,
          emailHash,
          encryptedEmail: encryptedEmail.ciphertext,
          encryptedPassword: encryptedPassword.ciphertext,
          encryptionIv: encryptedEmail.iv,
          encryptionAuthTag: encryptedEmail.authTag,
          isActive: true,
          lastValidatedAt: new Date(),
        },
        update: {
          emailHash,
          encryptedEmail: encryptedEmail.ciphertext,
          encryptedPassword: encryptedPassword.ciphertext,
          encryptionIv: encryptedEmail.iv,
          encryptionAuthTag: encryptedEmail.authTag,
          isActive: true,
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      LinkedInLogger.logAuthAttempt(userId, emailHash, true, 'Credentials stored');
      console.log(`[AccountManager] Credentials stored for user ${userId}`);
    } catch (error) {
      console.error('[AccountManager] Failed to store credentials:', error);
      throw error;
    }
  }

  static async getCredentials(
    userId: string
  ): Promise<{ email: string; password: string; credentialId: string } | null> {
    try {
      const credential = await prisma.linkedInUserCredential.findUnique({
        where: { userId, isActive: true },
      });

      if (!credential) {
        return null;
      }

      const email = decrypt({
        ciphertext: credential.encryptedEmail,
        iv: credential.encryptionIv,
        authTag: credential.encryptionAuthTag,
      });

      const password = decrypt({
        ciphertext: credential.encryptedPassword,
        iv: credential.encryptionIv,
        authTag: credential.encryptionAuthTag,
      });

      return { email, password, credentialId: credential.id };
    } catch (error) {
      console.error('[AccountManager] Failed to retrieve credentials:', error);
      return null;
    }
  }

  static async getCredentialByUserId(userId: string) {
    return prisma.linkedInUserCredential.findUnique({
      where: { userId, isActive: true },
    });
  }

  static async deactivateCredentials(userId: string): Promise<void> {
    await prisma.linkedInUserCredential.update({
      where: { userId },
      data: { isActive: false, updatedAt: new Date() },
    });
    console.log(`[AccountManager] Credentials deactivated for user ${userId}`);
  }

  // Rate Limiting
  static async canMakeRequest(userId: string): Promise<RateLimitResult> {
    const credential = await this.getCredentialByUserId(userId);

    if (!credential) {
      return { allowed: false, reason: 'No LinkedIn credentials' };
    }

    const health = await prisma.linkedInAccountHealth.findUnique({
      where: { accountEmailHash: credential.emailHash },
    });

    if (health?.cooldownUntil && health.cooldownUntil > new Date()) {
      const waitMs = health.cooldownUntil.getTime() - Date.now();
      LinkedInLogger.logRateLimit(userId, false, 'Account on cooldown', waitMs);
      return { allowed: false, reason: 'Account on cooldown', waitTimeMs: waitMs };
    }

    const lastRequest = await prisma.linkedInRequestLog.findFirst({
      where: { userId },
      orderBy: { requestTime: 'desc' },
    });

    if (lastRequest) {
      const timeSince = Date.now() - lastRequest.requestTime.getTime();
      const minDelay = linkedInRateLimits.minDelayBetweenRequests;

      if (timeSince < minDelay) {
        const waitMs = minDelay - timeSince;
        LinkedInLogger.logRateLimit(userId, false, 'Too soon after last request', waitMs);
        return { allowed: false, reason: 'Too soon after last request', waitTimeMs: waitMs };
      }
    }

    const oneHourAgo = new Date(Date.now() - 3600000);
    const requestsThisHour = await prisma.linkedInRequestLog.count({
      where: { userId, requestTime: { gte: oneHourAgo }, success: true },
    });

    if (requestsThisHour >= linkedInRateLimits.maxProfilesPerHour) {
      LinkedInLogger.logRateLimit(userId, false, `Hourly rate limit reached (${linkedInRateLimits.maxProfilesPerHour}/hour)`, 3600000);
      return {
        allowed: false,
        reason: `Hourly rate limit reached (${linkedInRateLimits.maxProfilesPerHour}/hour)`,
        waitTimeMs: 3600000,
      };
    }

    const oneDayAgo = new Date(Date.now() - 86400000);
    const requestsToday = await prisma.linkedInRequestLog.count({
      where: { userId, requestTime: { gte: oneDayAgo }, success: true },
    });

    if (requestsToday >= linkedInRateLimits.maxProfilesPerDay) {
      LinkedInLogger.logRateLimit(userId, false, `Daily rate limit reached (${linkedInRateLimits.maxProfilesPerDay}/day)`, 86400000);
      return {
        allowed: false,
        reason: `Daily rate limit reached (${linkedInRateLimits.maxProfilesPerDay}/day)`,
        waitTimeMs: 86400000,
      };
    }

    LinkedInLogger.logRateLimit(userId, true);
    return { allowed: true };
  }

  static async getRateLimitStats(userId: string) {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const oneDayAgo = new Date(Date.now() - 86400000);

    const [requestsThisHour, requestsToday, lastRequest, credential] = await Promise.all([
      prisma.linkedInRequestLog.count({
        where: { userId, requestTime: { gte: oneHourAgo }, success: true },
      }),
      prisma.linkedInRequestLog.count({
        where: { userId, requestTime: { gte: oneDayAgo }, success: true },
      }),
      prisma.linkedInRequestLog.findFirst({
        where: { userId },
        orderBy: { requestTime: 'desc' },
      }),
      this.getCredentialByUserId(userId),
    ]);

    const health = credential
      ? await prisma.linkedInAccountHealth.findUnique({
          where: { accountEmailHash: credential.emailHash },
        })
      : null;

    const nextAllowedAt = lastRequest
      ? new Date(lastRequest.requestTime.getTime() + linkedInRateLimits.minDelayBetweenRequests)
      : null;

    return {
      requestsThisHour,
      requestsToday,
      lastRequestAt: lastRequest?.requestTime || null,
      nextAllowedAt,
      cooldownUntil: health?.cooldownUntil || null,
    };
  }

  // Request Logging
  static async logRequest(
    userId: string,
    accountEmail: string,
    profileUrl: string,
    success: boolean,
    responseTimeMs?: number,
    error?: any
  ): Promise<void> {
    const emailHash = hashEmail(accountEmail);
    const checkpointTriggered = error?.message?.includes('CHECKPOINT_REQUIRED') || error?.code === 'CHECKPOINT_REQUIRED';

    try {
      await prisma.linkedInRequestLog.create({
        data: {
          userId,
          accountEmailHash: emailHash,
          profileUrl,
          requestTime: new Date(),
          responseTimeMs,
          success,
          checkpointTriggered,
          errorMessage: error?.message,
        },
      });

      await prisma.linkedInAccountHealth.upsert({
        where: { accountEmailHash: emailHash },
        create: {
          accountEmailHash: emailHash,
          userId,
          totalRequests: 1,
          successfulRequests: success ? 1 : 0,
          failedRequests: success ? 0 : 1,
          checkpointCount: checkpointTriggered ? 1 : 0,
          lastRequestAt: new Date(),
          lastCheckpointAt: checkpointTriggered ? new Date() : undefined,
          lastSuccessAt: success ? new Date() : undefined,
          isActive: true,
        },
        update: {
          totalRequests: { increment: 1 },
          successfulRequests: { increment: success ? 1 : 0 },
          failedRequests: { increment: success ? 0 : 1 },
          checkpointCount: { increment: checkpointTriggered ? 1 : 0 },
          lastRequestAt: new Date(),
          lastCheckpointAt: checkpointTriggered ? new Date() : undefined,
          lastSuccessAt: success ? new Date() : undefined,
          updatedAt: new Date(),
        },
      });

      if (checkpointTriggered) {
        await prisma.linkedInAccountHealth.update({
          where: { accountEmailHash: emailHash },
          data: {
            cooldownUntil: new Date(Date.now() + linkedInRateLimits.checkpointCooldown),
            isActive: false,
          },
        });

        LinkedInLogger.logCheckpoint(userId, emailHash, profileUrl);
        console.warn(`[AccountManager] Checkpoint triggered - account on 24hr cooldown`);
      }

      LinkedInLogger.logScrapingAttempt(profileUrl, userId, success, responseTimeMs);
    } catch (error) {
      console.error('[AccountManager] Failed to log request:', error);
    }
  }

  static async getAccountHealth(userId: string) {
    const credential = await this.getCredentialByUserId(userId);
    if (!credential) return null;

    const health = await prisma.linkedInAccountHealth.findUnique({
      where: { accountEmailHash: credential.emailHash },
    });

    if (!health) return null;

    const successRate = health.totalRequests > 0
      ? (health.successfulRequests / health.totalRequests) * 100
      : 0;

    const checkpointRate = health.totalRequests > 0
      ? (health.checkpointCount / health.totalRequests) * 100
      : 0;

    const isOnCooldown = health.cooldownUntil ? health.cooldownUntil > new Date() : false;

    return {
      totalRequests: health.totalRequests,
      successfulRequests: health.successfulRequests,
      failedRequests: health.failedRequests,
      checkpointCount: health.checkpointCount,
      consecutiveFailures: 0, // Track consecutive failures in a future enhancement
      successRate,
      checkpointRate,
      isActive: health.isActive,
      isOnCooldown,
      cooldownUntil: health.cooldownUntil,
      lastRequestAt: health.lastRequestAt,
      lastSuccessAt: health.lastSuccessAt,
      lastFailureAt: null, // Not tracked in current schema
      createdAt: health.createdAt,
      updatedAt: health.updatedAt,
    };
  }

  static async getRequestHistory(userId: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 3600000);

    return prisma.linkedInRequestLog.findMany({
      where: {
        userId,
        requestTime: { gte: since },
      },
      orderBy: { requestTime: 'desc' },
      select: {
        id: true,
        profileUrl: true,
        requestTime: true,
        success: true,
        responseTimeMs: true,
        checkpointTriggered: true,
        errorMessage: true,
      },
    });
  }
}
