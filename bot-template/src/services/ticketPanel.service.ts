import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
  ComponentType,
  Message,
  Guild,
  InteractionReplyOptions
} from 'discord.js';
// Note: TicketPanel and TicketCategory are stored as JSON in TicketConfig, not as separate models
import { prisma } from '../lib/database';
import { TicketService } from './ticket.service';

// Define types locally since they're not in Prisma schema
type PanelType = 'BUTTON' | 'DROPDOWN' | 'HYBRID' | 'REACTION';

interface TicketCategory {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
}

export class TicketPanelService {
  private ticketService: TicketService;
  private panelCategories: Map<string, any[]> = new Map(); // Store categories by guild ID

  constructor(ticketService: TicketService) {
    this.ticketService = ticketService;
  }
  
  // Get stored categories for a guild
  getStoredCategories(guildId: string): any[] | undefined {
    return this.panelCategories.get(guildId);
  }

  // Create a new ticket panel
  async createPanel(
    guild: Guild,
    channelId: string,
    type: PanelType,
    embedData: any,
    categories?: TicketCategory[]
  ): Promise<Message | null> {
    // Store categories in memory for later use
    if (categories && categories.length > 0) {
      this.panelCategories.set(guild.id, categories);
    }
    try {
      const channel = await guild.channels.fetch(channelId) as TextChannel;
      if (!channel || !channel.isTextBased()) {
        throw new Error('Invalid channel');
      }

      let config = await this.ticketService.getConfig(guild.id);
      if (!config) {
        // Create a default configuration for the guild
        config = await this.ticketService.createConfig(guild.id, {
          botId: process.env.BOT_ID || '',
          namingFormat: 'ticket-{counter}',
          maxTickets: 3,
          categories: [],
          panels: []
        });
      }

      // Build embed
      const embed = this.buildEmbed(embedData, guild);

      // Build components based on panel type
      const components = await this.buildComponents(type, categories || [], config.id);

      // Send the panel message
      const message = await channel.send({
        embeds: [embed],
        components
      });

      // Create panel data object
      const panelData = {
        id: embedData.id,
        guildId: guild.id,
        channelId,
        messageId: message.id,
        type,
        embedData,
        active: true
      };

      // Get existing panels and add the new one
      const existingPanels = config.panels || [];
      const updatedPanels = [...existingPanels, panelData];

      // Update config with new panel
      await this.ticketService.updateConfig(guild.id, {
        panels: updatedPanels
      });

      return message;
    } catch (error) {
      console.error('[TicketPanelService] Error creating panel:', error);
      return null;
    }
  }

  // Build embed from configuration
  private buildEmbed(embedData: any, guild: Guild): EmbedBuilder {
    const embed = new EmbedBuilder();

    // Replace variables in embed data
    const processedData = this.processVariables(embedData, {
      'guild.name': guild.name,
      'guild.memberCount': guild.memberCount.toString()
    });

    if (processedData.title) embed.setTitle(processedData.title);
    if (processedData.description) embed.setDescription(processedData.description);
    if (processedData.color) embed.setColor(processedData.color);
    if (processedData.footer?.text) embed.setFooter({ text: processedData.footer.text });
    if (processedData.thumbnail) embed.setThumbnail(processedData.thumbnail);
    if (processedData.image) embed.setImage(processedData.image);

    if (processedData.fields) {
      for (const field of processedData.fields) {
        embed.addFields({
          name: field.name,
          value: field.value,
          inline: field.inline || false
        });
      }
    }

    embed.setTimestamp();

    return embed;
  }

  // Build components based on panel type
  private async buildComponents(
    type: PanelType,
    categories: TicketCategory[],
    configId: string
  ): Promise<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[]> {
    const rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

    switch (type) {
      case 'BUTTON':
        rows.push(...this.buildButtonComponents(categories));
        break;

      case 'DROPDOWN':
        // If too many categories, split into multiple dropdowns or use buttons
        if (categories.length > 20) {
          // Switch to button layout for many categories
          rows.push(...this.buildButtonComponents(categories));
        } else {
          rows.push(this.buildDropdownComponent(categories));
        }
        break;

      case 'HYBRID':
        // Add main create button
        const mainRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('ticket:create:general')
              .setLabel('Create Ticket')
              .setEmoji('🎫')
              .setStyle(ButtonStyle.Primary)
          );
        rows.push(mainRow);

        // Add category dropdown if categories exist
        if (categories.length > 0) {
          if (categories.length > 20) {
            // For many categories, add a compact button row instead
            const categoryRow = new ActionRowBuilder<ButtonBuilder>();
            for (let i = 0; i < Math.min(4, categories.length); i++) {
              const cat = categories[i];
              categoryRow.addComponents(
                new ButtonBuilder()
                  .setCustomId(`ticket:create:${cat.id}`)
                  .setLabel(cat.name)
                  .setEmoji(cat.emoji || '📋')
                  .setStyle(ButtonStyle.Secondary)
              );
            }
            if (categories.length > 4) {
              categoryRow.addComponents(
                new ButtonBuilder()
                  .setCustomId('ticket:categories:more')
                  .setLabel(`+${categories.length - 4} more`)
                  .setStyle(ButtonStyle.Secondary)
              );
            }
            rows.push(categoryRow);
          } else {
            rows.push(this.buildDropdownComponent(categories));
          }
        }
        break;
    }

