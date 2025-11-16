/**
 * LinkedIn Connection Tracking Service
 *
 * Manages connection request logging and rate limiting
 */

import prisma from '../config/database';

export interface ConnectionRateLimitCheck {
  allowed: boolean;
  reason?: string;
  waitTimeMs?: number;
}

export class LinkedInConnectionService {
  /**
   * Log a connection request attempt
   */
  static async logConnectionRequest(
    userId: string,
    accountEmail: string,
    profileUrl: string,
    targetName: string,
    targetHeadline: string | undefined,
    message: string | undefined,
    status: 'sent' | 'failed',
    errorMessage?: string
  ) {
    try {
      return await prisma.linkedInConnectionRequest.create({
        data: {
          userId,
          accountEmail,
          profileUrl,
          targetName,
          targetHeadline,
          personalizedMessage: message,
          status,
          errorMessage,
        },
      });
    } catch (error) {
      console.error('[LinkedIn Connection] Error logging connection request:', error);
      return null;
    }
  }

  /**
   * Check if user can make a connection request (rate limiting)
   * Limits: 5/hour, 20/day, 100/week (LinkedIn best practices)
   */
  static async canMakeConnectionRequest(accountEmail: string): Promise<ConnectionRateLimitCheck> {
    try {
      const now = new Date();

      // Get or create rate limit record
      let rateLimit = await prisma.linkedInConnectionRateLimit.findUnique({
        where: { accountEmail },
      });

      if (!rateLimit) {
        // Create new record
        rateLimit = await prisma.linkedInConnectionRateLimit.create({
          data: {
            accountEmail,
            requestsThisHour: 0,
            requestsThisDay: 0,
            requestsThisWeek: 0,
            hourResetAt: new Date(now.getTime() + 60 * 60 * 1000),
            dayResetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            weekResetAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Reset counters if time windows expired
      let needsUpdate = false;
      if (now > rateLimit.hourResetAt) {
        rateLimit.requestsThisHour = 0;
        rateLimit.hourResetAt = new Date(now.getTime() + 60 * 60 * 1000);
        needsUpdate = true;
      }
      if (now > rateLimit.dayResetAt) {
        rateLimit.requestsThisDay = 0;
        rateLimit.dayResetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        needsUpdate = true;
      }
      if (now > rateLimit.weekResetAt) {
        rateLimit.requestsThisWeek = 0;
        rateLimit.weekResetAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        needsUpdate = true;
      }

      // Update if any counters were reset
      if (needsUpdate) {
        rateLimit = await prisma.linkedInConnectionRateLimit.update({
          where: { accountEmail },
          data: {
            requestsThisHour: rateLimit.requestsThisHour,
            requestsThisDay: rateLimit.requestsThisDay,
            requestsThisWeek: rateLimit.requestsThisWeek,
            hourResetAt: rateLimit.hourResetAt,
            dayResetAt: rateLimit.dayResetAt,
            weekResetAt: rateLimit.weekResetAt,
          },
        });
      }

      // Check limits (LinkedIn best practices)
      if (rateLimit.requestsThisHour >= 5) {
        const waitTimeMs = rateLimit.hourResetAt.getTime() - now.getTime();
        return {
          allowed: false,
          reason: 'Hourly connection limit (5) exceeded',
          waitTimeMs,
        };
      }
      if (rateLimit.requestsThisDay >= 20) {
        const waitTimeMs = rateLimit.dayResetAt.getTime() - now.getTime();
        return {
          allowed: false,
          reason: 'Daily connection limit (20) exceeded',
          waitTimeMs,
        };
      }
      if (rateLimit.requestsThisWeek >= 100) {
        const waitTimeMs = rateLimit.weekResetAt.getTime() - now.getTime();
        return {
          allowed: false,
          reason: 'Weekly connection limit (100) exceeded',
          waitTimeMs,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('[LinkedIn Connection] Error checking rate limit:', error);
      // Allow request on error to avoid blocking
      return { allowed: true };
    }
  }

  /**
   * Increment connection request counters
   */
  static async incrementConnectionRequest(accountEmail: string) {
    try {
      await prisma.linkedInConnectionRateLimit.update({
        where: { accountEmail },
        data: {
          requestsThisHour: { increment: 1 },
          requestsThisDay: { increment: 1 },
          requestsThisWeek: { increment: 1 },
          lastRequestAt: new Date(),
        },
      });
    } catch (error) {
      console.error('[LinkedIn Connection] Error incrementing connection count:', error);
    }
  }

  /**
   * Get connection request statistics for a user
   */
  static async getConnectionStats(userId: string) {
    try {
      const totalRequests = await prisma.linkedInConnectionRequest.count({
        where: { userId },
      });

      const sentRequests = await prisma.linkedInConnectionRequest.count({
        where: { userId, status: 'sent' },
      });

      const failedRequests = await prisma.linkedInConnectionRequest.count({
        where: { userId, status: 'failed' },
      });

      const recentRequests = await prisma.linkedInConnectionRequest.findMany({
        where: { userId },
        orderBy: { sentAt: 'desc' },
        take: 10,
        select: {
          profileUrl: true,
          targetName: true,
          status: true,
          sentAt: true,
          errorMessage: true,
        },
      });

      return {
        totalRequests,
        sentRequests,
        failedRequests,
        successRate: totalRequests > 0 ? (sentRequests / totalRequests) * 100 : 0,
        recentRequests,
      };
    } catch (error) {
      console.error('[LinkedIn Connection] Error getting connection stats:', error);
      return {
        totalRequests: 0,
        sentRequests: 0,
        failedRequests: 0,
        successRate: 0,
        recentRequests: [],
      };
    }
  }

  /**
   * Get rate limit status for an account
   */
  static async getRateLimitStatus(accountEmail: string) {
    try {
      const rateLimit = await prisma.linkedInConnectionRateLimit.findUnique({
        where: { accountEmail },
      });

      if (!rateLimit) {
        return {
          hourly: { used: 0, limit: 5, remaining: 5 },
          daily: { used: 0, limit: 20, remaining: 20 },
          weekly: { used: 0, limit: 100, remaining: 100 },
        };
      }

      const now = new Date();

      // Reset counters if expired
      const hourlyUsed = now > rateLimit.hourResetAt ? 0 : rateLimit.requestsThisHour;
      const dailyUsed = now > rateLimit.dayResetAt ? 0 : rateLimit.requestsThisDay;
      const weeklyUsed = now > rateLimit.weekResetAt ? 0 : rateLimit.requestsThisWeek;

      return {
        hourly: { used: hourlyUsed, limit: 5, remaining: 5 - hourlyUsed },
        daily: { used: dailyUsed, limit: 20, remaining: 20 - dailyUsed },
        weekly: { used: weeklyUsed, limit: 100, remaining: 100 - weeklyUsed },
        nextReset: {
          hourly: rateLimit.hourResetAt,
          daily: rateLimit.dayResetAt,
          weekly: rateLimit.weekResetAt,
        },
      };
    } catch (error) {
      console.error('[LinkedIn Connection] Error getting rate limit status:', error);
      return {
        hourly: { used: 0, limit: 5, remaining: 5 },
        daily: { used: 0, limit: 20, remaining: 20 },
        weekly: { used: 0, limit: 100, remaining: 100 },
      };
    }
  }

  /**
   * Mark a connection request as accepted
   */
  static async markConnectionAccepted(profileUrl: string, userId: string) {
    try {
      await prisma.linkedInConnectionRequest.updateMany({
        where: {
          userId,
          profileUrl,
          status: 'sent',
        },
        data: {
          status: 'accepted',
          respondedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('[LinkedIn Connection] Error marking connection accepted:', error);
    }
  }

  /**
   * Clean up old connection request records (older than 90 days)
   */
  static async cleanupOldRecords() {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const deleted = await prisma.linkedInConnectionRequest.deleteMany({
        where: {
          sentAt: {
            lt: ninetyDaysAgo,
          },
        },
      });

      console.log(`[LinkedIn Connection] Cleaned up ${deleted.count} old connection records`);
      return deleted.count;
    } catch (error) {
      console.error('[LinkedIn Connection] Error cleaning up old records:', error);
      return 0;
    }
  }
}
