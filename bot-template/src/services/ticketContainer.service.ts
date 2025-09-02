import {
  Guild,
  TextChannel,
  ThreadChannel,
  ChannelType,
  PermissionsBitField,
  ThreadAutoArchiveDuration,
  CategoryChannel,
  OverwriteData,
  GuildMember
} from 'discord.js';
import { ContainerType, Ticket } from '@prisma/client';
import { TicketService, TicketConfigWithArrays } from './ticket.service';

export class TicketContainerService {
  private ticketService: TicketService;

  constructor(ticketService: TicketService) {
    this.ticketService = ticketService;
  }

  // Create container based on configuration
  async createContainer(
    guild: Guild,
    config: TicketConfigWithArrays,
    creator: GuildMember,
    ticketNumber: number,
    categoryId?: string
  ): Promise<TextChannel | ThreadChannel | null> {
    try {
      const nameVariables = {
        counter: ticketNumber.toString().padStart(4, '0'),
        uuid: this.ticketService.generateShortUUID(),
        username: creator.user.username,
        userid: creator.id,
        category: categoryId || 'general',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].replace(/:/g, '-'),
        tag: creator.user.discriminator,
        staff: 'unassigned',
        priority: 'normal'
      };

      const containerName = this.ticketService.generateChannelName(
        config.namingPattern,
        nameVariables
      );

      switch (config.containerType) {
        case ContainerType.THREAD:
          return await this.createThreadContainer(guild, config, containerName, creator);
        
        case ContainerType.CHANNEL:
          return await this.createChannelContainer(guild, config, containerName, creator);
        
        case ContainerType.HYBRID:
          // Decide based on category or other criteria
          // For now, default to thread
          return await this.createThreadContainer(guild, config, containerName, creator);
        
        default:
          return null;
      }
    } catch (error) {
      console.error('[TicketContainerService] Error creating container:', error);
      return null;
    }
  }

  // Create thread container
  private async createThreadContainer(
    guild: Guild,
    config: TicketConfigWithArrays,
    name: string,
    creator: GuildMember
  ): Promise<ThreadChannel | null> {
    try {
      // Find or create hub channel
      let hubChannel: TextChannel;
      
      if (config.supportCategoryId) {
        const category = await guild.channels.fetch(config.supportCategoryId) as CategoryChannel;
        
        // Look for existing hub channel
        hubChannel = category.children.cache.find(
          ch => ch.type === ChannelType.GuildText && ch.name === 'ticket-hub'
        ) as TextChannel;

        if (!hubChannel) {
          // Create hub channel
          hubChannel = await guild.channels.create({
            name: 'ticket-hub',
            type: ChannelType.GuildText,
            parent: category,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: [PermissionsBitField.Flags.SendMessages],
                allow: [PermissionsBitField.Flags.ViewChannel]
              },
              ...config.staffRoles.map(roleId => ({
                id: roleId,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ManageThreads
                ]
              }))
            ]
          });

          // Send info message
          await hubChannel.send({
            embeds: [{
              color: 0x2F3136,
              title: '🎫 Ticket Hub',
              description: 'All support tickets are created as threads in this channel.',
              fields: [
                {
                  name: 'For Users',
                  value: 'Your ticket thread will appear below when created.'
                },
                {
                  name: 'For Staff',
                  value: 'All active ticket threads are visible here.'
                }
              ]
            }]
          });
        }
      } else {
        // No category specified, create in first text channel
        hubChannel = guild.channels.cache
          .filter(ch => ch.type === ChannelType.GuildText)
          .first() as TextChannel;
      }

      if (!hubChannel) {
        throw new Error('No suitable hub channel found');
      }

      // Create thread
      const thread = await hubChannel.threads.create({
        name,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        type: ChannelType.PrivateThread,
        reason: `Ticket created by ${creator.user.tag}`,
        invitable: false
      });

      // Add creator to thread
      await thread.members.add(creator.id);

      // Add staff roles
      for (const roleId of config.staffRoles) {
        const role = guild.roles.cache.get(roleId);
        if (role) {
          const staffMembers = role.members;
          for (const [, member] of staffMembers) {
            try {
              await thread.members.add(member.id);
            } catch {
              // Member might not have permission
            }
          }
        }
      }

      return thread;
    } catch (error) {
      console.error('[TicketContainerService] Error creating thread:', error);
      return null;
    }
  }

  // Create channel container
  private async createChannelContainer(
    guild: Guild,
    config: TicketConfigWithArrays,
    name: string,
    creator: GuildMember
  ): Promise<TextChannel | null> {
    try {
      let parent: CategoryChannel | null = null;

      if (config.supportCategoryId) {
        parent = await guild.channels.fetch(config.supportCategoryId) as CategoryChannel;
      }

      // Build permission overwrites
      const overwrites: OverwriteData[] = [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: creator.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks
          ]
        }
      ];

      // Add staff permissions
      for (const roleId of config.staffRoles) {
        overwrites.push({
          id: roleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks
          ]
        });
      }

      const channel = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: parent?.id,
        permissionOverwrites: overwrites,
        reason: `Ticket created by ${creator.user.tag}`
      });

      return channel;
    } catch (error) {
      console.error('[TicketContainerService] Error creating channel:', error);
      return null;
    }
  }

  // Update container permissions
  async updateContainerPermissions(
    container: TextChannel | ThreadChannel,
    updates: {
      addUsers?: string[];
      removeUsers?: string[];
      lockChannel?: boolean;
    }
  ): Promise<boolean> {
    try {
      if (container.isThread()) {
        // Handle thread permissions
        if (updates.addUsers) {
          for (const userId of updates.addUsers) {
            await container.members.add(userId);
          }
        }

        if (updates.removeUsers) {
          for (const userId of updates.removeUsers) {
            await container.members.remove(userId);
          }
        }

        if (updates.lockChannel) {
          await container.setLocked(true);
          await container.setArchived(true);
        }
      } else if ('permissionOverwrites' in container) {
        // Handle channel permissions
        if (updates.addUsers) {
          for (const userId of updates.addUsers) {
            await container.permissionOverwrites.edit(userId, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true
            });
          }
        }

        if (updates.removeUsers) {
          for (const userId of updates.removeUsers) {
            await container.permissionOverwrites.delete(userId);
          }
        }

        if (updates.lockChannel) {
          const ticket = await this.ticketService.getTicketByChannel(container.id);
          if (ticket) {
            await container.permissionOverwrites.edit(ticket.creatorId, {
              SendMessages: false,
              AddReactions: false
            });
          }
        }
      }

      return true;
    } catch (error) {
      console.error('[TicketContainerService] Error updating permissions:', error);
      return false;
    }
  }

  // Archive/close container
  async archiveContainer(
    container: TextChannel | ThreadChannel,
    reason: string = 'Ticket closed'
  ): Promise<boolean> {
    try {
      if (container.isThread()) {
        await container.setLocked(true);
        await container.setArchived(true);
      } else {
        // Move to archive category if configured
        const guild = container.guild;
        const archiveCategory = guild.channels.cache.find(
          ch => ch.type === ChannelType.GuildCategory && ch.name.toLowerCase().includes('archive')
        ) as CategoryChannel;

        if (archiveCategory && 'setParent' in container) {
          await (container as TextChannel).setParent(archiveCategory, { reason });
        }

        // Update channel name to indicate closed
        const newName = `closed-${container.name}`;
        await container.setName(newName.substring(0, 100));

        // Lock permissions
        await this.updateContainerPermissions(container, { lockChannel: true });
      }

      return true;
    } catch (error) {
      console.error('[TicketContainerService] Error archiving container:', error);
      return false;
    }
  }

  // Delete container
  async deleteContainer(
    container: TextChannel | ThreadChannel,
    reason: string = 'Ticket deleted'
  ): Promise<boolean> {
    try {
      await container.delete(reason);
      return true;
    } catch (error) {
      console.error('[TicketContainerService] Error deleting container:', error);
      return false;
    }
  }

  // Rename container
  async renameContainer(
    container: TextChannel | ThreadChannel,
    ticket: Ticket,
    variables: Record<string, any>
  ): Promise<boolean> {
    try {
      const config = await this.ticketService.getConfig(ticket.guildId);
      if (!config) return false;

      const newName = this.ticketService.generateChannelName(
        config.namingPattern,
        variables
      );

      await container.setName(newName);
      return true;
    } catch (error) {
      console.error('[TicketContainerService] Error renaming container:', error);
      return false;
    }
  }

  // Get container from ticket
  async getContainer(
    guild: Guild,
    ticket: Ticket
  ): Promise<TextChannel | ThreadChannel | null> {
    try {
      if (ticket.threadId) {
        return await guild.channels.fetch(ticket.threadId) as ThreadChannel;
      } else if (ticket.channelId) {
        return await guild.channels.fetch(ticket.channelId) as TextChannel;
      }
      return null;
    } catch (error) {
      console.error('[TicketContainerService] Error fetching container:', error);
      return null;
    }
  }

  // Check if container exists
  async containerExists(guild: Guild, channelId: string): Promise<boolean> {
    try {
      const channel = await guild.channels.fetch(channelId);
      return !!channel;
    } catch {
      return false;
    }
  }

  // Get container stats
  async getContainerStats(guild: Guild): Promise<{
    totalChannels: number;
    totalThreads: number;
    activeThreads: number;
    archivedThreads: number;
  }> {
    const stats = {
      totalChannels: 0,
      totalThreads: 0,
      activeThreads: 0,
      archivedThreads: 0
    };

    // Count ticket channels
    const ticketChannels = guild.channels.cache.filter(ch => 
      ch.type === ChannelType.GuildText && 
      (ch.name.includes('ticket') || ch.name.includes('closed'))
    );
    stats.totalChannels = ticketChannels.size;

    // Count threads
    const threads = guild.channels.cache.filter(ch => ch.isThread());
    stats.totalThreads = threads.size;
    stats.activeThreads = threads.filter(th => !th.archived).size;
    stats.archivedThreads = threads.filter(th => th.archived).size;

    return stats;
  }
}