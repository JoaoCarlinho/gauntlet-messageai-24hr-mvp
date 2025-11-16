import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Generate a secure random token for password reset
 * @returns A random hex string (32 bytes = 64 characters)
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a reset token for secure storage in database
 * @param token The plain text token
 * @returns Hashed token
 */
export async function hashResetToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

/**
 * Verify a reset token against the hashed version
 * @param token The plain text token
 * @param hashedToken The hashed token from database
 * @returns True if token matches
 */
export async function verifyResetToken(token: string, hashedToken: string): Promise<boolean> {
  return bcrypt.compare(token, hashedToken);
}

/**
 * Get the expiration time for a reset token (1 hour from now)
 * @returns Date object representing expiration time
 */
export function getResetTokenExpiration(): Date {
  const expirationTime = new Date();
  expirationTime.setHours(expirationTime.getHours() + 1);
  return expirationTime;
}

/**
 * Check if a reset token has expired
 * @param expiresAt The expiration date from database
 * @returns True if token has expired
 */
export function isResetTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
