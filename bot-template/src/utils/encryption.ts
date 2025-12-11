import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

/**
 * Get encryption key from environment
 * Falls back to a warning in development mode
 */
function getEncryptionKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    // In development, use a default key with warning
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ENCRYPTION] No ENCRYPTION_KEY set, using default (NOT SECURE FOR PRODUCTION)');
      return crypto.scryptSync('default-dev-key', 'salt', 32);
    }
    throw new Error('ENCRYPTION_KEY environment variable is required in production');
  }

  // Remove base64: prefix if present
  const key = encryptionKey.startsWith('base64:')
    ? encryptionKey.slice(7)
    : encryptionKey;

  const keyBuffer = Buffer.from(key, 'base64');

  if (keyBuffer.length !== 32) {
    // If key is not proper base64, derive it
    return crypto.scryptSync(encryptionKey, 'fivebot-salt', 32);
  }

  return keyBuffer;
}

/**
 * Encrypt a string using AES-256-CBC
 */
export function encrypt(text: string): string {
  try {
    const secretKey = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error(`Encryption failed: ${(error as Error).message}`);
  }
}

/**
 * Decrypt a string encrypted with AES-256-CBC
 */
export function decrypt(encryptedData: string): string {
  try {
    // Check if data is in encrypted format (contains colon separator)
    if (!encryptedData.includes(':')) {
      // Data is not encrypted, return as-is (backwards compatibility)
      return encryptedData;
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      // Invalid format, return as-is
      return encryptedData;
    }

    const secretKey = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // If decryption fails, assume data is not encrypted (backwards compatibility)
    console.warn('[ENCRYPTION] Decryption failed, assuming plaintext');
    return encryptedData;
  }
}

/**
 * Check if a string appears to be encrypted
 */
export function isEncrypted(text: string): boolean {
  if (!text.includes(':')) return false;
  const parts = text.split(':');
  if (parts.length !== 2) return false;
  // Check if first part looks like a hex IV (32 chars for 16 bytes)
  return /^[a-f0-9]{32}$/i.test(parts[0]);
}
