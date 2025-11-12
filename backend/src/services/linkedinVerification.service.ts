/**
 * LinkedIn Verification Service
 *
 * Manages email verification code flow for LinkedIn 2FA
 * Handles browser session persistence during verification
 */

import { PrismaClient } from '@prisma/client';
import { Page } from 'puppeteer';
import { encrypt, decrypt } from '../utils/encryption.util';

const prisma = new PrismaClient();

export interface BrowserSessionData {
  cookies: any[];
  userAgent: string;
  url: string;
}

export class LinkedInVerificationService {
  /**
   * Create a new verification session
   * Stores browser state so verification can be resumed
   */
  static async createVerificationSession(
    userId: string,
    accountEmail: string,
    profileUrl: string,
    page: Page
  ): Promise<string> {
    try {
      // Capture current browser state
      const cookies = await page.cookies();
      const userAgent = await page.evaluate(() => navigator.userAgent);
      const currentUrl = page.url();

      const sessionData: BrowserSessionData = {
        cookies,
        userAgent,
        url: currentUrl,
      };

      // Encrypt session data
      const encrypted = encrypt(JSON.stringify(sessionData));

      // Store verification session with 5 minute expiry
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const session = await prisma.linkedInVerificationSession.create({
        data: {
          userId,
          accountEmail,
          profileUrl,
          browserSessionData: encrypted.ciphertext,
          encryptionIv: encrypted.iv,
          encryptionAuthTag: encrypted.authTag,
          status: 'pending',
          attemptsRemaining: 3,
          expiresAt,
        },
      });

      console.log(`[Verification] Created session ${session.id} for user ${userId}`);
      return session.id;
    } catch (error) {
      console.error('[Verification] Failed to create session:', error);
      throw new Error('Failed to create verification session');
    }
  }

  /**
   * Get verification session by ID
   */
  static async getVerificationSession(sessionId: string) {
    try {
      const session = await prisma.linkedInVerificationSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return null;
      }

      // Check if expired
      if (new Date() > session.expiresAt) {
        await this.markSessionExpired(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      console.error('[Verification] Failed to get session:', error);
      return null;
    }
  }

  /**
   * Decrypt and restore browser session data
   */
  static async restoreBrowserSession(
    sessionId: string,
    page: Page
  ): Promise<boolean> {
    try {
      const session = await this.getVerificationSession(sessionId);
      if (!session || session.status !== 'pending') {
        return false;
      }

      // Decrypt session data
      const decrypted = decrypt({
        ciphertext: session.browserSessionData,
        iv: session.encryptionIv,
        authTag: session.encryptionAuthTag,
      });

      const sessionData: BrowserSessionData = JSON.parse(decrypted);

      // Restore browser state
      await page.setUserAgent(sessionData.userAgent);
      await page.setCookie(...sessionData.cookies);
      await page.goto(sessionData.url, { waitUntil: 'networkidle2' });

      console.log(`[Verification] Restored session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('[Verification] Failed to restore session:', error);
      return false;
    }
  }

  /**
   * Submit verification code to LinkedIn
   * Returns true if verification was successful
   */
  static async submitVerificationCode(
    sessionId: string,
    verificationCode: string,
    page: Page
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await this.getVerificationSession(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found or expired' };
      }

      if (session.attemptsRemaining <= 0) {
        return { success: false, error: 'No attempts remaining' };
      }

      // Try to find verification code input field
      const inputSelector = 'input[name="pin"], input[id="input__email_verification_pin"]';
      const submitSelector = 'button[type="submit"], button[data-litms-control-urn*="verify"]';

      try {
        // Wait for input field
        await page.waitForSelector(inputSelector, { timeout: 5000 });

        // Type verification code
        await page.type(inputSelector, verificationCode);

        // Click submit button
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
          page.click(submitSelector),
        ]);

        // Check if verification was successful
        const currentUrl = page.url();

        // If we're still on verification page, code was wrong
        if (currentUrl.includes('/checkpoint') || currentUrl.includes('/challenge')) {
          // Decrement attempts
          await prisma.linkedInVerificationSession.update({
            where: { id: sessionId },
            data: {
              attemptsRemaining: { decrement: 1 },
            },
          });

          const updatedSession = await this.getVerificationSession(sessionId);
          if (updatedSession && updatedSession.attemptsRemaining <= 0) {
            await this.markSessionFailed(sessionId);
            return { success: false, error: 'Invalid code - no attempts remaining' };
          }

          return { success: false, error: 'Invalid verification code' };
        }

        // Verification successful
        await this.markSessionCompleted(sessionId);
        console.log(`[Verification] Session ${sessionId} completed successfully`);

        return { success: true };
      } catch (error) {
        console.error('[Verification] Failed to submit code:', error);
        return { success: false, error: 'Failed to submit verification code' };
      }
    } catch (error) {
      console.error('[Verification] Error in submitVerificationCode:', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Mark session as completed
   */
  static async markSessionCompleted(sessionId: string): Promise<void> {
    await prisma.linkedInVerificationSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Mark session as failed
   */
  static async markSessionFailed(sessionId: string): Promise<void> {
    await prisma.linkedInVerificationSession.update({
      where: { id: sessionId },
      data: {
        status: 'failed',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Mark session as expired
   */
  static async markSessionExpired(sessionId: string): Promise<void> {
    await prisma.linkedInVerificationSession.update({
      where: { id: sessionId },
      data: {
        status: 'expired',
      },
    });
  }

  /**
   * Clean up old verification sessions (older than 1 hour)
   */
  static async cleanupOldSessions(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    await prisma.linkedInVerificationSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { createdAt: { lt: oneHourAgo } },
        ],
      },
    });

    console.log('[Verification] Cleaned up old sessions');
  }
}
