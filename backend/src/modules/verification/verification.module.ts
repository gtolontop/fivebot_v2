import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { CaptchaService } from './captcha.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VerificationController],
  providers: [VerificationService, CaptchaService],
  exports: [VerificationService, CaptchaService],
})
export class VerificationModule {}
