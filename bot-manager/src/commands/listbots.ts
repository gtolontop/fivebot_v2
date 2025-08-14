import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

export const listBots = {
  data: new SlashCommandBuilder()
    .setName('listbots')
    .setDescription('Afficher la liste de vos bots'),

  async execute(interaction: ChatInputCommandInteraction, prisma: PrismaClient) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        include: {
          bots: {
            where: { isActive: true },
            include: {
              config: true,
              hosts: {
                where: { status: 'UP' },
                take: 1,
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!user) {
        const embed = new EmbedBuilder()
          .setColor(0xFF9500)
          .setTitle('👤 Utilisateur non trouvé')
          .setDescription('Vous devez d\'abord créer un bot avec `/createbot` pour apparaître dans le système.')
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (user.bots.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0xFF9500)
          .setTitle('🤖 Aucun bot trouvé')
          .setDescription('Vous n\'avez encore créé aucun bot. Utilisez `/createbot` pour en créer un!')
          .addFields(
            { name: '💰 Vos crédits', value: user.credits.toString(), inline: true },
            { name: '💡 Astuce', value: 'Un bot coûte 10 crédits à créer', inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Create bot list
      const botFields = user.bots.map(bot => {
        const statusEmoji = {
          ONLINE: '🟢',
          OFFLINE: '🔴',
          STARTING: '🟡',
          STOPPING: '🟡',
          ERROR: '💥'
        }[bot.status] || '⚪';

        const hostInfo = bot.hosts.length > 0 ? '🌐 Hébergé' : '📦 Conteneur arrêté';

        return {
          name: `${statusEmoji} ${bot.name}`,
          value: [
            `**ID:** \`${bot.id}\``,
            `**Statut:** ${bot.status}`,
            `**Préfixe:** ${bot.prefix}`,
            `**Hébergement:** ${hostInfo}`,
            `**Créé:** <t:${Math.floor(new Date(bot.createdAt).getTime() / 1000)}:R>`
          ].join('\n'),
          inline: true
        };
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🤖 Vos bots (${user.bots.length})`)
        .setDescription(`Voici la liste de vos bots actifs. Vous avez **${user.credits} crédits** disponibles.`)
        .addFields(...botFields)
        .addFields(
          { name: '📊 Statistiques', value: `**Total:** ${user.bots.length} bots\n**Actifs:** ${user.bots.filter(b => b.status === 'ONLINE').length}\n**En erreur:** ${user.bots.filter(b => b.status === 'ERROR').length}`, inline: true },
          { name: '💡 Commandes utiles', value: '`/botinfo <id>` - Détails d\'un bot\n`/createbot` - Créer un nouveau bot', inline: true }
        )
        .setFooter({
          text: `Limite: 5 bots maximum • ${user.bots.length}/5 utilisés`,
          iconURL: interaction.client.user?.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error listing bots:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Erreur')
        .setDescription('Impossible de récupérer la liste de vos bots.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};