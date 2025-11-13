import { 
  TicketConfigWithArrays,
  TicketCategory
} from './ticket.service';
import { ContainerType } from '@prisma/client';
import { Client, Guild, TextChannel, CategoryChannel } from 'discord.js';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  messageFr: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  messageFr: string;
}

export class TicketValidationService {
  private client: Client;
  private ticketService: any;

  constructor(client: Client, ticketService?: any) {
    this.client = client;
    this.ticketService = ticketService;
  }

  /**
   * Validate entire ticket configuration
   */
  async validateConfiguration(
    config: TicketConfigWithArrays | null,
    guildId: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!config) {
      errors.push({
        field: 'config',
        message: 'Ticket system is not configured. Please configure it in the dashboard.',
        messageFr: 'Le système de tickets n\'est pas configuré. Veuillez le configurer dans le tableau de bord.',
        severity: 'critical'
      });
      return { isValid: false, errors, warnings };
    }

    // Note: Ticket system enabled/disabled is controlled by BotConfig.ticketEnabled
    // If we reach this point, the ticket system is already enabled at the bot level
    // No need to check a separate 'enabled' field in TicketConfig

    // Validate container configuration
    await this.validateContainerConfiguration(config, guildId, errors, warnings);

    // Validate staff roles
    this.validateStaffRoles(config, errors, warnings);

    // Validate categories if using categorized tickets
    if (config.categories && config.categories.length > 0) {
      await this.validateCategories(config, guildId, errors, warnings);
    }

    // Validate naming pattern
    this.validateNamingPattern(config, errors, warnings);

