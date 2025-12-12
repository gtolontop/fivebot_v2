import { Module } from '@nestjs/common';
import { WelcomeService } from './welcome.service';
import { WelcomeImageService } from './welcome-image.service';
import { WelcomeController } from './welcome.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WelcomeController],
  providers: [WelcomeService, WelcomeImageService],
  exports: [WelcomeService, WelcomeImageService],
})
export class WelcomeModule {}
