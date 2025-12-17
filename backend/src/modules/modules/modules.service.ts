import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ModuleCategory } from '@prisma/client';
import {
  PREDEFINED_MODULES,
  ModuleDefinition,
  getModuleDefinition,
  getAllModuleDefinitions
} from './module-definitions';
import * as crypto from 'crypto';

/**
 * Generate a deterministic UUID from a slug
 * This allows us to have consistent IDs without storing in DB
 */
function slugToId(slug: string): string {
  const hash = crypto.createHash('md5').update(`fivebot-module-${slug}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Convert a ModuleDefinition to API response format
 */
function toModuleResponse(def: ModuleDefinition) {
  return {
    id: slugToId(def.slug),
    slug: def.slug,
    name: def.name,
    description: def.description,
    longDescription: def.longDescription,
    category: def.category,
    price: def.price,
    icon: def.icon,
    banner: null,
    version: def.version,
    author: def.author,
    tags: JSON.stringify(def.tags),
    features: JSON.stringify(def.features),
    screenshots: null,
    dependencies: JSON.stringify(def.dependencies),
    configSchema: JSON.stringify(def.configSchema),
    isCore: def.isCore,
    isActive: true,
    downloads: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  };
}

/**
 * Find module definition by ID (either generated ID or slug)
 */
function findModuleDefById(id: string): ModuleDefinition | undefined {
  let def = getModuleDefinition(id);
  if (def) return def;
  return PREDEFINED_MODULES.find(m => slugToId(m.slug) === id);
}

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== MODULE QUERIES (CODE-FIRST) ====================

  async findAll(filters?: {
    category?: ModuleCategory;
    search?: string;
    isCore?: boolean;
    priceMin?: number;
    priceMax?: number;
  }) {
    let modules = getAllModuleDefinitions();

    if (filters?.category) {
      modules = modules.filter(m => m.category === filters.category);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      modules = modules.filter(m =>
        m.name.toLowerCase().includes(searchLower) ||
        m.description.toLowerCase().includes(searchLower) ||
        m.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (filters?.isCore !== undefined) {
      modules = modules.filter(m => m.isCore === filters.isCore);
    }

    if (filters?.priceMin !== undefined) {
      modules = modules.filter(m => m.price >= filters.priceMin!);
    }

    if (filters?.priceMax !== undefined) {
      modules = modules.filter(m => m.price <= filters.priceMax!);
    }

    modules.sort((a, b) => {
      if (a.isCore !== b.isCore) return a.isCore ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return modules.map(toModuleResponse);
  }

  async findBySlug(slug: string) {
    const def = getModuleDefinition(slug);
    if (!def) {
      throw new NotFoundException(`Module with slug "${slug}" not found`);
    }
    return toModuleResponse(def);
  }

  async findById(id: string) {
    const def = findModuleDefById(id);
    if (!def) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }
    return toModuleResponse(def);
  }

  getModuleDefinitionBySlug(slug: string): ModuleDefinition | undefined {
    return getModuleDefinition(slug);
  }

  getModuleDefinitionById(id: string): ModuleDefinition | undefined {
    return findModuleDefById(id);
  }

  getModuleId(slug: string): string {
    return slugToId(slug);
  }

  // ==================== USER MODULES (CODE-FIRST) ====================

  async getUserModules(userId: string) {
    const purchasedModules = await this.prisma.userModule.findMany({
      where: { userId },
      orderBy: { purchasedAt: 'desc' },
    });

    const purchasedSlugs = new Set<string>();

    for (const pm of purchasedModules) {
      const oldModule = await this.prisma.module.findUnique({
        where: { id: pm.moduleId },
        select: { slug: true },
      }).catch(() => null);

      if (oldModule) {
        purchasedSlugs.add(oldModule.slug);
      } else {
        const def = findModuleDefById(pm.moduleId);
        if (def) {
          purchasedSlugs.add(def.slug);
        }
      }
    }

    const userModules = PREDEFINED_MODULES
      .filter(m => !m.isCore)
      .filter(m => {
        if (m.price === 0 && m.author === 'FiveBot') return true;
        return purchasedSlugs.has(m.slug);
      })
      .map(def => ({
        id: `user-${slugToId(def.slug)}`,
        userId,
        moduleId: slugToId(def.slug),
        purchasedAt: new Date(),
        paymentAmount: def.price,
        module: toModuleResponse(def),
      }));

    return userModules;
  }

  async userOwnsModule(userId: string, moduleIdOrSlug: string): Promise<boolean> {
    const def = findModuleDefById(moduleIdOrSlug);
    if (!def) return false;
    if (def.isCore) return true;
    if (def.price === 0 && def.author === 'FiveBot') return true;

    const newModuleId = slugToId(def.slug);
    const purchaseNew = await this.prisma.userModule.findUnique({
      where: { userId_moduleId: { userId, moduleId: newModuleId } },
    });
    if (purchaseNew) return true;

    const oldModule = await this.prisma.module.findUnique({
      where: { slug: def.slug },
      select: { id: true },
    }).catch(() => null);

    if (oldModule) {
      const purchaseOld = await this.prisma.userModule.findUnique({
        where: { userId_moduleId: { userId, moduleId: oldModule.id } },
      });
      if (purchaseOld) return true;
    }

    return false;
  }

  async purchaseModule(userId: string, moduleIdOrSlug: string) {
    const def = findModuleDefById(moduleIdOrSlug);
    if (!def) throw new NotFoundException(`Module not found`);
    if (def.isCore) throw new BadRequestException('Core modules cannot be purchased');
    if (def.price === 0 && def.author === 'FiveBot') {
      throw new BadRequestException('This free FiveBot module is automatically available');
    }

    const alreadyOwned = await this.userOwnsModule(userId, def.slug);
    if (alreadyOwned) throw new BadRequestException('You already own this module');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.credits < def.price) {
      throw new ForbiddenException(`Insufficient credits. Required: ${def.price}, Available: ${user.credits}`);
    }

    const moduleId = slugToId(def.slug);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: def.price } },
      });

      const userModule = await tx.userModule.create({
        data: { userId, moduleId, paymentAmount: def.price },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'MODULE_PURCHASE',
          amount: -def.price,
          description: `Purchased module: ${def.name}`,
          metadata: JSON.stringify({ moduleId, moduleName: def.name, moduleSlug: def.slug }),
          status: 'COMPLETED',
        },
      });

      return { ...userModule, module: toModuleResponse(def) };
    });

    return result;
  }

  // ==================== BOT MODULES (CODE-FIRST) ====================

  async getBotModules(botId: string) {
    const botModuleConfigs = await this.prisma.botModule.findMany({ where: { botId } });
    const installedMap = new Map<string, { enabled: boolean; config: any; installedAt: Date }>();

    for (const bm of botModuleConfigs) {
      let slug: string | null = null;
      const def = findModuleDefById(bm.moduleId);
      if (def) {
        slug = def.slug;
      } else {
        const oldModule = await this.prisma.module.findUnique({
          where: { id: bm.moduleId },
          select: { slug: true },
        }).catch(() => null);
        if (oldModule) slug = oldModule.slug;
      }

      if (slug) {
        installedMap.set(slug, {
          enabled: bm.enabled,
          config: bm.config ? JSON.parse(bm.config) : null,
          installedAt: bm.installedAt,
        });
      }
    }

    const result = [];
    for (const [slug, config] of installedMap) {
      const def = getModuleDefinition(slug);
      if (def) {
        result.push({
          id: `bot-${botId}-${slugToId(slug)}`,
          botId,
          moduleId: slugToId(slug),
          enabled: config.enabled,
          config: config.config ? JSON.stringify(config.config) : null,
          installedAt: config.installedAt,
          updatedAt: new Date(),
          module: toModuleResponse(def),
        });
      }
    }

    result.sort((a, b) => {
      if (a.module.isCore !== b.module.isCore) return a.module.isCore ? -1 : 1;
      return a.module.name.localeCompare(b.module.name);
    });

    return result;
  }

  async getBotModule(botId: string, moduleIdOrSlug: string) {
    const def = findModuleDefById(moduleIdOrSlug);
    if (!def) throw new NotFoundException('Module not found');

    const moduleId = slugToId(def.slug);
    let botModule = await this.prisma.botModule.findUnique({
      where: { botId_moduleId: { botId, moduleId } },
    });

    if (!botModule) {
      const oldModule = await this.prisma.module.findUnique({
        where: { slug: def.slug },
        select: { id: true },
      }).catch(() => null);
      if (oldModule) {
        botModule = await this.prisma.botModule.findUnique({
          where: { botId_moduleId: { botId, moduleId: oldModule.id } },
        });
      }
    }

    if (!botModule) throw new NotFoundException('Module not installed on this bot');
    return { ...botModule, module: toModuleResponse(def) };
  }

  async installModuleOnBot(userId: string, botId: string, moduleIdOrSlug: string) {
    const bot = await this.prisma.bot.findFirst({
      where: {
        id: botId,
        OR: [
          { ownerId: userId },
          { collaborators: { some: { userId, status: 'ACTIVE', role: { in: ['ADMIN', 'DEVELOPER'] } } } },
        ],
      },
    });
    if (!bot) throw new ForbiddenException('You do not have permission to manage this bot');

    const def = findModuleDefById(moduleIdOrSlug);
    if (!def) throw new NotFoundException('Module not found');

    const ownsModule = await this.userOwnsModule(userId, def.slug);
    if (!ownsModule) throw new ForbiddenException('You do not own this module. Purchase it first.');

    const moduleId = slugToId(def.slug);

    const existingNew = await this.prisma.botModule.findUnique({
      where: { botId_moduleId: { botId, moduleId } },
    });
    if (existingNew) throw new BadRequestException('Module is already installed on this bot');

    const oldModule = await this.prisma.module.findUnique({
      where: { slug: def.slug },
      select: { id: true },
    }).catch(() => null);

    if (oldModule) {
      const existingOld = await this.prisma.botModule.findUnique({
        where: { botId_moduleId: { botId, moduleId: oldModule.id } },
      });
      if (existingOld) throw new BadRequestException('Module is already installed on this bot');
    }

    if (def.dependencies.length > 0) {
      const installedModules = await this.getBotModules(botId);
      const installedSlugs = installedModules.map(bm => bm.module.slug);
      const missingDeps = def.dependencies.filter(dep => !installedSlugs.includes(dep));
      if (missingDeps.length > 0) {
        throw new BadRequestException(`Missing dependencies: ${missingDeps.join(', ')}`);
      }
    }

    const botModule = await this.prisma.botModule.create({
      data: { botId, moduleId, enabled: true },
    });

    return { ...botModule, module: toModuleResponse(def) };
  }

  async uninstallModuleFromBot(userId: string, botId: string, moduleIdOrSlug: string) {
    const bot = await this.prisma.bot.findFirst({
      where: {
        id: botId,
        OR: [
          { ownerId: userId },
          { collaborators: { some: { userId, status: 'ACTIVE', role: { in: ['ADMIN', 'DEVELOPER'] } } } },
        ],
      },
    });
    if (!bot) throw new ForbiddenException('You do not have permission to manage this bot');

    const def = findModuleDefById(moduleIdOrSlug);
    if (!def) throw new NotFoundException('Module not found');
    if (def.isCore) throw new BadRequestException('Cannot uninstall core modules');

    const moduleId = slugToId(def.slug);
    let deleted = false;

    try {
      await this.prisma.botModule.delete({ where: { botId_moduleId: { botId, moduleId } } });
      deleted = true;
    } catch {
      const oldModule = await this.prisma.module.findUnique({
        where: { slug: def.slug },
        select: { id: true },
      }).catch(() => null);
      if (oldModule) {
        try {
          await this.prisma.botModule.delete({ where: { botId_moduleId: { botId, moduleId: oldModule.id } } });
          deleted = true;
        } catch { /* not installed */ }
      }
    }

    if (!deleted) throw new NotFoundException('Module not installed on this bot');

    const installedModules = await this.getBotModules(botId);
    for (const installed of installedModules) {
      const installedDef = getModuleDefinition(installed.module.slug);
      if (installedDef && installedDef.dependencies.includes(def.slug)) {
        await this.toggleModuleOnBot(userId, botId, installed.module.slug, false);
      }
    }

    return { success: true };
  }

  async toggleModuleOnBot(userId: string, botId: string, moduleIdOrSlug: string, enabled: boolean) {
    const bot = await this.prisma.bot.findFirst({
      where: {
        id: botId,
        OR: [
          { ownerId: userId },
          { collaborators: { some: { userId, status: 'ACTIVE', role: { in: ['ADMIN', 'DEVELOPER'] } } } },
        ],
      },
    });
    if (!bot) throw new ForbiddenException('You do not have permission to manage this bot');

    const def = findModuleDefById(moduleIdOrSlug);
    if (!def) throw new NotFoundException('Module not found');
    if (def.isCore && !enabled) throw new BadRequestException('Core modules cannot be disabled');

    const moduleId = slugToId(def.slug);
    let updated = null;

    try {
      updated = await this.prisma.botModule.update({
        where: { botId_moduleId: { botId, moduleId } },
        data: { enabled },
      });
    } catch {
      const oldModule = await this.prisma.module.findUnique({
        where: { slug: def.slug },
        select: { id: true },
      }).catch(() => null);
      if (oldModule) {
        try {
          updated = await this.prisma.botModule.update({
            where: { botId_moduleId: { botId, moduleId: oldModule.id } },
            data: { enabled },
          });
        } catch { /* not installed */ }
      }
    }

    if (!updated) throw new NotFoundException('Module not installed on this bot');
    return { ...updated, module: toModuleResponse(def) };
  }

  async updateBotModuleConfig(userId: string, botId: string, moduleIdOrSlug: string, config: any) {
    const bot = await this.prisma.bot.findFirst({
      where: {
        id: botId,
        OR: [
          { ownerId: userId },
          { collaborators: { some: { userId, status: 'ACTIVE', role: { in: ['ADMIN', 'DEVELOPER'] } } } },
        ],
      },
    });
    if (!bot) throw new ForbiddenException('You do not have permission to manage this bot');

    const def = findModuleDefById(moduleIdOrSlug);
    if (!def) throw new NotFoundException('Module not found');

    const moduleId = slugToId(def.slug);
    const configJson = JSON.stringify(config);
    let updated = null;

    try {
      updated = await this.prisma.botModule.update({
        where: { botId_moduleId: { botId, moduleId } },
        data: { config: configJson },
      });
    } catch {
      const oldModule = await this.prisma.module.findUnique({
        where: { slug: def.slug },
        select: { id: true },
      }).catch(() => null);
      if (oldModule) {
        try {
          updated = await this.prisma.botModule.update({
            where: { botId_moduleId: { botId, moduleId: oldModule.id } },
            data: { config: configJson },
          });
        } catch { /* not installed */ }
      }
    }

    if (!updated) throw new NotFoundException('Module not installed on this bot');

    if (def.slug === 'auto-role' && config.roles) {
      await this.prisma.botConfig.update({
        where: { botId },
        data: { autoRoleEnabled: true, autoRoleIds: JSON.stringify(config.roles) },
      }).catch(() => {});
    }

    return { ...updated, module: toModuleResponse(def) };
  }

  // ==================== MIGRATION HELPER ====================

  async migrateBotModulesToNewIds(botId: string) {
    const oldBotModules = await this.prisma.botModule.findMany({ where: { botId } });
    const migrated: string[] = [];

    for (const bm of oldBotModules) {
      const oldModule = await this.prisma.module.findUnique({
        where: { id: bm.moduleId },
        select: { slug: true },
      }).catch(() => null);

      if (oldModule) {
        const newId = slugToId(oldModule.slug);
        const existingNew = await this.prisma.botModule.findUnique({
          where: { botId_moduleId: { botId, moduleId: newId } },
        });

        if (!existingNew) {
          await this.prisma.botModule.create({
            data: { botId, moduleId: newId, enabled: bm.enabled, config: bm.config, installedAt: bm.installedAt },
          });
          await this.prisma.botModule.delete({ where: { id: bm.id } });
          migrated.push(oldModule.slug);
        }
      }
    }

    return { migrated };
  }
}
