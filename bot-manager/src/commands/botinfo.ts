import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { PrismaClient } from '@prisma/client';

export const botInfo = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Afficher les informations détaillées d\'un bot')
    .addStringOption(option =>
      option
        .setName('id')
        .setDescription('ID du bot')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction, prisma: PrismaClient) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const botId = interaction.options.getString('id', true);

      // Get user
      const user = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
      });

      if (!user) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Utilisateur non trouvé')
          .setDescription('Vous devez être enregistré dans le système.')
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Get bot details
      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          ownerId: user.id,
          isActive: true,
        },
        include: {
          config: true,
          hosts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          jobLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          owner: {
            select: {
              username: true,
            },
          },
        },
      });

      if (!bot) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Bot non trouvé')
          .setDescription(`Aucun bot avec l'ID \`${botId}\` n'a été trouvé dans vos bots.`)
          .addFields(
            { name: '💡 Astuce', value: 'Utilisez `/listbots` pour voir tous vos bots.' }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const statusEmoji = {
        ONLINE: '🟢',
        OFFLINE: '🔴',
        STARTING: '🟡',
        STOPPING: '🟡',
        ERROR: '💥'
      }[bot.status] || '⚪';

      const statusColor = {
        ONLINE: 0x00FF00,
        OFFLINE: 0x808080,
        STARTING: 0xFFFF00,
        STOPPING: 0xFF9500,
        ERROR: 0xFF0000
      }[bot.status] || 0x808080;

      // Host information
      const currentHost = bot.hosts[0];
      const hostInfo = currentHost
        ? `**Serveur:** ${currentHost.host}\n**Container:** \`${currentHost.containerId}\`\n**CPU:** ${currentHost.cpuLimit}\n**RAM:** ${currentHost.memLimit}\n**Démarré:** <t:${Math.floor(new Date(currentHost.startedAt!).getTime() / 1000)}:R>`
        : 'Aucun hébergement actif';

      // Configuration info
      const configInfo = bot.config
        ? [
            `**Bienvenue:** ${bot.config.welcomeEnabled ? '✅ Activé' : '❌ Désactivé'}`,
            bot.config.welcomeChannelId ? `**Canal:** <#${bot.config.welcomeChannelId}>` : '',
            `**Modération:** ${bot.config.moderationEnabled ? '✅ Activé' : '❌ Désactivé'}`,
            `**Auto-rôle:** ${bot.config.autoRoleEnabled ? '✅ Activé' : '❌ Désactivé'}`,
          ].filter(Boolean).join('\n')
        : 'Configuration par défaut';

      // Recent logs
      const recentLogs = bot.jobLogs.length > 0
        ? bot.jobLogs.map(log => 
            `\`${log.createdAt.toLocaleTimeString()}\` ${log.status === 'COMPLETED' ? '✅' : log.status === 'FAILED' ? '❌' : '⏳'} ${log.message || log.jobType}`
          ).join('\n')
        : 'Aucun log récent';

      const embed = new EmbedBuilder()
        .setColor(statusColor)
        .setTitle(`${statusEmoji} ${bot.name}`)
        .setDescription(`Informations détaillées pour le bot **${bot.name}**`)
        .addFields(
          { name: '📋 Informations générales', value: `**ID:** \`${bot.id}\`\n**Préfixe:** ${bot.prefix}\n**Propriétaire:** ${bot.owner.username}\n**Statut:** ${bot.status}\n**Client ID:** \`${bot.clientId || 'N/A'}\`\n**Créé:** <t:${Math.floor(new Date(bot.createdAt).getTime() / 1000)}:F>`, inline: false },
          { name: '🖥️ Hébergement', value: hostInfo, inline: true },
          { name: '⚙️ Configuration', value: configInfo, inline: true },
          { name: '📜 Logs récents', value: recentLogs, inline: false }
        )
        .setFooter({
          text: `Dernière mise à jour: ${new Date(bot.updatedAt).toLocaleString()}`,
          iconURL: interaction.client.user?.displayAvatarURL()
        })
        .setTimestamp();

      // Action buttons
      const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`bot_start_${bot.id}`)
            .setLabel('▶️ Démarrer')
            .setStyle(ButtonStyle.Success)
            .setDisabled(bot.status === 'ONLINE' || bot.status === 'STARTING'),
          new ButtonBuilder()
            .setCustomId(`bot_stop_${bot.id}`)
            .setLabel('⏹️ Arrêter')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(bot.status === 'OFFLINE' || bot.status === 'STOPPING'),
          new ButtonBuilder()
            .setCustomId(`bot_restart_${bot.id}`)
            .setLabel('🔄 Redémarrer')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(bot.status === 'STARTING' || bot.status === 'STOPPING'),
          new ButtonBuilder()
            .setCustomId(`bot_invite_${bot.id}`)
            .setLabel('🔗 Inviter')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/api/oauth2/authorize?client_id=${bot.clientId}&scope=bot%20applications.commands&permissions=8`)
            .setDisabled(!bot.clientId)
        );

      await interaction.editReply({ 
        embeds: [embed],
        components: [actionRow]
      });

    } catch (error) {
      console.error('Error getting bot info:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Erreur')
        .setDescription('Impossible de récupérer les informations du bot.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};