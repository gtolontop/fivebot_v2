import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, User } from 'discord.js';
import { getLevelingService } from '../../services/leveling.service';

export const data = new SlashCommandBuilder()
  .setName('give-xp')
  .setDescription('Give XP to a user (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to give XP to')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName('amount')
      .setDescription('Amount of XP to give')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100000)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Check permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ You need Administrator permission to use this command',
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply();

    // Get bot ID from environment
    const botId = process.env.BOT_ID || interaction.client.user?.id;
    if (!botId) {
      await interaction.editReply({ content: '❌ Bot configuration error' });
      return;
    }

    // Get guild ID
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply({ content: '❌ This command can only be used in a server' });
      return;
    }

    // Get options
    const targetUser = interaction.options.getUser('user', true) as User;
    const amount = interaction.options.getInteger('amount', true);

    // Don't allow giving XP to bots
    if (targetUser.bot) {
      await interaction.editReply({ content: '❌ You cannot give XP to bots' });
      return;
    }

    // Get leveling service
    const levelingService = await getLevelingService();

    // Get user's old level
    const oldUserLevel = await levelingService.getUserLevel(guildId, targetUser.id, botId);
    const oldLevel = oldUserLevel.level;

    // Add XP
    const result = await levelingService.addXp(guildId, targetUser.id, botId, amount);

    // Create success embed
    const successEmbed = new EmbedBuilder()
      .setTitle('✅ XP Given Successfully')
      .setColor('#00FF00')
      .setDescription(`Successfully gave **${amount.toLocaleString()} XP** to ${targetUser}`)
      .addFields(
        {
          name: '📊 Previous Stats',
          value: `Level ${oldLevel} • ${oldUserLevel.totalXp.toLocaleString()} XP`,
          inline: true
        },
        {
          name: '📈 New Stats',
          value: `Level ${result.userLevel.level} • ${result.userLevel.totalXp.toLocaleString()} XP`,
          inline: true
        }
      )
      .setFooter({
        text: `Action performed by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Add level up notification if user leveled up
    if (result.leveledUp && result.newLevel) {
      successEmbed.addFields({
        name: '🎉 Level Up!',
        value: `${targetUser.username} leveled up from **Level ${result.oldLevel}** to **Level ${result.newLevel}**!`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [successEmbed] });
  } catch (error) {
    console.error('Error in give-xp command:', error);

    const errorMessage = interaction.deferred
      ? { content: '❌ An error occurred while giving XP' }
      : { content: '❌ An error occurred while giving XP', ephemeral: true };

    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
