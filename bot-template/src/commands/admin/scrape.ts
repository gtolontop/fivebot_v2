import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { ScraperService } from '../../services/scraper.service';

export default {
  data: new SlashCommandBuilder()
    .setName('scrape')
    .setDescription('Scrape all server messages for AI context')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(option =>
      option
        .setName('limit')
        .setDescription('Max messages per channel (default: 100)')
        .setRequired(false)
        .setMinValue(10)
        .setMaxValue(1000)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
    }

    const limit = interaction.options.getInteger('limit') || 100;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('🔄 Scraping en cours...')
          .setDescription(`Récupération des messages du serveur. Cela peut prendre du temps...`)
          .setTimestamp()
      ]
    });

    try {
      const scraper = new ScraperService(interaction.client);
      const data = await scraper.scrapeGuild(interaction.guild, limit);

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ SCRAPING TERMINÉ !')
            .setDescription(`Le serveur a été scrappé avec succès.`)
            .addFields(
              { name: '📂 Salons traités', value: `${data.totalChannels}`, inline: true },
              { name: '💬 Messages sauvegardés', value: `${data.totalMessages}`, inline: true },
              { name: '📁 Fichier', value: `\`${interaction.guild.id}_data.json\``, inline: true }
            )
            .setFooter({ text: 'L\'IA peut maintenant utiliser ces données comme contexte.' })
            .setTimestamp()
        ]
      });

    } catch (error) {
      console.error('[Scrape] Error:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription(`Une erreur s'est produite lors du scraping: ${error}`)
        ]
      });
    }
  }
};
