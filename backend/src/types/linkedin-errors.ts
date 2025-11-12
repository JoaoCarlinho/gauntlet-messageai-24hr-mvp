export class LinkedInAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public retryAfterMs?: number,
    public userAction?: string
  ) {
    super(message);
    this.name = 'LinkedInAuthError';

    // Maintain proper stack trace (V8 engine)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LinkedInAuthError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      retryAfterMs: this.retryAfterMs,
      userAction: this.userAction,
    };
  }
}

// Predefined error instances
export const LinkedInErrors = {
  CHECKPOINT_REQUIRED: (retryAfterMs = 86400000) => new LinkedInAuthError(
    'LinkedIn requires additional verification (CAPTCHA/2FA)',
    'CHECKPOINT_REQUIRED',
    false,
    retryAfterMs,
    'Please log in to LinkedIn on your desktop browser to complete verification, then try again in 24 hours.'
  ),

  LOGIN_FAILED: () => new LinkedInAuthError(
    'Invalid credentials or login blocked',
    'LOGIN_FAILED',
    false,
    undefined,
    'Check your LinkedIn email and password and try again.'
  ),

  RATE_LIMIT_EXCEEDED: (retryAfterMs: number, reason: string) => new LinkedInAuthError(
    `Rate limit exceeded: ${reason}`,
    'RATE_LIMIT_EXCEEDED',
    true,
    retryAfterMs,
    `Wait ${Math.ceil(retryAfterMs / 1000)} seconds before trying again.`
  ),

  SESSION_EXPIRED: () => new LinkedInAuthError(
    'LinkedIn session expired - re-authentication required',
    'SESSION_EXPIRED',
    true,
    undefined,
    'Your LinkedIn session has expired. Try again to re-authenticate.'
  ),

  NO_CREDENTIALS: () => new LinkedInAuthError(
    'No LinkedIn credentials stored for user',
    'NO_CREDENTIALS',
    false,
    undefined,
    'Please provide your LinkedIn email and password.'
  ),

  ACCOUNT_ON_COOLDOWN: (cooldownUntil: Date) => new LinkedInAuthError(
    'Account is on cooldown due to previous errors',
    'ACCOUNT_ON_COOLDOWN',
    true,
    cooldownUntil.getTime() - Date.now(),
    `Account is temporarily paused. Try again after ${cooldownUntil.toLocaleString()}.`
  ),

  SCRAPING_FAILED: (details?: string) => new LinkedInAuthError(
    `Failed to scrape LinkedIn profile${details ? ': ' + details : ''}`,
    'SCRAPING_FAILED',
    true,
    undefined,
    'Please try again in a few minutes.'
  ),
} as const;

// Type for error response payloads
export interface LinkedInErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    retryAfterMs?: number;
    userAction?: string;
  };
}

// Helper to convert error to response
export function errorToResponse(error: LinkedInAuthError): LinkedInErrorResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      retryAfterMs: error.retryAfterMs,
      userAction: error.userAction,
    },
  };
}
