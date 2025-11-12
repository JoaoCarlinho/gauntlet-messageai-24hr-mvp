import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 12 bytes for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM

// Load encryption key from environment
const ENCRYPTION_KEY_HEX = process.env.LINKEDIN_CREDENTIAL_KEY;

if (!ENCRYPTION_KEY_HEX) {
  throw new Error('LINKEDIN_CREDENTIAL_KEY environment variable is required');
}

if (ENCRYPTION_KEY_HEX.length !== KEY_LENGTH * 2) {
  throw new Error(`LINKEDIN_CREDENTIAL_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`);
}

const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');

if (ENCRYPTION_KEY.length !== KEY_LENGTH) {
  throw new Error(`Invalid encryption key length: ${ENCRYPTION_KEY.length} (expected ${KEY_LENGTH})`);
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string): EncryptedData {
  // Generate random IV (12 bytes for GCM mode)
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  // Encrypt
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  // Get authentication tag (ensures data integrity)
  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * @param encrypted - The encrypted data with IV and auth tag
 * @returns Decrypted plaintext
 * @throws Error if authentication fails (data tampered)
 */
export function decrypt(encrypted: EncryptedData): string {
  // Create decipher
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(encrypted.iv, 'hex')
  );

  // Set authentication tag (will verify on decrypt)
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));

  // Decrypt
  let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Hash email for non-reversible lookups
 * @param email - Email address to hash
 * @returns SHA-256 hash (64 hex characters)
 */
export function hashEmail(email: string): string {
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');
}

/**
 * Generate a random encryption key (for initial setup)
 * @returns 32-byte hex string (64 characters)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}
