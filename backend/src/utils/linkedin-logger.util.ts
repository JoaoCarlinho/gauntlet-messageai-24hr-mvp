export class LinkedInLogger {
  /**
   * Redact sensitive data from error messages and logs
   */
  private static redactSensitive(message: string): string {
    return message
      .replace(/password[:\s=]+[^\s]+/gi, 'password=[REDACTED]')
      .replace(/cookie[:\s=]+[^\s]+/gi, 'cookie=[REDACTED]')
      .replace(/token[:\s=]+[^\s]+/gi, 'token=[REDACTED]')
      .replace(/authorization[:\s=]+[^\s]+/gi, 'authorization=[REDACTED]')
      .replace(/li_at=[^;]+/gi, 'li_at=[REDACTED]');
  }

  static logAuthAttempt(
    userId: string,
    emailHash: string,
    success: boolean,
    error?: string
  ): void {
    const timestamp = new Date().toISOString();
    const truncatedHash = emailHash.substring(0, 8);

    const logData = {
      service: 'linkedin-auth',
      action: 'auth_attempt',
      userId,
      emailHash: truncatedHash,
      success,
      error: error ? this.redactSensitive(error) : undefined,
      timestamp,
    };

    if (success) {
      console.info('[LinkedIn Auth]', JSON.stringify(logData));
    } else {
      console.error('[LinkedIn Auth]', JSON.stringify(logData));
    }
  }

  static logSessionAction(
    action: 'created' | 'reused' | 'invalidated',
    emailHash: string,
    details?: any
  ): void {
    console.info('[LinkedIn Session]', {
      action,
      emailHash: emailHash.substring(0, 8),
      details,
      timestamp: new Date().toISOString(),
    });
  }

  static logRateLimit(
    userId: string,
    allowed: boolean,
    reason?: string,
    waitTimeMs?: number
  ): void {
    console.info('[LinkedIn Rate Limit]', {
      userId,
      allowed,
      reason,
      waitTimeMs,
      timestamp: new Date().toISOString(),
    });
  }

  static logCheckpoint(
    userId: string,
    emailHash: string,
    profileUrl: string
  ): void {
    console.warn('[LinkedIn Checkpoint]', {
      userId,
      emailHash: emailHash.substring(0, 8),
      profileUrl,
      timestamp: new Date().toISOString(),
    });
  }

  static logScrapingAttempt(
    profileUrl: string,
    userId: string,
    success: boolean,
    durationMs?: number,
    sessionType?: 'cached' | 'fresh'
  ): void {
    console.info('[LinkedIn Scraping]', {
      profileUrl,
      userId,
      success,
      durationMs,
      sessionType,
      timestamp: new Date().toISOString(),
    });
  }
}
