import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, TextChannel } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
  .setName('ghostping')
  .setDescription('Ping a user invisibly - the ping will be immediately deleted')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to ghost ping')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('message')
      .setDescription('Optional message to include with the ping')
      .setRequired(false)
  )
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('Channel to send the ghost ping in (default: current channel)')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
      return;
    }

    // Get bot config
    const botId = process.env.BOT_ID || interaction.client.user?.id;
    if (!botId) {
      await interaction.reply({ content: '❌ Bot configuration error', ephemeral: true });
      return;
    }

    // Get module config
    const botModule = await prisma.botModule.findFirst({
      where: {
        botId,
        OR: [
          { moduleId: 'ghost-ping' },
          { module: { slug: 'ghost-ping' } }
        ],
        enabled: true
      }
    }).catch(() => null);

    // Check if module is enabled
    if (!botModule) {
      await interaction.reply({
        content: '❌ The Ghost Ping module is not enabled on this bot. Enable it in the dashboard.',
        ephemeral: true
      });
      return;
    }

    // Parse module config
    let moduleConfig: any = {};
    if (botModule.config) {
      try {
        moduleConfig = typeof botModule.config === 'string'
          ? JSON.parse(botModule.config)
          : botModule.config;
      } catch {
        moduleConfig = {};
      }
    }

    // Check allowed roles
    if (moduleConfig.allowedRoles && moduleConfig.allowedRoles.length > 0) {
      const member = interaction.member as GuildMember;
      const hasRole = moduleConfig.allowedRoles.some((roleId: string) =>
        member.roles.cache.has(roleId)
      );

      if (!hasRole && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: '❌ You do not have permission to use this command.',
          ephemeral: true
        });
        return;
      }
    }

    // Get target user
    const targetUser = interaction.options.getUser('user', true);
    const message = interaction.options.getString('message') || '';
    const targetChannel = interaction.options.getChannel('channel') as TextChannel | null;

    const channel = (targetChannel || interaction.channel) as TextChannel;

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ content: '❌ Invalid channel!', ephemeral: true });
      return;
    }

    // Acknowledge the interaction immediately (ephemeral)
    await interaction.reply({
      content: `👻 Ghost pinging <@${targetUser.id}> in <#${channel.id}>...`,
      ephemeral: true
    });

    // Build the ping message
    let pingContent = `<@${targetUser.id}>`;
    if (message) {
      pingContent += ` ${message}`;
    }

    // Send the ping message
    const sentMessage = await channel.send(pingContent);

    // Delete delay from config (default 0 = instant)
    const deleteDelay = moduleConfig.deleteDelay || 0;

    // Delete the message after the delay
    if (deleteDelay > 0) {
      setTimeout(async () => {
        try {
          await sentMessage.delete();
        } catch (error) {
          console.error('[GhostPing] Error deleting message:', error);
        }
      }, deleteDelay);
    } else {
      // Instant delete
      await sentMessage.delete();
    }

    // Log to channel if configured
    if (moduleConfig.logChannel) {
      try {
        const logChannel = await guild.channels.fetch(moduleConfig.logChannel) as TextChannel;
        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send({
            embeds: [{
              color: 0x5865F2,
              title: '👻 Ghost Ping Sent',
              fields: [
                { name: 'Sent By', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Target', value: `<@${targetUser.id}>`, inline: true },
                { name: 'Channel', value: `<#${channel.id}>`, inline: true },
                ...(message ? [{ name: 'Message', value: message, inline: false }] : [])
              ],
              timestamp: new Date().toISOString(),
              footer: { text: `User ID: ${targetUser.id}` }
            }]
          });
        }
      } catch (error) {
        console.error('[GhostPing] Error logging to channel:', error);
      }
    }

    // Update the ephemeral response
    await interaction.editReply({
      content: `✅ Ghost ping sent to <@${targetUser.id}> in <#${channel.id}>!`
    });

  } catch (error) {
    console.error('[GhostPing] Error:', error);

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        content: '❌ An error occurred while sending the ghost ping.'
      });
    } else {
      await interaction.reply({
        content: '❌ An error occurred while sending the ghost ping.',
        ephemeral: true
      });
    }
  }
}
