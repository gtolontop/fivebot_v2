import { PrismaClient } from '@prisma/client';

export interface LoadedModule {
  slug: string;
  name: string;
  enabled: boolean;
  config: any;
  isCore: boolean;
}

export class ModuleLoaderService {
  private prisma: PrismaClient;
  private botId: string;
  private modules: Map<string, LoadedModule> = new Map();

  constructor(prisma: PrismaClient, botId: string) {
    this.prisma = prisma;
    this.botId = botId;
  }

  async loadModules(): Promise<void> {
    try {
      const botModules = await this.prisma.botModule.findMany({
        where: {
          botId: this.botId,
          enabled: true,
        },
        include: {
          module: true,
        },
      });

      for (const botModule of botModules) {
        let config = {};
        if (botModule.config) {
          try {
            config = typeof botModule.config === 'string'
              ? JSON.parse(botModule.config)
              : botModule.config;
          } catch (e) {
            console.error(`Failed to parse config for module ${botModule.module.slug}:`, e);
          }
        }

        this.modules.set(botModule.module.slug, {
          slug: botModule.module.slug,
          name: botModule.module.name,
          enabled: botModule.enabled,
          config,
          isCore: botModule.module.isCore,
        });
      }

      console.log(`├─ Loaded ${this.modules.size} enabled module(s)`);
    } catch (error) {
      console.error('Failed to load modules:', error);
      throw error;
    }
  }

  isModuleEnabled(slug: string): boolean {
    const module = this.modules.get(slug);
    return module ? module.enabled : false;
  }

  getModuleConfig(slug: string): any {
    const module = this.modules.get(slug);
    return module ? module.config : {};
  }

  getAllModules(): LoadedModule[] {
    return Array.from(this.modules.values());
  }

  getEnabledModules(): LoadedModule[] {
    return this.getAllModules().filter(m => m.enabled);
  }
}
