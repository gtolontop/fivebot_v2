import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  User,
  TextChannel,
  NewsChannel,
  ThreadChannel
} from 'discord.js';
import { TicketService } from '../services/ticket.service';
import { TicketStateManager } from '../services/ticketStateManager.service';

// Helper pour vérifier si un channel peut envoyer des messages
function isMessageableChannel(channel: any): channel is TextChannel | NewsChannel | ThreadChannel {
  return channel && 'send' in channel && typeof channel.send === 'function';
}

export interface TicketCommand {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction, ticketService: TicketService, stateManager: TicketStateManager) => Promise<void>;
}

// /close - Close a ticket
export const closeCommand: TicketCommand = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for closing the ticket')
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction, ticketService, stateManager) {
    await interaction.deferReply({ ephemeral: true });

    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Get ticket from channel
    const ticket = await ticketService.getTicketByChannel(interaction.channelId);

    if (!ticket) {
      await interaction.editReply('❌ This is not a ticket channel.');
      return;
    }

    if (ticket.state === 'CLOSED') {
      await interaction.editReply('❌ This ticket is already closed.');
      return;
    }

    try {
      // Send closing message to ticket before closing
      if (interaction.channel && isMessageableChannel(interaction.channel)) {
        await interaction.channel.send({
          embeds: [{
            title: '🔒 Ticket Closed',
            description: `This ticket has been closed by <@${interaction.user.id}>.`,
            fields: [
              { name: 'Reason', value: reason }
            ],
            color: 0xed4245,
            timestamp: new Date().toISOString()
          }]
        });
      }

      await interaction.editReply(`✅ Ticket #${ticket.ticketNumber} has been closed.\nReason: ${reason}`);

      // Close the ticket - this handles:
      // - Updating ticket state in database
      // - Generating and sending transcript (if autoSaveTranscripts is enabled)
      // - Sending transcript to user DM (if sendTranscriptToUser is enabled)
      // - Including attachments in transcript (if includeAttachments is enabled)
      // - Deleting the Discord channel after 5 seconds
      await ticketService.closeTicket(ticket.id, interaction.user.id, reason);

    } catch (error) {
      console.error('Error closing ticket:', error);
      await interaction.editReply('❌ Failed to close the ticket. Please try again.');
    }
  }
};

// /add - Add user to ticket
export const addCommand: TicketCommand = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to the current ticket')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to add')
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction, ticketService) {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser('user', true);

    const ticket = await ticketService.getTicketByChannel(interaction.channelId);

    if (!ticket) {
      await interaction.editReply('❌ This is not a ticket channel.');
      return;
    }

    try {
      // Add participant
      await ticketService.addParticipant(ticket.id, user.id, 'OBSERVER');

      // Add channel permissions
      const channel = interaction.channel;
      if (channel?.isTextBased() && 'permissionOverwrites' in channel) {
        await channel.permissionOverwrites.create(user.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      }

      await interaction.editReply(`✅ Added <@${user.id}> to this ticket.`);

      if (interaction.channel && isMessageableChannel(interaction.channel)) {
        await interaction.channel.send({
          embeds: [{
            description: `<@${user.id}> has been added to this ticket by <@${interaction.user.id}>.`,
            color: 0x57f287
          }]
        });
      }
    } catch (error) {
      console.error('Error adding user to ticket:', error);
      await interaction.editReply('❌ Failed to add user to the ticket.');
    }
  }
};

// /remove - Remove user from ticket
export const removeCommand: TicketCommand = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user from the current ticket')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to remove')
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction, ticketService) {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser('user', true);

    const ticket = await ticketService.getTicketByChannel(interaction.channelId);

    if (!ticket) {
      await interaction.editReply('❌ This is not a ticket channel.');
      return;
    }

    if (user.id === ticket.creatorId) {
      await interaction.editReply('❌ Cannot remove the ticket creator.');
      return;
    }

    try {
      // Remove participant
      await ticketService.removeParticipant(ticket.id, user.id);

      // Remove channel permissions
      const channel = interaction.channel;
      if (channel?.isTextBased() && 'permissionOverwrites' in channel) {
        await channel.permissionOverwrites.delete(user.id);
      }

      await interaction.editReply(`✅ Removed <@${user.id}> from this ticket.`);

      if (interaction.channel && isMessageableChannel(interaction.channel)) {
        await interaction.channel.send({
          embeds: [{
            description: `<@${user.id}> has been removed from this ticket by <@${interaction.user.id}>.`,
            color: 0xed4245
          }]
        });
      }
    } catch (error) {
      console.error('Error removing user from ticket:', error);
      await interaction.editReply('❌ Failed to remove user from the ticket.');
    }
  }
};

