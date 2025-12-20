import { Module } from '@nestjs/common';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import { ModuleSeederService } from './module-seeder.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ModulesController],
  providers: [ModulesService, ModuleSeederService],
  exports: [ModulesService, ModuleSeederService],
})
export class ModulesModule {}
