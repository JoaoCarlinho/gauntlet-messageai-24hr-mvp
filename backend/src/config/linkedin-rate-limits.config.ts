// LinkedIn Rate Limit Configuration
// Conservative rate limiting to avoid detection without proxy infrastructure

export const linkedInRateLimits = {
  // Request timing (90-150 second delays as specified)
  minDelayBetweenRequests: 90000,  // 90 seconds
  maxDelayBetweenRequests: 150000, // 150 seconds (randomized)

  // Throughput limits
  maxProfilesPerHour: 20,
  maxProfilesPerDay: 100,
  maxProfilesPerSession: 30,

  // Cooldown periods
  sessionCooldown: 3600000,        // 1 hour after hitting limits
  checkpointCooldown: 86400000,    // 24 hours after checkpoint

  // Failure handling
  maxConsecutiveFailures: 3,       // Pause account after 3 failures
  failureCooldown: 1800000,        // 30 minutes after 3 failures

  // Session management
  cookieMaxAge: 86400000,          // 24 hours
  validateCookieBeforeUse: true,
} as const;

export type LinkedInRateLimits = typeof linkedInRateLimits;
