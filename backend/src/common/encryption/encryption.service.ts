import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: Buffer;

  constructor(private configService: ConfigService) {
    const encryptionKey = this.configService.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // Remove base64: prefix if present
    const key = encryptionKey.startsWith('base64:') 
      ? encryptionKey.slice(7) 
      : encryptionKey;
    
    this.secretKey = Buffer.from(key, 'base64');
    
    if (this.secretKey.length !== 32) {
      throw new Error('Encryption key must be 256 bits (32 bytes)');
    }
  }

  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipherGCM(this.algorithm, this.secretKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine iv, authTag, and encrypted data
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipherGCM(this.algorithm, this.secretKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  generateKey(): string {
    const key = crypto.randomBytes(32);
    return 'base64:' + key.toString('base64');
  }
}