import { Module } from '@nestjs/common';
import { InviteTrackerService } from './invite-tracker.service';
import { InviteTrackerController } from './invite-tracker.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InviteTrackerController],
  providers: [InviteTrackerService],
  exports: [InviteTrackerService],
})
export class InviteTrackerModule {}
