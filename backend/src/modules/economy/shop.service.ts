import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ShopItemType, EconomyTransType } from '@prisma/client';
import { CreateShopItemDto, UpdateShopItemDto } from './dto';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== SHOP ITEMS ====================

  async getShopItems(guildId: string, category?: string) {
    const config = await this.prisma.economyConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException('Economy config not found');
    }

    const where: any = {
      configId: config.id,
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    return this.prisma.shopItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { price: 'asc' }],
    });
  }

  async getItem(itemId: string) {
    const item = await this.prisma.shopItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return item;
  }

  async createItem(guildId: string, data: CreateShopItemDto) {
    const config = await this.prisma.economyConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException('Economy config not found');
    }

    // Validate item type specific fields
    if (data.type === ShopItemType.ROLE && !data.roleId) {
      throw new BadRequestException('Role ID is required for ROLE items');
    }

    return this.prisma.shopItem.create({
      data: {
        ...data,
        configId: config.id,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateItem(itemId: string, data: UpdateShopItemDto) {
    const item = await this.prisma.shopItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Validate type-specific fields
    if (data.type === ShopItemType.ROLE && !data.roleId && !item.roleId) {
      throw new BadRequestException('Role ID is required for ROLE items');
    }

    return this.prisma.shopItem.update({
      where: { id: itemId },
      data,
    });
  }

  async deleteItem(itemId: string) {
    const item = await this.prisma.shopItem.findUnique({
      where: { id: itemId },
      include: {
        _count: {
          select: { userInventory: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Soft delete if item is owned by users
    if (item._count.userInventory > 0) {
      return this.prisma.shopItem.update({
        where: { id: itemId },
        data: { isActive: false },
      });
    }

    // Hard delete if not owned
    return this.prisma.shopItem.delete({
      where: { id: itemId },
    });
  }

  // ==================== BUYING/SELLING ====================

  async buyItem(guildId: string, userId: string, itemId: string, quantity: number = 1) {
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    return this.prisma.$transaction(async (tx) => {
      // Get item
      const item = await tx.shopItem.findUnique({
        where: { id: itemId },
      });

      if (!item || !item.isActive) {
        throw new NotFoundException('Item not found or not available');
      }

      // Check stock
      if (item.maxStock !== null) {
        if (item.currentStock === null || item.currentStock < quantity) {
          throw new BadRequestException('Insufficient stock');
        }
      }

      // Get user economy
      const userEconomy = await tx.userEconomy.findFirst({
        where: { guildId, userId },
      });

      if (!userEconomy) {
        throw new NotFoundException('User economy not found');
      }

      // Check if user has required level (requires leveling system integration)
      // TODO: Integrate with LevelingService to check user level
      // if (item.requiredLevel) {
      //   const userLevel = await levelingService.getUserLevel(guildId, userId);
      //   if (userLevel.level < item.requiredLevel) {
      //     throw new ForbiddenException(`Requires level ${item.requiredLevel}`);
      //   }
      // }

      // Check if user has required role (would need Discord API integration)

      // Check balance
      const totalCost = item.price * quantity;
      if (userEconomy.balance < totalCost) {
        throw new BadRequestException('Insufficient balance');
      }

      // Check max owned
      const existingInventory = await tx.userInventory.findUnique({
        where: {
          economyId_itemId: {
            economyId: userEconomy.id,
            itemId: item.id,
          },
        },
      });

      if (existingInventory) {
        if (item.maxOwned && existingInventory.quantity + quantity > item.maxOwned) {
          throw new BadRequestException(`Maximum owned: ${item.maxOwned}`);
        }
      } else {
        if (item.maxOwned && quantity > item.maxOwned) {
          throw new BadRequestException(`Maximum owned: ${item.maxOwned}`);
        }
      }

      // Deduct balance
      const balanceBefore = userEconomy.balance;
      const balanceAfter = balanceBefore - totalCost;

      await tx.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          balance: balanceAfter,
          totalSpent: { increment: totalCost },
        },
      });

      // Record transaction
      await tx.economyTransaction.create({
        data: {
          economyId: userEconomy.id,
          type: EconomyTransType.SHOP_BUY,
          amount: -totalCost,
          balanceBefore,
          balanceAfter,
          description: `Bought ${quantity}x ${item.name}`,
          metadata: JSON.stringify({ itemId: item.id, quantity }),
        },
      });

      // Update stock
      if (item.maxStock !== null && item.currentStock !== null) {
        await tx.shopItem.update({
          where: { id: item.id },
          data: {
            currentStock: item.currentStock - quantity,
          },
        });
      }

      // Add to inventory or update quantity
      let inventory;
      if (existingInventory) {
        inventory = await tx.userInventory.update({
          where: { id: existingInventory.id },
          data: {
            quantity: existingInventory.quantity + quantity,
          },
        });
      } else {
        // Calculate expiry if item has duration
        const expiresAt = item.duration
          ? new Date(Date.now() + item.duration * 1000)
          : null;

        inventory = await tx.userInventory.create({
          data: {
            economyId: userEconomy.id,
            itemId: item.id,
            quantity,
            expiresAt,
          },
        });
      }

      return {
        item,
        quantity,
        totalCost,
        inventory,
        newBalance: balanceAfter,
      };
    });
  }

  async sellItem(guildId: string, userId: string, itemId: string, quantity: number = 1) {
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    return this.prisma.$transaction(async (tx) => {
      // Get item
      const item = await tx.shopItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new NotFoundException('Item not found');
      }

      // Get user economy
      const userEconomy = await tx.userEconomy.findFirst({
        where: { guildId, userId },
      });

      if (!userEconomy) {
        throw new NotFoundException('User economy not found');
      }

      // Get inventory
      const inventory = await tx.userInventory.findUnique({
        where: {
          economyId_itemId: {
            economyId: userEconomy.id,
            itemId: item.id,
          },
        },
      });

      if (!inventory || inventory.quantity < quantity) {
        throw new BadRequestException('Insufficient items in inventory');
      }

      // Calculate sell price (50% refund)
      const refundPercent = 50;
      const sellPrice = Math.floor((item.price * refundPercent) / 100);
      const totalRefund = sellPrice * quantity;

      // Add balance
      const balanceBefore = userEconomy.balance;
      const balanceAfter = balanceBefore + totalRefund;

      await tx.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          balance: balanceAfter,
          totalEarned: { increment: totalRefund },
        },
      });

      // Record transaction
      await tx.economyTransaction.create({
        data: {
          economyId: userEconomy.id,
          type: EconomyTransType.SHOP_SELL,
          amount: totalRefund,
          balanceBefore,
          balanceAfter,
          description: `Sold ${quantity}x ${item.name}`,
          metadata: JSON.stringify({ itemId: item.id, quantity }),
        },
      });

      // Update inventory
      if (inventory.quantity === quantity) {
        await tx.userInventory.delete({
          where: { id: inventory.id },
        });
      } else {
        await tx.userInventory.update({
          where: { id: inventory.id },
          data: {
            quantity: inventory.quantity - quantity,
          },
        });
      }

      // Restore stock if applicable
      if (item.maxStock !== null && item.currentStock !== null) {
        await tx.shopItem.update({
          where: { id: item.id },
          data: {
            currentStock: item.currentStock + quantity,
          },
        });
      }

      return {
        item,
        quantity,
        totalRefund,
        newBalance: balanceAfter,
      };
    });
  }

  // ==================== INVENTORY ====================

  async getUserInventory(guildId: string, userId: string) {
    const userEconomy = await this.prisma.userEconomy.findFirst({
      where: { guildId, userId },
    });

    if (!userEconomy) {
      return [];
    }

    // Clean up expired items first
    await this.prisma.userInventory.deleteMany({
      where: {
        economyId: userEconomy.id,
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    // Get current inventory
    return this.prisma.userInventory.findMany({
      where: {
        economyId: userEconomy.id,
      },
      include: {
        item: true,
      },
      orderBy: [{ acquiredAt: 'desc' }],
    });
  }

  async useItem(guildId: string, userId: string, itemId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Get user economy
      const userEconomy = await tx.userEconomy.findFirst({
        where: { guildId, userId },
      });

      if (!userEconomy) {
        throw new NotFoundException('User economy not found');
      }

      // Get inventory
      const inventory = await tx.userInventory.findUnique({
        where: {
          economyId_itemId: {
            economyId: userEconomy.id,
            itemId,
          },
        },
        include: {
          item: true,
        },
      });

      if (!inventory || inventory.quantity < 1) {
        throw new BadRequestException('Item not found in inventory');
      }

      const item = inventory.item;

      // Check if item is expired
      if (inventory.expiresAt && inventory.expiresAt < new Date()) {
        await tx.userInventory.delete({
          where: { id: inventory.id },
        });
        throw new BadRequestException('Item has expired');
      }

      // Handle item usage based on type
      let result: any = { success: true };

      switch (item.type) {
        case ShopItemType.CONSUMABLE:
          // Decrease quantity or remove
          if (inventory.quantity === 1) {
            await tx.userInventory.delete({
              where: { id: inventory.id },
            });
          } else {
            await tx.userInventory.update({
              where: { id: inventory.id },
              data: {
                quantity: inventory.quantity - 1,
              },
            });
          }
          result.consumed = true;
          break;

        case ShopItemType.ROLE:
          // Role assignment would require Discord API integration
          result.message = 'Role assignment requires Discord integration';
          break;

        case ShopItemType.BOOST:
          // Apply boost effect (would need additional implementation)
          result.message = 'Boost activated';
          break;

        case ShopItemType.BADGE:
        case ShopItemType.COSMETIC:
          result.message = 'Cosmetic item equipped';
          break;

        case ShopItemType.CUSTOM:
          // Custom logic would be implemented here
          result.message = 'Custom item used';
          break;

        default:
          throw new BadRequestException('Cannot use this item type');
      }

      return {
        item,
        result,
      };
    });
  }

  // ==================== UTILITY ====================

  async cleanExpiredItems() {
    const deleted = await this.prisma.userInventory.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    return { deleted: deleted.count };
  }

  async restockItems() {
    const items = await this.prisma.shopItem.findMany({
      where: {
        maxStock: { not: null },
        currentStock: { not: null },
      },
    });

    let restocked = 0;

    for (const item of items) {
      if (item.currentStock! < item.maxStock!) {
        await this.prisma.shopItem.update({
          where: { id: item.id },
          data: {
            currentStock: item.maxStock,
          },
        });
        restocked++;
      }
    }

    return { restocked };
  }

  // ==================== CATEGORIES ====================

  async getCategories(guildId: string) {
    const config = await this.prisma.economyConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException('Economy config not found');
    }

    const categories = await this.prisma.shopItem.findMany({
      where: {
        configId: config.id,
        isActive: true,
        category: { not: null },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
    });

    return categories.map((c) => c.category).filter(Boolean);
  }
}
