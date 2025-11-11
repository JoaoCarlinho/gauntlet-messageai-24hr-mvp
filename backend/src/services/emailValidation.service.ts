import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

/**
 * Email Validation Service
 * Validates email addresses using MX record checks and SMTP verification
 */

const resolveMx = promisify(dns.resolveMx);

export interface EmailValidationResult {
  email: string;
  isValid: boolean;
  isSyntaxValid: boolean;
  hasMxRecords: boolean;
  isDeliverable?: boolean;
  reason?: string;
  confidence: number;
}

/**
 * Validate email address
 * @param email - Email address to validate
 * @returns Validation result
 */
export const validateEmail = async (email: string): Promise<EmailValidationResult> => {
  try {
    // Step 1: Syntax validation
    const isSyntaxValid = validateEmailSyntax(email);

    if (!isSyntaxValid) {
      return {
        email,
        isValid: false,
        isSyntaxValid: false,
        hasMxRecords: false,
        reason: 'Invalid email syntax',
        confidence: 1.0
      };
    }

    // Step 2: Extract domain
    const domain = email.split('@')[1];

    // Step 3: MX record check
    const hasMxRecords = await checkMxRecords(domain);

    if (!hasMxRecords) {
      return {
        email,
        isValid: false,
        isSyntaxValid: true,
        hasMxRecords: false,
        reason: 'No MX records found for domain',
        confidence: 0.9
      };
    }

    // Step 4: SMTP check (optional, can be slow)
    const isDeliverable = await checkSmtpDeliverability(email, domain);

    return {
      email,
      isValid: isSyntaxValid && hasMxRecords,
      isSyntaxValid,
      hasMxRecords,
      isDeliverable,
      reason: isDeliverable === false ? 'Email rejected by mail server' : undefined,
      confidence: isDeliverable ? 0.95 : 0.7
    };
  } catch (error) {
    console.error('Email validation error:', error);
    return {
      email,
      isValid: false,
      isSyntaxValid: false,
      hasMxRecords: false,
      reason: 'Validation error',
      confidence: 0
    };
  }
};

/**
 * Validate email syntax using regex
 */
const validateEmailSyntax = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Check if domain has MX records
 */
const checkMxRecords = async (domain: string): Promise<boolean> => {
  try {
    const mxRecords = await resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch (error) {
    console.log(`No MX records found for ${domain}`);
    return false;
  }
};

/**
 * Check SMTP deliverability (simplified version)
 */
const checkSmtpDeliverability = async (
  email: string,
  domain: string
): Promise<boolean | undefined> => {
  // Skip SMTP check for common providers (they block verification)
  const blockedDomains = [
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'icloud.com'
  ];

  if (blockedDomains.includes(domain.toLowerCase())) {
    return undefined; // Can't verify, but likely valid
  }

  // For MVP, return undefined (skip actual SMTP check)
  // Full implementation would connect to SMTP server
  return undefined;
};

/**
 * Batch validate emails
 */
export const batchValidateEmails = async (
  emails: string[]
): Promise<EmailValidationResult[]> => {
  const results = await Promise.all(
    emails.map(email => validateEmail(email))
  );
  return results;
};

export default {
  validateEmail,
  batchValidateEmails
};