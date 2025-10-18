import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ModuleCategory, Prisma } from '@prisma/client';

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== MODULE QUERIES ====================

  async findAll(filters?: {
    category?: ModuleCategory;
    search?: string;
    isCore?: boolean;
    priceMin?: number;
    priceMax?: number;
  }) {
    const where: Prisma.ModuleWhereInput = {
      isActive: true,
    };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { tags: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.isCore !== undefined) {
      where.isCore = filters.isCore;
    }

    if (filters?.priceMin !== undefined || filters?.priceMax !== undefined) {
      where.price = {};
      if (filters.priceMin !== undefined) {
        where.price.gte = filters.priceMin;
      }
      if (filters.priceMax !== undefined) {
        where.price.lte = filters.priceMax;
      }
    }

    return this.prisma.module.findMany({
      where,
      orderBy: [
        { isCore: 'desc' },
        { downloads: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findBySlug(slug: string) {
    const module = await this.prisma.module.findUnique({
      where: { slug },
    });

    if (!module) {
      throw new NotFoundException(`Module with slug "${slug}" not found`);
    }

    return module;
  }

  async findById(id: string) {
    const module = await this.prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }

    return module;
  }

  // ==================== USER MODULES ====================

  async getUserModules(userId: string) {
    return this.prisma.userModule.findMany({
      where: { userId },
      include: {
        module: true,
      },
      orderBy: {
        purchasedAt: 'desc',
      },
    });
  }

  async userOwnsModule(userId: string, moduleId: string): Promise<boolean> {
    // Check if module is core (always owned)
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (module?.isCore) {
      return true;
    }

    // Check if user has it in their collection (purchased or claimed)
    const userModule = await this.prisma.userModule.findUnique({
      where: {
        userId_moduleId: { userId, moduleId },
      },
    });

    return !!userModule;
  }

  async purchaseModule(userId: string, moduleId: string) {
    // Get module details
    const module = await this.findById(moduleId);

    // Check if module is purchasable
    if (!module.isActive) {
      throw new BadRequestException('This module is not available for purchase');
    }

    if (module.isCore) {
      throw new BadRequestException('Core modules cannot be purchased (they are included by default)');
    }

    // Check if already owned
    const alreadyOwned = await this.userOwnsModule(userId, moduleId);
    if (alreadyOwned) {
      throw new BadRequestException('You already own this module');
    }

    // Get user credits
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has enough credits
    if (user.credits < module.price) {
      throw new ForbiddenException(`Insufficient credits. Required: ${module.price}, Available: ${user.credits}`);
    }

    // Perform transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct credits
      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: module.price } },
      });

      // Create purchase record
      const userModule = await tx.userModule.create({
        data: {
          userId,
          moduleId,
          paymentAmount: module.price,
        },
        include: {
          module: true,
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: 'MODULE_PURCHASE',
          amount: -module.price,
          description: `Purchased module: ${module.name}`,
          metadata: JSON.stringify({
            moduleId: module.id,
            moduleName: module.name,
            moduleSlug: module.slug,
          }),
          status: 'COMPLETED',
        },
      });

      // Increment module downloads
      await tx.module.update({
        where: { id: moduleId },
        data: { downloads: { increment: 1 } },
      });

      return userModule;
    });

    return result;
  }

  // ==================== BOT MODULES ====================

  async getBotModules(botId: string) {
    return this.prisma.botModule.findMany({
      where: { botId },
      include: {
        module: true,
      },
      orderBy: [
        { module: { isCore: 'desc' } },
        { module: { name: 'asc' } },
      ],
    });
  }

  async getBotModule(botId: string, moduleId: string) {
    const botModule = await this.prisma.botModule.findUnique({
      where: {
        botId_moduleId: { botId, moduleId },
      },
      include: {
        module: true,
      },
    });

    if (!botModule) {
      throw new NotFoundException('Module not installed on this bot');
    }

    return botModule;
  }

  async installModuleOnBot(userId: string, botId: string, moduleId: string) {
    // Verify bot ownership or collaboration
    const bot = await this.prisma.bot.findFirst({
      where: {
        id: botId,
        OR: [
          { ownerId: userId },
          {
            collaborators: {
              some: {
                userId,
                status: 'ACTIVE',
                role: { in: ['ADMIN', 'DEVELOPER'] },
              },
            },
          },
        ],
      },
    });

    if (!bot) {
      throw new ForbiddenException('You do not have permission to manage this bot');
    }

    // Verify user owns the module
    const ownsModule = await this.userOwnsModule(userId, moduleId);
    if (!ownsModule) {
      throw new ForbiddenException('You do not own this module. Purchase it first.');
    }

    // Check if already installed
    const existing = await this.prisma.botModule.findUnique({
      where: {
        botId_moduleId: { botId, moduleId },
      },
    });

    if (existing) {
      throw new BadRequestException('Module is already installed on this bot');
    }

    // Get module to check dependencies
    const module = await this.findById(moduleId);
    const dependencies = module.dependencies ? JSON.parse(module.dependencies) : [];

    // Verify dependencies are installed
    if (dependencies.length > 0) {
      const installedModules = await this.prisma.botModule.findMany({
        where: { botId },
        include: { module: true },
      });

      const installedSlugs = installedModules.map((bm) => bm.module.slug);
      const missingDeps = dependencies.filter((dep: string) => !installedSlugs.includes(dep));

      if (missingDeps.length > 0) {
        throw new BadRequestException(`Missing dependencies: ${missingDeps.join(', ')}`);
      }
    }

    // Install module
    const botModule = await this.prisma.botModule.create({
      data: {
        botId,
        moduleId,
        enabled: true,
      },
      include: {
        module: true,
      },
    });

    return botModule;
  }

  async uninstallModuleFromBot(userId: string, botId: string, moduleId: string) {
    // Verify bot ownership or collaboration
    const bot = await this.prisma.bot.findFirst({
      where: {
        id: botId,
        OR: [
          { ownerId: userId },
          {
            collaborators: {
              some: {
                userId,
                status: 'ACTIVE',
                role: { in: ['ADMIN', 'DEVELOPER'] },
              },
            },
          },
        ],
      },
    });

    if (!bot) {
      throw new ForbiddenException('You do not have permission to manage this bot');
    }

    // Get module
    const botModule = await this.prisma.botModule.findUnique({
      where: {
        botId_moduleId: { botId, moduleId },
      },
      include: { module: true },
    });

    if (!botModule) {
      throw new NotFoundException('Module not installed on this bot');
    }

    // Prevent uninstalling core modules
    if (botModule.module.isCore) {
      throw new BadRequestException('Cannot uninstall core modules');
    }

    // Check if other modules depend on this one
    const installedModules = await this.prisma.botModule.findMany({
      where: { botId },
      include: { module: true },
    });

    for (const installed of installedModules) {
      if (installed.moduleId === moduleId) continue;

      const deps = installed.module.dependencies ? JSON.parse(installed.module.dependencies) : [];
      if (deps.includes(botModule.module.slug)) {
        throw new BadRequestException(
          `Cannot uninstall: Module "${installed.module.name}" depends on this module`,
        );
      }
    }

    // Uninstall
    await this.prisma.botModule.delete({
      where: {
        botId_moduleId: { botId, moduleId },
      },
    });

    return { success: true };
  }

  async toggleModuleOnBot(userId: string, botId: string, moduleId: string, enabled: boolean) {
    // Verify bot ownership or collaboration
    const bot = await this.prisma.bot.findFirst({
      where: {
        id: botId,
        OR: [
          { ownerId: userId },
          {
            collaborators: {
              some: {
                userId,
                status: 'ACTIVE',
                role: { in: ['ADMIN', 'DEVELOPER'] },
              },
            },
          },
        ],
      },
    });

    if (!bot) {
      throw new ForbiddenException('You do not have permission to manage this bot');
    }

    // Get bot module
    const botModule = await this.prisma.botModule.findUnique({
      where: {
        botId_moduleId: { botId, moduleId },
      },
      include: { module: true },
    });

    if (!botModule) {
      throw new NotFoundException('Module not installed on this bot');
    }

    // Core modules cannot be disabled
    if (botModule.module.isCore && !enabled) {
      throw new BadRequestException('Core modules cannot be disabled');
    }

    // Update status
    const updated = await this.prisma.botModule.update({
      where: {
        botId_moduleId: { botId, moduleId },
      },
      data: { enabled },
      include: { module: true },
    });

    return updated;
  }

  async updateBotModuleConfig(userId: string, botId: string, moduleId: string, config: any) {
    // Verify bot ownership or collaboration
    const bot = await this.prisma.bot.findFirst({
      where: {
        id: botId,
        OR: [
          { ownerId: userId },
          {
            collaborators: {
              some: {
                userId,
                status: 'ACTIVE',
                role: { in: ['ADMIN', 'DEVELOPER'] },
              },
            },
          },
        ],
      },
    });

    if (!bot) {
      throw new ForbiddenException('You do not have permission to manage this bot');
    }

    // Get bot module
    const botModule = await this.prisma.botModule.findUnique({
      where: {
        botId_moduleId: { botId, moduleId },
      },
    });

    if (!botModule) {
      throw new NotFoundException('Module not installed on this bot');
    }

    // Update config
    const updated = await this.prisma.botModule.update({
      where: {
        botId_moduleId: { botId, moduleId },
      },
      data: {
        config: JSON.stringify(config),
      },
      include: { module: true },
    });

    return updated;
  }
}
