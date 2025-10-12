import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { WebhookClient } from 'discord.js';

@Controller('api/upload')
@UseGuards(AuthGuard('jwt'))
export class UploadController {
  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 8 * 1024 * 1024, // 8MB max
    },
    fileFilter: (req, file, cb) => {
      // Only allow images
      if (!file.mimetype.startsWith('image/')) {
        return cb(new BadRequestException('Only image files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      // Create a temporary webhook to upload the image to Discord CDN
      // This is a hack but it works - Discord stores the image permanently
      const webhookUrl = process.env.UPLOAD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1234567890/temp';

      if (webhookUrl === 'https://discord.com/api/webhooks/1234567890/temp') {
        throw new Error('UPLOAD_WEBHOOK_URL not configured');
      }

      const webhook = new WebhookClient({ url: webhookUrl });

      // Send the file to Discord
      const message = await webhook.send({
        content: 'File upload',
        files: [{
          attachment: file.buffer,
          name: file.originalname,
        }],
      });

      // Get the uploaded file URL from Discord CDN
      const attachments = Array.from(message.attachments.values());
      const attachment = attachments[0];

      if (!attachment) {
        throw new Error('Failed to get uploaded file URL');
      }

      return {
        success: true,
        url: attachment.url,
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new BadRequestException('Upload failed: ' + error.message);
    }
  }
}
