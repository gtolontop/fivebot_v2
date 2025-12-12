import { Module } from '@nestjs/common';
import { ReactionRolesService } from './reaction-roles.service';
import { ReactionRolesController } from './reaction-roles.controller';

@Module({
  controllers: [ReactionRolesController],
  providers: [ReactionRolesService],
  exports: [ReactionRolesService],
})
export class ReactionRolesModule {}
