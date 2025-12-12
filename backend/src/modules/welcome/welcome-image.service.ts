import { Injectable, Logger } from '@nestjs/common';
import { createCanvas, loadImage, Canvas, Image } from 'canvas';

export interface WelcomeImageConfig {
  welcomeImageBg?: string;
  welcomeImageColor?: string;
  welcomeImageFont?: string;
}

export interface MemberData {
  username: string;
  discriminator?: string;
  avatarUrl: string;
  memberCount: number;
  guildName: string;
}

@Injectable()
export class WelcomeImageService {
  private readonly logger = new Logger(WelcomeImageService.name);
  private readonly DEFAULT_BG_COLOR = '#23272A';
  private readonly DEFAULT_TEXT_COLOR = '#FFFFFF';
  private readonly DEFAULT_FONT = 'Arial';

  /**
   * Generate a welcome image for a member
   * @param member - Member data
   * @param config - Image configuration
   * @returns Buffer containing the generated image
   */
  async generateWelcomeImage(
    member: MemberData,
    config: WelcomeImageConfig,
  ): Promise<Buffer> {
    try {
      const canvas = createCanvas(800, 300);
      const ctx = canvas.getContext('2d');

      // Draw background
      await this.drawBackground(ctx, canvas, config.welcomeImageBg);

      // Draw overlay for better text visibility
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw avatar
      await this.drawAvatar(ctx, member.avatarUrl, 75, 150);

      // Draw text
      const textColor = config.welcomeImageColor || this.DEFAULT_TEXT_COLOR;
      const font = config.welcomeImageFont || this.DEFAULT_FONT;

      this.drawText(ctx, member, textColor, font);

      return canvas.toBuffer('image/png');
    } catch (error) {
      this.logger.error(
        `Failed to generate welcome image: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate a leave image for a member
   * @param member - Member data
   * @param config - Image configuration
   * @returns Buffer containing the generated image
   */
  async generateLeaveImage(
    member: MemberData,
    config: WelcomeImageConfig,
  ): Promise<Buffer> {
    try {
      const canvas = createCanvas(800, 300);
      const ctx = canvas.getContext('2d');

      // Draw background
      await this.drawBackground(ctx, canvas, config.welcomeImageBg);

      // Draw overlay for better text visibility
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw avatar
      await this.drawAvatar(ctx, member.avatarUrl, 75, 150);

      // Draw text (leave message)
      const textColor = config.welcomeImageColor || this.DEFAULT_TEXT_COLOR;
      const font = config.welcomeImageFont || this.DEFAULT_FONT;

      this.drawLeaveText(ctx, member, textColor, font);

      return canvas.toBuffer('image/png');
    } catch (error) {
      this.logger.error(
        `Failed to generate leave image: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Draw background on canvas
   * @param ctx - Canvas context
   * @param canvas - Canvas instance
   * @param bgConfig - Background configuration (color or image URL)
   */
  private async drawBackground(
    ctx: any,
    canvas: Canvas,
    bgConfig?: string,
  ): Promise<void> {
    if (!bgConfig) {
      // Default background color
      ctx.fillStyle = this.DEFAULT_BG_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Check if it's a color or URL
    if (bgConfig.startsWith('#') || bgConfig.startsWith('rgb')) {
      // It's a color
      ctx.fillStyle = bgConfig;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // It's an image URL
      try {
        const image = await loadImage(bgConfig);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      } catch (error) {
        this.logger.warn(
          `Failed to load background image, using default: ${error.message}`,
        );
        ctx.fillStyle = this.DEFAULT_BG_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  /**
   * Draw circular avatar on canvas
   * @param ctx - Canvas context
   * @param avatarUrl - Avatar image URL
   * @param radius - Circle radius
   * @param centerY - Vertical center position
   */
  private async drawAvatar(
    ctx: any,
    avatarUrl: string,
    radius: number,
    centerY: number,
  ): Promise<void> {
    try {
      const avatar = await loadImage(avatarUrl);

      // Draw circular clipping path
      ctx.save();
      ctx.beginPath();
      ctx.arc(150, centerY, radius, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      // Draw avatar
      ctx.drawImage(
        avatar,
        150 - radius,
        centerY - radius,
        radius * 2,
        radius * 2,
      );

      ctx.restore();

      // Draw border around avatar
      ctx.beginPath();
      ctx.arc(150, centerY, radius, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5;
      ctx.stroke();
    } catch (error) {
      this.logger.warn(
        `Failed to load avatar image: ${error.message}`,
      );
      // Draw a placeholder circle
      ctx.beginPath();
      ctx.arc(150, centerY, radius, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = '#7289DA';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5;
      ctx.stroke();
    }
  }

  /**
   * Draw welcome text on canvas
   * @param ctx - Canvas context
   * @param member - Member data
   * @param textColor - Text color
   * @param font - Font family
   */
  private drawText(
    ctx: any,
    member: MemberData,
    textColor: string,
    font: string,
  ): void {
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';

    // Welcome text
    ctx.font = `bold 40px ${font}`;
    ctx.fillText('WELCOME', 270, 120);

    // Username
    ctx.font = `bold 35px ${font}`;
    const displayName = member.discriminator
      ? `${member.username}#${member.discriminator}`
      : member.username;
    ctx.fillText(displayName, 270, 165);

    // Server info
    ctx.font = `25px ${font}`;
    ctx.fillText(`to ${member.guildName}`, 270, 200);

    // Member count
    ctx.font = `20px ${font}`;
    ctx.fillText(`Member #${member.memberCount}`, 270, 235);
  }

  /**
   * Draw leave text on canvas
   * @param ctx - Canvas context
   * @param member - Member data
   * @param textColor - Text color
   * @param font - Font family
   */
  private drawLeaveText(
    ctx: any,
    member: MemberData,
    textColor: string,
    font: string,
  ): void {
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';

    // Leave text
    ctx.font = `bold 40px ${font}`;
    ctx.fillText('GOODBYE', 270, 120);

    // Username
    ctx.font = `bold 35px ${font}`;
    const displayName = member.discriminator
      ? `${member.username}#${member.discriminator}`
      : member.username;
    ctx.fillText(displayName, 270, 165);

    // Server info
    ctx.font = `25px ${font}`;
    ctx.fillText(`from ${member.guildName}`, 270, 200);

    // Member count
    ctx.font = `20px ${font}`;
    ctx.fillText(`${member.memberCount} members remaining`, 270, 235);
  }
}
