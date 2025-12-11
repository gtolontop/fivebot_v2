import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PREDEFINED_MODULES, ModuleDefinition } from './module-definitions';
import { ModuleCategory } from '@prisma/client';

@Injectable()
export class ModuleSeederService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Only seed in development or when explicitly requested
    if (process.env.SEED_MODULES === 'true' || process.env.NODE_ENV === 'development') {
      console.log('🌱 Checking for module seeding...');
      await this.seedModules();
    }
  }

  /**
   * Seed predefined modules into the database
   */
  async seedModules(): Promise<{ created: number; updated: number; skipped: number }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const moduleDef of PREDEFINED_MODULES) {
      try {
        const existingModule = await this.prisma.module.findUnique({
          where: { slug: moduleDef.slug },
        });

        const moduleData = {
          slug: moduleDef.slug,
          name: moduleDef.name,
          description: moduleDef.description,
          longDescription: moduleDef.longDescription,
          category: moduleDef.category as ModuleCategory,
          price: moduleDef.price,
          icon: moduleDef.icon,
          version: moduleDef.version,
          author: moduleDef.author,
          tags: JSON.stringify(moduleDef.tags),
          features: JSON.stringify(moduleDef.features),
          dependencies: JSON.stringify(moduleDef.dependencies),
          configSchema: JSON.stringify(moduleDef.configSchema),
          isCore: moduleDef.isCore,
          isActive: true,
        };

        if (!existingModule) {
          // Create new module
          await this.prisma.module.create({
            data: moduleData,
          });
          console.log(`✅ Created module: ${moduleDef.name}`);
          created++;
        } else if (this.shouldUpdate(existingModule, moduleDef)) {
          // Update existing module if version changed
          await this.prisma.module.update({
            where: { slug: moduleDef.slug },
            data: moduleData,
          });
          console.log(`🔄 Updated module: ${moduleDef.name}`);
          updated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error seeding module ${moduleDef.slug}:`, error.message);
      }
    }

    console.log(`🌱 Module seeding complete: ${created} created, ${updated} updated, ${skipped} skipped`);
    return { created, updated, skipped };
  }

  /**
   * Check if module should be updated based on version
   */
  private shouldUpdate(existing: any, definition: ModuleDefinition): boolean {
    return existing.version !== definition.version;
  }

  /**
   * Get seeding status
   */
  async getSeedingStatus(): Promise<{
    totalPredefined: number;
    totalInDatabase: number;
    missing: string[];
    outdated: string[];
  }> {
    const allModules = await this.prisma.module.findMany({
      select: { slug: true, version: true },
    });

    const existingSlugs = new Set(allModules.map(m => m.slug));
    const existingVersions = new Map(allModules.map(m => [m.slug, m.version]));

    const missing: string[] = [];
    const outdated: string[] = [];

    for (const def of PREDEFINED_MODULES) {
      if (!existingSlugs.has(def.slug)) {
        missing.push(def.slug);
      } else if (existingVersions.get(def.slug) !== def.version) {
        outdated.push(def.slug);
      }
    }

    return {
      totalPredefined: PREDEFINED_MODULES.length,
      totalInDatabase: allModules.length,
      missing,
      outdated,
    };
  }

  /**
   * Force reseed all modules (admin only)
   */
  async forceReseed(): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const moduleDef of PREDEFINED_MODULES) {
      try {
        const moduleData = {
          slug: moduleDef.slug,
          name: moduleDef.name,
          description: moduleDef.description,
          longDescription: moduleDef.longDescription,
          category: moduleDef.category as ModuleCategory,
          price: moduleDef.price,
          icon: moduleDef.icon,
          version: moduleDef.version,
          author: moduleDef.author,
          tags: JSON.stringify(moduleDef.tags),
          features: JSON.stringify(moduleDef.features),
          dependencies: JSON.stringify(moduleDef.dependencies),
          configSchema: JSON.stringify(moduleDef.configSchema),
          isCore: moduleDef.isCore,
          isActive: true,
        };

        const result = await this.prisma.module.upsert({
          where: { slug: moduleDef.slug },
          create: moduleData,
          update: moduleData,
        });

        if (result) {
          const existing = await this.prisma.module.findUnique({
            where: { slug: moduleDef.slug },
          });
          if (existing?.createdAt.getTime() === existing?.updatedAt.getTime()) {
            created++;
          } else {
            updated++;
          }
        }
      } catch (error) {
        console.error(`❌ Error force-seeding module ${moduleDef.slug}:`, error.message);
      }
    }

    console.log(`🌱 Force reseed complete: ${created} created, ${updated} updated`);
    return { created, updated };
  }
}
