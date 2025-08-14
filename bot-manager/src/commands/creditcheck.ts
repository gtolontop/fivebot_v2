import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { PrismaClient } from '@prisma/client';

export const creditCheck = {
  data: new SlashCommandBuilder()
    .setName('creditcheck')
    .setDescription('Vérifier les crédits d\'un utilisateur')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Utilisateur à vérifier (vide = vous)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction, prisma: PrismaClient) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { discordId: targetUser.id },
        include: {
          bots: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              status: true,
              createdAt: true,
            },
          },
          creditsHistory: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!user) {
        const embed = new EmbedBuilder()
          .setColor(0xFF9500)
          .setTitle('👤 Utilisateur non trouvé')
          .setDescription(`L'utilisateur ${targetUser} n'est pas encore enregistré dans le système.`)
          .addFields(
            { name: '💡 Information', value: 'Les utilisateurs sont automatiquement enregistrés lors de leur première utilisation du bot.' }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Calculate spending stats
      const totalSpent = user.creditsHistory
        .filter((h: any) => h.amount < 0)
        .reduce((sum: number, h: any) => sum + Math.abs(h.amount), 0);

      const totalEarned = user.creditsHistory
        .filter((h: any) => h.amount > 0)
        .reduce((sum: number, h: any) => sum + h.amount, 0);

      // Recent transactions
      const recentTransactions = user.creditsHistory.slice(0, 5).map((h: any) => {
        const emoji = h.amount > 0 ? '💰' : '💸';
        const sign = h.amount > 0 ? '+' : '';
        return `${emoji} ${sign}${h.amount} - ${h.reason} (<t:${Math.floor(new Date(h.createdAt).getTime() / 1000)}:R>)`;
      }).join('\n') || 'Aucune transaction récente';

      const embed = new EmbedBuilder()
        .setColor(user.credits >= 10 ? 0x00FF00 : user.credits >= 5 ? 0xFF9500 : 0xFF0000)
        .setTitle(`💰 Crédits de ${user.username}`)
        .setDescription(`Informations sur les crédits de ${targetUser}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { 
            name: '💎 Solde actuel', 
            value: `**${user.credits} crédits**\n${user.credits >= 10 ? '✅ Peut créer un bot' : '❌ Crédits insuffisants'}`, 
            inline: true 
          },
          { 
            name: '📊 Statistiques', 
            value: `**Gagné:** +${totalEarned}\n**Dépensé:** -${totalSpent}\n**Net:** ${totalEarned - totalSpent}`, 
            inline: true 
          },
          { 
            name: '🤖 Bots actifs', 
            value: `${user.bots.length}/5 bots\n${user.bots.filter((b: any) => b.status === 'ONLINE').length} en ligne`, 
            inline: true 
          },
          { 
            name: '📜 Transactions récentes', 
            value: recentTransactions, 
            inline: false 
          }
        )
        .addFields(
          { 
            name: '💡 Informations utiles', 
            value: '• Créer un bot: **10 crédits**\n• Crédits par défaut: **100**\n• Limite de bots: **5 maximum**', 
            inline: true 
          },
          { 
            name: '📈 Prochaines étapes', 
            value: user.credits >= 10 
              ? '✅ Vous pouvez créer un nouveau bot!'
              : '⚠️ Contactez un admin pour plus de crédits', 
            inline: true 
          }
        )
        .setFooter({
          text: `Inscrit depuis le ${new Date(user.createdAt).toLocaleDateString()}`,
          iconURL: interaction.client.user?.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error checking credits:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Erreur')
        .setDescription('Impossible de récupérer les informations de crédits.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};