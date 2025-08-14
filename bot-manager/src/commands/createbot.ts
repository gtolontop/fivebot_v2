import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

export const createBot = {
  data: new SlashCommandBuilder()
    .setName('createbot')
    .setDescription('Créer un nouveau bot Discord')
    .addStringOption(option =>
      option
        .setName('token')
        .setDescription('Token du bot Discord (BOT TOKEN uniquement)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Nom du bot')
        .setRequired(true)
        .setMaxLength(50)
    )
    .addStringOption(option =>
      option
        .setName('prefix')
        .setDescription('Préfixe des commandes (défaut: !)')
        .setRequired(false)
        .setMaxLength(5)
    ),

  async execute(interaction: ChatInputCommandInteraction, prisma: PrismaClient) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const token = interaction.options.getString('token', true);
      const name = interaction.options.getString('name', true);
      const prefix = interaction.options.getString('prefix') || '!';

      // Get or create user
      let user = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            discordId: interaction.user.id,
            username: interaction.user.username,
            credits: 100, // Default credits
          },
        });
      }

      // Call backend API to create bot
      const apiUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      const response = await axios.post(
        `${apiUrl}/api/bots`,
        {
          name,
          token,
          prefix,
        },
        {
          headers: {
            'Authorization': `Bearer ${await generateJWT(user)}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const bot = response.data;

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🤖 Bot créé avec succès!')
        .setDescription(`Le bot **${name}** a été créé et sera déployé dans quelques instants.`)
        .addFields(
          { name: '📝 Nom', value: name, inline: true },
          { name: '🆔 ID', value: bot.id, inline: true },
          { name: '⚡ Préfixe', value: prefix, inline: true },
          { name: '💰 Coût', value: '10 crédits', inline: true },
          { name: '📊 Statut', value: 'En cours de déploiement', inline: true },
          { name: '⏱️ Temps estimé', value: '2-3 minutes', inline: true }
        )
        .setFooter({
          text: `Utilisez /botinfo ${bot.id} pour voir le statut`,
          iconURL: interaction.client.user?.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          botId: bot.id,
          action: 'BOT_CREATED_VIA_COMMAND',
          resource: 'bot',
          metadata: {
            discordUserId: interaction.user.id,
            guildId: interaction.guildId,
            channelId: interaction.channelId,
          },
        },
      });

    } catch (error: any) {
      console.error('Error creating bot:', error);

      let errorMessage = 'Une erreur inconnue s\'est produite.';
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.message?.includes('Invalid bot token')) {
          errorMessage = '❌ **Token invalide**: Assurez-vous de fournir un BOT TOKEN valide (pas un user token).';
        } else if (errorData.message?.includes('Insufficient credits')) {
          errorMessage = '💰 **Crédits insuffisants**: Vous n\'avez pas assez de crédits pour créer un bot.';
        } else if (errorData.message?.includes('Maximum')) {
          errorMessage = '🚫 **Limite atteinte**: Vous avez atteint le nombre maximum de bots autorisés.';
        } else {
          errorMessage = `❌ **Erreur**: ${errorData.message}`;
        }
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = '🔌 **Service indisponible**: Le service de création de bots est temporairement indisponible.';
      }

      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Erreur lors de la création du bot')
        .setDescription(errorMessage)
        .addFields(
          { name: '💡 Aide', value: 'Assurez-vous que votre token est un **BOT TOKEN** valide créé dans le Discord Developer Portal.' },
          { name: '🔗 Liens utiles', value: '[Discord Developer Portal](https://discord.com/developers/applications)\n[Guide des tokens](https://discord.com/developers/docs/reference#authentication)' }
        )
        .setFooter({
          text: 'Contactez un administrateur si le problème persiste',
          iconURL: interaction.client.user?.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};

// Helper function to generate JWT for API calls
async function generateJWT(user: any): Promise<string> {
  // In a real implementation, this would be a proper JWT generation
  // For now, we'll return a placeholder that the backend can validate
  return Buffer.from(JSON.stringify({
    sub: user.id,
    discordId: user.discordId,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  })).toString('base64');
}