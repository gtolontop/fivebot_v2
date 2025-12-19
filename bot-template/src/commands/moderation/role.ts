import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('role')
  .setDescription('Manage user roles')
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Add a role to a user')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('The user to add the role to')
          .setRequired(true)
      )
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('The role to add')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove a role from a user')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('The user to remove the role from')
          .setRequired(true)
      )
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('The role to remove')
          .setRequired(true)
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const subcommand = interaction.options.getSubcommand();
  const user = interaction.options.getUser('user', true);
  const role = interaction.options.getRole('role', true);

  if (!interaction.guild || !interaction.member) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const prisma = getPrismaClient();
    const moderationService = new ModerationService(prisma);

    // Check if moderator has permissions
    const canModerate = await moderationService.canModerate(
      interaction.member as any,
      interaction.guild.id
    );

    if (!canModerate) {
      await interaction.editReply({
        content: '❌ You do not have permission to use moderation commands.',
      });
      return;
    }

    // Get member
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.editReply({
        content: '❌ User is not in this server.',
      });
      return;
    }

    // Check if role is manageable
    const botMember = await interaction.guild.members.fetchMe();
    if (role.position >= botMember.roles.highest.position) {
      await interaction.editReply({
        content: '❌ I cannot manage this role due to role hierarchy.',
      });
      return;
    }

    // Check if moderator can manage this role
    if (role.position >= (interaction.member as any).roles.highest.position) {
      await interaction.editReply({
        content: '❌ You cannot manage this role due to role hierarchy.',
      });
      return;
    }

    if (subcommand === 'add') {
      // Check if user already has the role
      if (member.roles.cache.has(role.id)) {
        await interaction.editReply({
          content: `❌ ${user.tag} already has the ${role.name} role.`,
        });
        return;
      }

      // Add role
      await member.roles.add(role.id);

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Role Added')
        .addFields(
          { name: 'User', value: `${user.tag}`, inline: true },
          { name: 'Role', value: `${role}`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === 'remove') {
      // Check if user has the role
      if (!member.roles.cache.has(role.id)) {
        await interaction.editReply({
          content: `❌ ${user.tag} does not have the ${role.name} role.`,
        });
        return;
      }

      // Remove role
      await member.roles.remove(role.id);

      const embed = new EmbedBuilder()
        .setColor(0xFF8C00)
        .setTitle('✅ Role Removed')
        .addFields(
          { name: 'User', value: `${user.tag}`, inline: true },
          { name: 'Role', value: `${role}`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('[Role Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to manage role. Please try again.',
    });
  }
}
