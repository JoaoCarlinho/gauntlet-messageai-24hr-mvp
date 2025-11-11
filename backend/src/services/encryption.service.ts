import crypto from 'crypto';

/**
 * Encryption Service
 * Handles encryption/decryption of sensitive data fields
 */

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const salt = process.env.ENCRYPTION_SALT || 'messageai-salt';

/**
 * Encrypt sensitive data
 * @param text - Plain text to encrypt
 * @returns Encrypted string with IV and auth tag
 */
export const encrypt = (text: string): string => {
  try {
    const key = crypto.scryptSync(secretKey, salt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt sensitive data
 * @param encryptedText - Encrypted string with IV and auth tag
 * @returns Decrypted plain text
 */
export const decrypt = (encryptedText: string): string => {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const key = crypto.scryptSync(secretKey, salt, 32);
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hash sensitive data (one-way)
 * @param text - Text to hash
 * @returns SHA-256 hash
 */
export const hash = (text: string): string => {
  return crypto.createHash('sha256').update(text + salt).digest('hex');
};

/**
 * Encrypt object fields
 * @param obj - Object with fields to encrypt
 * @param fields - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export const encryptFields = (obj: any, fields: string[]): any => {
  const encrypted = { ...obj };

  for (const field of fields) {
    if (encrypted[field]) {
      encrypted[field] = encrypt(encrypted[field]);
    }
  }

  return encrypted;
};

/**
 * Decrypt object fields
 * @param obj - Object with encrypted fields
 * @param fields - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export const decryptFields = (obj: any, fields: string[]): any => {
  const decrypted = { ...obj };

  for (const field of fields) {
    if (decrypted[field]) {
      try {
        decrypted[field] = decrypt(decrypted[field]);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}`);
        decrypted[field] = null;
      }
    }
  }

  return decrypted;
};

export default {
  encrypt,
  decrypt,
  hash,
  encryptFields,
  decryptFields
};