// /claim - Claim/assign ticket to yourself
export const claimCommand: TicketCommand = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim this ticket and assign it to yourself') as SlashCommandBuilder,

  async execute(interaction, ticketService) {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await ticketService.getTicketByChannel(interaction.channelId);

    if (!ticket) {
      await interaction.editReply('❌ This is not a ticket channel.');
      return;
    }

    if (ticket.assignedStaffId) {
      await interaction.editReply(`❌ This ticket is already claimed by <@${ticket.assignedStaffId}>.`);
      return;
    }

    try {
      await ticketService.assignTicket(ticket.id, interaction.user.id, interaction.user.id);

      await interaction.editReply(`✅ You have claimed ticket #${ticket.ticketNumber}.`);

      if (interaction.channel && isMessageableChannel(interaction.channel)) {
        await interaction.channel.send({
          embeds: [{
            description: `🙋 <@${interaction.user.id}> has claimed this ticket.`,
            color: 0x5865f2
          }]
        });
      }
    } catch (error) {
      console.error('Error claiming ticket:', error);
      await interaction.editReply('❌ Failed to claim the ticket.');
    }
  }
};

// /unclaim - Release ticket assignment
export const unclaimCommand: TicketCommand = {
  data: new SlashCommandBuilder()
    .setName('unclaim')
    .setDescription('Release your claim on this ticket') as SlashCommandBuilder,

  async execute(interaction, ticketService) {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await ticketService.getTicketByChannel(interaction.channelId);

    if (!ticket) {
      await interaction.editReply('❌ This is not a ticket channel.');
      return;
    }

    if (!ticket.assignedStaffId) {
      await interaction.editReply('❌ This ticket is not claimed.');
      return;
    }

    if (ticket.assignedStaffId !== interaction.user.id) {
      await interaction.editReply(`❌ This ticket is claimed by <@${ticket.assignedStaffId}>. Only they can unclaim it.`);
      return;
    }

    try {
      await ticketService.unassignTicket(ticket.id, interaction.user.id);

      await interaction.editReply(`✅ You have released ticket #${ticket.ticketNumber}.`);

      if (interaction.channel && isMessageableChannel(interaction.channel)) {
        await interaction.channel.send({
          embeds: [{
            description: `<@${interaction.user.id}> has released this ticket. It is now available for others to claim.`,
            color: 0xfee75c
          }]
        });
      }
    } catch (error) {
      console.error('Error unclaiming ticket:', error);
      await interaction.editReply('❌ Failed to unclaim the ticket.');
    }
  }
};

// /rename - Rename ticket channel
export const renameCommand: TicketCommand = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename the current ticket channel')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('New name for the ticket')
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction, ticketService) {
    await interaction.deferReply({ ephemeral: true });

    const newName = interaction.options.getString('name', true);

    const ticket = await ticketService.getTicketByChannel(interaction.channelId);

    if (!ticket) {
      await interaction.editReply('❌ This is not a ticket channel.');
      return;
    }

    try {
      const channel = interaction.channel;
      let oldName: string | undefined;

      if (channel?.isTextBased() && 'setName' in channel) {
        // Store old name before renaming (only for channels with 'name' property)
        if ('name' in channel && typeof channel.name === 'string') {
          oldName = channel.name;
        }
        await channel.setName(newName);
      }

      await ticketService.logAction(ticket.id, 'TICKET_RENAMED', interaction.user.id, {
        oldName,
        newName
      });

      await interaction.editReply(`✅ Renamed ticket to: **${newName}**`);
    } catch (error) {
      console.error('Error renaming ticket:', error);
      await interaction.editReply('❌ Failed to rename the ticket.');
    }
  }
};

// /priority - Change ticket priority
export const priorityCommand: TicketCommand = {
  data: new SlashCommandBuilder()
    .setName('priority')
    .setDescription('Change the priority of this ticket')
    .addStringOption(option =>
      option
        .setName('level')
        .setDescription('Priority level')
        .setRequired(true)
        .addChoices(
          { name: '🔵 Low', value: 'LOW' },
          { name: '🟢 Normal', value: 'NORMAL' },
          { name: '🟡 High', value: 'HIGH' },
          { name: '🔴 Urgent', value: 'URGENT' }
        )
    ) as SlashCommandBuilder,

  async execute(interaction, ticketService) {
    await interaction.deferReply({ ephemeral: true });

    const priority = interaction.options.getString('level', true);

    const ticket = await ticketService.getTicketByChannel(interaction.channelId);

    if (!ticket) {
      await interaction.editReply('❌ This is not a ticket channel.');
      return;
    }

    try {
      await ticketService.updateTicket(ticket.id, { priority });

      const priorityEmoji: { [key: string]: string } = {
        'LOW': '🔵',
        'NORMAL': '🟢',
        'HIGH': '🟡',
        'URGENT': '🔴'
      };

      await interaction.editReply(`✅ Ticket priority changed to **${priorityEmoji[priority]} ${priority}**`);

      if (interaction.channel && isMessageableChannel(interaction.channel)) {
        await interaction.channel.send({
          embeds: [{
            description: `Priority changed to **${priorityEmoji[priority]} ${priority}** by <@${interaction.user.id}>.`,
            color: 0x5865f2
          }]
        });
      }
    } catch (error) {
      console.error('Error changing priority:', error);
      await interaction.editReply('❌ Failed to change ticket priority.');
    }
  }
};

// Export all commands
export const ticketCommands = {
  close: closeCommand,
  add: addCommand,
  remove: removeCommand,
  claim: claimCommand,
  unclaim: unclaimCommand,
  rename: renameCommand,
  priority: priorityCommand
};
