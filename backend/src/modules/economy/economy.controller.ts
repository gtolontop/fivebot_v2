import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EconomyService } from './economy.service';
import { ShopService } from './shop.service';
import {
  UpdateEconomyConfigDto,
  UpdateBalanceDto,
  CreateShopItemDto,
  UpdateShopItemDto,
  BuyItemDto,
  SellItemDto,
  GambleDto,
  TransferDto,
  DepositWithdrawDto,
  BalanceUpdateType,
} from './dto';
import { EconomyTransType } from '@prisma/client';

@Controller('bots/:botId/economy')
@UseGuards(JwtAuthGuard)
export class EconomyController {
  constructor(
    private readonly economyService: EconomyService,
    private readonly shopService: ShopService,
  ) {}

  // ==================== CONFIG ====================

  @Get('config')
  async getConfig(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.getOrCreateConfig(guildId, botId);
  }

  @Put('config')
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() updateDto: UpdateEconomyConfigDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.updateConfig(guildId, updateDto);
  }

  // ==================== LEADERBOARD ====================

  @Get('leaderboard')
  async getLeaderboard(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.getLeaderboard(guildId, page, limit);
  }

  // ==================== USER ECONOMY ====================

  @Get('user/:userId')
  async getUserStats(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.getUserStats(guildId, userId);
  }

  @Get('user/:userId/balance')
  async getBalance(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.getBalance(guildId, userId);
  }

  @Put('user/:userId/balance')
  async updateBalance(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
    @Body() updateDto: UpdateBalanceDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }

    switch (updateDto.type) {
      case BalanceUpdateType.ADD:
        return this.economyService.addMoney(
          guildId,
          botId,
          userId,
          updateDto.amount,
          EconomyTransType.TAX, // or custom type
          updateDto.description,
        );

      case BalanceUpdateType.REMOVE:
        return this.economyService.removeMoney(
          guildId,
          botId,
          userId,
          updateDto.amount,
          EconomyTransType.TAX,
          updateDto.description,
        );

      case BalanceUpdateType.SET:
        // Get current balance first
        const current = await this.economyService.getBalance(guildId, userId);
        const diff = updateDto.amount - current.balance;

        if (diff > 0) {
          return this.economyService.addMoney(
            guildId,
            botId,
            userId,
            diff,
            EconomyTransType.TAX,
            updateDto.description,
          );
        } else if (diff < 0) {
          return this.economyService.removeMoney(
            guildId,
            botId,
            userId,
            Math.abs(diff),
            EconomyTransType.TAX,
            updateDto.description,
          );
        }
        return current;

      default:
        return { error: 'Invalid update type' };
    }
  }

  @Post('user/:userId/reset')
  @HttpCode(HttpStatus.OK)
  async resetUser(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.resetUser(guildId, userId);
  }

  @Get('user/:userId/transactions')
  async getTransactionHistory(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.getTransactionHistory(guildId, userId, page, limit);
  }

  // ==================== BANK ====================

  @Post('user/:userId/deposit')
  @HttpCode(HttpStatus.OK)
  async deposit(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
    @Body() dto: DepositWithdrawDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.deposit(guildId, userId, dto.amount);
  }

  @Post('user/:userId/withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
    @Body() dto: DepositWithdrawDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.withdraw(guildId, userId, dto.amount);
  }

  // ==================== ACTIONS ====================

  @Post('user/:userId/daily')
  @HttpCode(HttpStatus.OK)
  async claimDaily(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.claimDaily(guildId, botId, userId);
  }

  @Post('user/:userId/work')
  @HttpCode(HttpStatus.OK)
  async work(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.work(guildId, botId, userId);
  }

  @Post('user/:userId/crime')
  @HttpCode(HttpStatus.OK)
  async crime(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.crime(guildId, botId, userId);
  }

  @Post('user/:userId/rob/:targetId')
  @HttpCode(HttpStatus.OK)
  async rob(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Param('targetId') targetId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.rob(guildId, botId, userId, targetId);
  }

  @Post('user/:userId/gamble')
  @HttpCode(HttpStatus.OK)
  async gamble(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
    @Body() dto: GambleDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.gamble(guildId, botId, userId, dto.amount, dto.type);
  }

  @Post('user/:userId/transfer')
  @HttpCode(HttpStatus.OK)
  async transfer(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
    @Body() dto: TransferDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.transferMoney(guildId, userId, dto.toUserId, dto.amount);
  }

  // ==================== SHOP ====================

  @Get('shop')
  async getShop(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('category') category?: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.shopService.getShopItems(guildId, category);
  }

  @Get('shop/categories')
  async getCategories(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.shopService.getCategories(guildId);
  }

  @Get('shop/:itemId')
  async getShopItem(
    @Param('botId') botId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.shopService.getItem(itemId);
  }

  @Post('shop')
  async createShopItem(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() createDto: CreateShopItemDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.shopService.createItem(guildId, createDto);
  }

  @Put('shop/:itemId')
  async updateShopItem(
    @Param('botId') botId: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateShopItemDto,
  ) {
    return this.shopService.updateItem(itemId, updateDto);
  }

  @Delete('shop/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShopItem(
    @Param('botId') botId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.shopService.deleteItem(itemId);
  }

  @Post('shop/:itemId/buy')
  @HttpCode(HttpStatus.OK)
  async buyItem(
    @Param('botId') botId: string,
    @Param('itemId') itemId: string,
    @Query('guildId') guildId: string,
    @Query('userId') userId: string,
    @Body() dto: BuyItemDto,
  ) {
    if (!guildId || !userId) {
      return { error: 'guildId and userId query parameters are required' };
    }
    return this.shopService.buyItem(guildId, userId, itemId, dto.quantity);
  }

  @Post('shop/:itemId/sell')
  @HttpCode(HttpStatus.OK)
  async sellItem(
    @Param('botId') botId: string,
    @Param('itemId') itemId: string,
    @Query('guildId') guildId: string,
    @Query('userId') userId: string,
    @Body() dto: SellItemDto,
  ) {
    if (!guildId || !userId) {
      return { error: 'guildId and userId query parameters are required' };
    }
    return this.shopService.sellItem(guildId, userId, itemId, dto.quantity);
  }

  // ==================== INVENTORY ====================

  @Get('user/:userId/inventory')
  async getUserInventory(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.shopService.getUserInventory(guildId, userId);
  }

  @Post('user/:userId/inventory/:itemId/use')
  @HttpCode(HttpStatus.OK)
  async useItem(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.shopService.useItem(guildId, userId, itemId);
  }

  // ==================== ADMIN ====================

  @Post('admin/process-interest')
  @HttpCode(HttpStatus.OK)
  async processInterest(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.economyService.processInterest(guildId);
  }

  @Post('admin/clean-expired')
  @HttpCode(HttpStatus.OK)
  async cleanExpired(@Param('botId') botId: string) {
    return this.shopService.cleanExpiredItems();
  }

  @Post('admin/restock')
  @HttpCode(HttpStatus.OK)
  async restock(@Param('botId') botId: string) {
    return this.shopService.restockItems();
  }
}
