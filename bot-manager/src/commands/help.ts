import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export const help = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help and panel link'),

  async execute(interaction: ChatInputCommandInteraction) {
    const panelUrl = process.env.PANEL_URL || 'https://panel.fivebot.com';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🤖 FiveBot v2 Manager')
      .setDescription('All bot management features are available through our web panel.')
      .addFields(
        {
          name: '🌐 Management Panel',
          value: `[Access Panel](${panelUrl})\n\nManage all your bots through the web interface.`,
          inline: false
        },
        {
          name: '📋 Available Features',
          value: '• Create and delete bots\n• Start/stop/restart bots\n• View bot status and logs\n• Manage bot configuration\n• Monitor credits usage\n• And much more...',
          inline: false
        },
        {
          name: '💡 Tip',
          value: 'Log in to the panel with your Discord account to access all management features.',
          inline: false
        }
      )
      .setFooter({
        text: 'FiveBot v2 - Discord Bot Management Platform',
        iconURL: interaction.client.user?.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