    return rows;
  }

  // Build button components
  private buildButtonComponents(categories: TicketCategory[]): ActionRowBuilder<ButtonBuilder>[] {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    let currentRow = new ActionRowBuilder<ButtonBuilder>();

    if (categories.length === 0) {
      // Default button if no categories
      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId('ticket:create:general')
          .setLabel('Create Ticket')
          .setEmoji('🎫')
          .setStyle(ButtonStyle.Primary)
      );
      rows.push(currentRow);
    } else {
      // Create button for each category
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const button = new ButtonBuilder()
          .setCustomId(`ticket:create:${category.id}`)
          .setLabel(category.name)
          .setStyle(ButtonStyle.Secondary);

        if (category.emoji) {
          button.setEmoji(category.emoji);
        }

        currentRow.addComponents(button);

        // Discord limit: 5 buttons per row
        if ((i + 1) % 5 === 0 && i < categories.length - 1) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder<ButtonBuilder>();
        }
      }

      if (currentRow.components.length > 0) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  // Build dropdown component
  private buildDropdownComponent(categories: TicketCategory[]): ActionRowBuilder<StringSelectMenuBuilder> {
    const options: StringSelectMenuOptionBuilder[] = [];

    if (categories.length === 0) {
      // Default option
      options.push(
        new StringSelectMenuOptionBuilder()
          .setLabel('General Support')
          .setValue('ticket:create:general')
          .setDescription('Create a general support ticket')
          .setEmoji('🎫')
      );
    } else {
      // Create option for each category
      for (const category of categories) {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(category.name)
          .setValue(`ticket:create:${category.id}`);

        if (category.description) {
          // Limit description to 50 characters to keep dropdown compact
          const truncatedDesc = category.description.length > 50 
            ? category.description.substring(0, 47) + '...'
            : category.description;
          option.setDescription(truncatedDesc);
        }

        if (category.emoji) {
          option.setEmoji(category.emoji);
        }

        options.push(option);
      }
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket:category:select')
      .setPlaceholder('Select a category...')
      .addOptions(options);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  }

  // Update existing panel
  async updatePanel(panel: TicketPanel, guild: Guild): Promise<boolean> {
    try {
      const channel = await guild.channels.fetch(panel.channelId) as TextChannel;
      if (!channel || !channel.isTextBased() || !panel.messageId) {
        return false;
      }

      const message = await channel.messages.fetch(panel.messageId);
      if (!message) return false;

      const categories = await prisma.ticketCategory.findMany({
        where: {
          configId: panel.configId,
          active: true
        },
        orderBy: { order: 'asc' }
      });

      const embed = this.buildEmbed(panel.embedData as any, guild);
      const components = await this.buildComponents(panel.type, categories, panel.configId);

      await message.edit({
        embeds: [embed],
        components
      });

      // Update stored components
      await this.ticketService.updatePanel(panel.id, {
        components: this.serializeComponents(components)
      });

      return true;
    } catch (error) {
      console.error('[TicketPanelService] Error updating panel:', error);
      return false;
    }
  }

  // Delete panel
  async deletePanel(panel: TicketPanel, guild: Guild): Promise<boolean> {
    try {
      if (panel.messageId) {
        const channel = await guild.channels.fetch(panel.channelId) as TextChannel;
        if (channel && channel.isTextBased()) {
          const message = await channel.messages.fetch(panel.messageId);
          if (message) {
            await message.delete();
          }
        }
      }

      await prisma.ticketPanel.delete({
        where: { id: panel.id }
      });

      return true;
    } catch (error) {
      console.error('[TicketPanelService] Error deleting panel:', error);
      return false;
    }
  }

  // Get all active panels for a guild
  async getGuildPanels(guildId: string): Promise<TicketPanel[]> {
    return await prisma.ticketPanel.findMany({
      where: {
        guildId,
        active: true
      }
    });
  }

  // Process variables in text
  private processVariables(data: any, variables: Record<string, string>): any {
    if (typeof data === 'string') {
      let processed = data;
      for (const [key, value] of Object.entries(variables)) {
        processed = processed.replace(new RegExp(`{${key}}`, 'g'), value);
      }
      return processed;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.processVariables(item, variables));
    }

    if (typeof data === 'object' && data !== null) {
      const processed: any = {};
      for (const [key, value] of Object.entries(data)) {
        processed[key] = this.processVariables(value, variables);
      }
      return processed;
    }

    return data;
  }

  // Serialize components for storage
  private serializeComponents(components: any[]): any {
    return components.map(row => ({
      type: row.type,
      components: row.components.map((component: any) => ({
        type: component.type,
        customId: component.data.custom_id,
        label: component.data.label,
        style: component.data.style,
        emoji: component.data.emoji,
        placeholder: component.data.placeholder,
        options: component.data.options
      }))
    }));
  }

  // Build panel preview
  buildPanelPreview(embedData: any, type: PanelType, categories: TicketCategory[]): InteractionReplyOptions {
    const embed = new EmbedBuilder();

    if (embedData.title) embed.setTitle(embedData.title);
    if (embedData.description) embed.setDescription(embedData.description);
    if (embedData.color) embed.setColor(embedData.color);
    if (embedData.footer?.text) embed.setFooter({ text: embedData.footer.text });

    embed.addFields({
      name: 'Panel Type',
      value: type,
      inline: true
    });

    embed.addFields({
      name: 'Categories',
      value: categories.length > 0 
        ? categories.map(c => `${c.emoji || ''} ${c.name}`).join('\n')
        : 'No categories configured',
      inline: true
    });

    return {
      embeds: [embed],
      ephemeral: true
    };
  }
}