    // Validate limits
    this.validateLimits(config, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate ticket creation for a specific user
   */
  async validateTicketCreation(
    config: TicketConfigWithArrays,
    guildId: string,
    userId: string,
    categoryId?: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // First run general configuration validation
    const configValidation = await this.validateConfiguration(config, guildId);
    if (!configValidation.isValid) {
      return configValidation;
    }

    // Validate user ticket limit
    if (config.maxTicketsPerUser > 0) {
      const userTickets = await this.getUserActiveTicketCount(guildId, userId);
      if (userTickets >= config.maxTicketsPerUser) {
        errors.push({
          field: 'userLimit',
          message: `You have reached the maximum limit of ${config.maxTicketsPerUser} active tickets. Please close an existing ticket before creating a new one.`,
          messageFr: `Vous avez atteint la limite maximale de ${config.maxTicketsPerUser} tickets actifs. Veuillez fermer un ticket existant avant d'en créer un nouveau.`,
          severity: 'error'
        });
      }
    }

    // Validate category if specified
    if (categoryId && categoryId !== 'general') {
      const category = config.categories?.find(c => c.id === categoryId);
      if (!category) {
        errors.push({
          field: 'category',
          message: 'The selected category does not exist. Please choose a valid category.',
          messageFr: 'La catégorie sélectionnée n\'existe pas. Veuillez choisir une catégorie valide.',
          severity: 'error'
        });
      } else if (!category.active) {
        errors.push({
          field: 'category',
          message: 'The selected category is currently inactive. Please choose another category.',
          messageFr: 'La catégorie sélectionnée est actuellement inactive. Veuillez choisir une autre catégorie.',
          severity: 'error'
        });
      } else {
        // Note: channelId doesn't exist in TicketCategory schema
        // Skipping category-specific channel validation
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate container configuration (thread vs channel)
   */
  private async validateContainerConfiguration(
    config: TicketConfigWithArrays,
    guildId: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Use the containerType from the config - it's already set correctly in the database
    const containerType = config.containerType || ContainerType.CHANNEL;
    
    if (containerType === ContainerType.THREAD) {
      // For thread mode, we need a support category where the hub channel will be created
      if (!config.supportCategoryId) {
        errors.push({
          field: 'supportCategoryId',
          message: 'Thread mode is enabled but no support category is set. Please configure a category where the ticket hub channel will be created.',
          messageFr: 'Le mode fil est activé mais aucune catégorie de support n\'est définie. Veuillez configurer une catégorie où le canal hub sera créé.',
          severity: 'critical'
        });
      }
    } else {
      // Channel mode - validate support category
      if (!config.supportCategoryId) {
        errors.push({
          field: 'supportCategoryId',
          message: 'Channel mode is enabled but no support category is set. Please configure a category where ticket channels will be created.',
          messageFr: 'Le mode canal est activé mais aucune catégorie de support n\'est définie. Veuillez configurer une catégorie où les canaux de tickets seront créés.',
          severity: 'critical'
        });
      } else {
        const validation = await this.validateCategory(config.supportCategoryId, guildId);
        if (!validation.isValid) {
          warnings.push({
            field: 'supportCategoryId',
            message: `The configured support category is invalid: ${validation.error}. Tickets will be created without a category.`,
            messageFr: `La catégorie de support configurée est invalide: ${validation.error}. Les tickets seront créés sans catégorie.`
          });
        }
      }
    }
  }

  /**
   * Validate staff roles configuration
   */
  private validateStaffRoles(
    config: TicketConfigWithArrays,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!config.staffRoles || config.staffRoles.length === 0) {
      warnings.push({
        field: 'staffRoles',
        message: 'No staff roles are configured. Only administrators will be able to manage tickets.',
        messageFr: 'Aucun rôle de personnel n\'est configuré. Seuls les administrateurs pourront gérer les tickets.'
      });
    }
  }

  /**
   * Validate ticket categories
   */
  private async validateCategories(
    config: TicketConfigWithArrays,
    guildId: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    if (!config.categories) return;

    const activeCategories = config.categories.filter(c => c.active);
    
    if (activeCategories.length === 0) {
      warnings.push({
        field: 'categories',
        message: 'No active categories are configured. Users will only be able to create general tickets.',
        messageFr: 'Aucune catégorie active n\'est configurée. Les utilisateurs ne pourront créer que des tickets généraux.'
      });
    }

    // Validate each category
    for (const category of activeCategories) {
      // Validate spawn category if specified
      if (category.spawnCategoryId) {
        const guild = this.client.guilds.cache.get(guildId);
        if (guild) {
          try {
            const spawnCategory = await guild.channels.fetch(category.spawnCategoryId).catch(() => null);
            if (!spawnCategory) {
              warnings.push({
                field: `category.${category.id}.spawnCategoryId`,
                message: `Category "${category.name}" has a spawn category configured, but the channel was not found.`,
                messageFr: `La catégorie "${category.name}" a une catégorie de spawn configurée, mais le canal est introuvable.`
              });
            }
          } catch (error) {
            // Silently skip if we can't validate
          }
        }
      }

      // Validate custom modal fields
      if (category.useCustomModal && category.modalFields) {
        const fields = category.modalFields as any[];
        if (fields.length === 0) {
          warnings.push({
            field: `category.${category.id}.modalFields`,
            message: `Category "${category.name}" has custom modal enabled but no fields configured.`,
            messageFr: `La catégorie "${category.name}" a le modal personnalisé activé mais aucun champ configuré.`
          });
        } else if (fields.length > 5) {
          errors.push({
            field: `category.${category.id}.modalFields`,
            message: `Category "${category.name}" has too many modal fields (${fields.length}). Maximum allowed is 5.`,
            messageFr: `La catégorie "${category.name}" a trop de champs modaux (${fields.length}). Le maximum autorisé est 5.`,
            severity: 'error'
          });
        }
      }
    }
  }

  /**
   * Validate naming pattern
   */
  private validateNamingPattern(
    config: TicketConfigWithArrays,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!config.namingPattern || config.namingPattern.trim() === '') {
      errors.push({
        field: 'namingPattern',
        message: 'Naming pattern is not configured. Please set a naming pattern for ticket channels/threads.',
        messageFr: 'Le modèle de nommage n\'est pas configuré. Veuillez définir un modèle de nommage pour les canaux/fils de tickets.',
        severity: 'error'
      });
    } else {
      // Check if pattern contains at least one variable
      if (!config.namingPattern.includes('{')) {
        warnings.push({
          field: 'namingPattern',
          message: 'Naming pattern does not contain any variables. All tickets will have the same name.',
          messageFr: 'Le modèle de nommage ne contient aucune variable. Tous les tickets auront le même nom.'
        });
      }
    }
  }

  /**
   * Validate limits and timeouts
   */
  private validateLimits(
    config: TicketConfigWithArrays,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate inactivity timeout
    if (!config.inactivityTimeout || config.inactivityTimeout <= 0) {
      warnings.push({
        field: 'inactivityTimeout',
        message: 'Inactivity timeout is not set. Tickets will never be automatically closed due to inactivity.',
        messageFr: 'Le délai d\'inactivité n\'est pas défini. Les tickets ne seront jamais fermés automatiquement pour cause d\'inactivité.'
      });
    }

    // Validate max tickets per user
    if (config.maxTicketsPerUser <= 0) {
      warnings.push({
        field: 'maxTicketsPerUser',
        message: 'No limit is set for tickets per user. Users can create unlimited tickets.',
        messageFr: 'Aucune limite n\'est définie pour les tickets par utilisateur. Les utilisateurs peuvent créer des tickets illimités.'
      });
    }

    // Validate ticket limits
    if (config.maxActiveTickets && config.maxActiveTickets > 0 && config.maxActiveTickets <= 10) {
      warnings.push({
        field: 'maxActiveTickets',
        message: `Maximum active tickets is set to ${config.maxActiveTickets}, which might be too low for busy servers.`,
        messageFr: `Le maximum de tickets actifs est fixé à ${config.maxActiveTickets}, ce qui pourrait être trop bas pour les serveurs occupés.`
      });
    }
  }

  /**
   * Validate a specific channel
   */
  private async validateChannel(
    channelId: string,
    guildId: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return { isValid: false, error: 'Guild not found' };
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return { isValid: false, error: 'Channel not found' };
      }

      if (!channel.isTextBased()) {
        return { isValid: false, error: 'Channel is not a text channel' };
      }

      if (channel.isThread()) {
        return { isValid: false, error: 'Cannot use a thread as container' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Failed to validate channel' };
    }
  }

  /**
   * Validate a category channel
   */
  private async validateCategory(
    categoryId: string,
    guildId: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return { isValid: false, error: 'Guild not found' };
      }

      const category = guild.channels.cache.get(categoryId);
      if (!category) {
        return { isValid: false, error: 'Category not found' };
      }

      if (category.type !== 4) { // CategoryChannel type
        return { isValid: false, error: 'Channel is not a category' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Failed to validate category' };
    }
  }

  /**
   * Get count of user's active tickets
   */
  private async getUserActiveTicketCount(guildId: string, userId: string): Promise<number> {
    if (this.ticketService) {
      const tickets = await this.ticketService.getUserActiveTickets(guildId, userId);
      return tickets.length;
    }
    // Fallback: query database directly if service not available
    try {
      const { prisma } = await import('../lib/database');
      const tickets = await prisma.ticket.count({
        where: {
          guildId,
          creatorId: userId,
          state: { not: 'CLOSED' },
          deletedAt: null
        }
      });
      return tickets;
    } catch {
      return 0;
    }
  }

  /**
   * Format validation result as user-friendly message
   */
  formatValidationMessage(
    result: ValidationResult,
    locale: 'en' | 'fr' = 'en'
  ): string {
    if (result.isValid && result.warnings.length === 0) {
      return locale === 'en' 
        ? '✅ Ticket configuration is valid and ready to use!'
        : '✅ La configuration des tickets est valide et prête à l\'emploi!';
    }

    const messages: string[] = [];

    // Add errors first
    if (result.errors.length > 0) {
      const errorHeader = locale === 'en' 
        ? '❌ **Configuration Errors:**'
        : '❌ **Erreurs de configuration:**';
      messages.push(errorHeader);
      
      for (const error of result.errors) {
        const message = locale === 'en' ? error.message : error.messageFr;
        messages.push(`• ${message}`);
      }
    }

    // Add warnings
    if (result.warnings.length > 0) {
      if (messages.length > 0) messages.push('');
      
      const warningHeader = locale === 'en'
        ? '⚠️ **Configuration Warnings:**'
        : '⚠️ **Avertissements de configuration:**';
      messages.push(warningHeader);
      
      for (const warning of result.warnings) {
        const message = locale === 'en' ? warning.message : warning.messageFr;
        messages.push(`• ${message}`);
      }
    }

    // Add help footer
    if (messages.length > 0) {
      messages.push('');
      const footer = locale === 'en'
        ? '💡 **Need help?** Visit the dashboard to configure your ticket system.'
        : '💡 **Besoin d\'aide?** Visitez le tableau de bord pour configurer votre système de tickets.';
      messages.push(footer);
    }

    return messages.join('\n');
  }
}