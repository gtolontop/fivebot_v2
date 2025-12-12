import { Injectable, Logger } from '@nestjs/common';
import { createCanvas } from 'canvas';

export interface CaptchaResult {
  image: Buffer;
  text: string;
  sessionId: string;
}

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly captchaSessions = new Map<string, { text: string; expiresAt: number; attempts: number }>();

  /**
   * Generate a random captcha text
   */
  private generateCaptchaText(length: number): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  /**
   * Generate a random color
   */
  private randomColor(min: number = 0, max: number = 255): string {
    const r = Math.floor(Math.random() * (max - min) + min);
    const g = Math.floor(Math.random() * (max - min) + min);
    const b = Math.floor(Math.random() * (max - min) + min);
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Generate a captcha image
   */
  async generateCaptcha(length: number = 6, userId: string, guildId: string): Promise<CaptchaResult> {
    const text = this.generateCaptchaText(length);
    const sessionId = `${guildId}_${userId}_${Date.now()}`;

    // Create canvas
    const width = 200;
    const height = 80;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);

    // Add noise lines
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = this.randomColor(100, 200);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // Add noise dots
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = this.randomColor(100, 200);
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        1,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }

    // Draw text with different fonts, sizes, and rotations
    const fontSize = 30;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = 'middle';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const x = 20 + i * (width - 40) / text.length;
      const y = height / 2;

      ctx.save();
      ctx.translate(x, y);

      // Random rotation
      const rotation = (Math.random() - 0.5) * 0.4;
      ctx.rotate(rotation);

      // Random color
      ctx.fillStyle = this.randomColor(0, 100);

      // Draw character with shadow
      ctx.shadowColor = this.randomColor(150, 200);
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillText(char, 0, 0);
      ctx.restore();
    }

    // Convert to buffer
    const buffer = canvas.toBuffer('image/png');

    // Store session
    this.captchaSessions.set(sessionId, {
      text,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      attempts: 0,
    });

    this.logger.log(`Generated captcha for user ${userId} in guild ${guildId}`);

    return {
      image: buffer,
      text, // In production, don't return this to client
      sessionId,
    };
  }

  /**
   * Verify a captcha answer
   */
  verifyCaptcha(sessionId: string, answer: string, maxAttempts: number = 3): {
    success: boolean;
    reason?: string;
  } {
    const session = this.captchaSessions.get(sessionId);

    if (!session) {
      return { success: false, reason: 'Invalid or expired session' };
    }

    if (Date.now() > session.expiresAt) {
      this.captchaSessions.delete(sessionId);
      return { success: false, reason: 'Session expired' };
    }

    session.attempts++;

    if (session.attempts > maxAttempts) {
      this.captchaSessions.delete(sessionId);
      return { success: false, reason: 'Too many attempts' };
    }

    if (answer.toLowerCase() === session.text.toLowerCase()) {
      this.captchaSessions.delete(sessionId);
      return { success: true };
    }

    return { success: false, reason: 'Incorrect answer' };
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.captchaSessions.entries()) {
      if (now > session.expiresAt) {
        this.captchaSessions.delete(sessionId);
      }
    }
  }

  /**
   * Delete a captcha session
   */
  deleteSession(sessionId: string): void {
    this.captchaSessions.delete(sessionId);
  }
}
