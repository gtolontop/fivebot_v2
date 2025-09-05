import { 
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../interfaces/Command';
import { TicketService } from '../services/ticket.service';
import { TicketValidationService } from '../services/ticketValidation.service';

export const ticketValidate: Command = {
  data: new SlashCommandBuilder()
    .setName('ticketvalidate')
    .setDescription('Validate the ticket system configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName('locale')
        .setDescription('Language for validation messages')
        .addChoices(
          { name: 'English', value: 'en' },
          { name: 'Français', value: 'fr' }
        )
    ),
  
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const ticketService = new TicketService(interaction.client);
    const validationService = new TicketValidationService(interaction.client);
    
    const locale = interaction.options.getString('locale') as 'en' | 'fr' || 'en';

    try {
      // Get the current configuration
      const config = await ticketService.getConfig(interaction.guildId!);

      // Validate the configuration
      const validation = await validationService.validateConfiguration(config, interaction.guildId!);

      // Create embed based on validation result
      const embed = new EmbedBuilder()
        .setTimestamp()
        .setFooter({ 
          text: locale === 'en' 
            ? 'Ticket System Validation' 
            : 'Validation du Système de Tickets'
        });

      if (validation.isValid && validation.warnings.length === 0) {
        embed
          .setColor(0x00FF00)
          .setTitle(locale === 'en' ? '✅ Configuration Valid' : '✅ Configuration Valide')
          .setDescription(
            locale === 'en'
              ? 'Your ticket system configuration is valid and ready to use!'
              : 'La configuration de votre système de tickets est valide et prête à être utilisée!'
          );
      } else if (validation.isValid && validation.warnings.length > 0) {
        embed
          .setColor(0xFFFF00)
          .setTitle(locale === 'en' ? '⚠️ Configuration Valid with Warnings' : '⚠️ Configuration Valide avec Avertissements')
          .setDescription(validationService.formatValidationMessage(validation, locale));
      } else {
        embed
          .setColor(0xFF0000)
          .setTitle(locale === 'en' ? '❌ Configuration Invalid' : '❌ Configuration Invalide')
          .setDescription(validationService.formatValidationMessage(validation, locale));
      }

      // Add configuration summary
      if (config) {
        const summaryFields = [];

        summaryFields.push({
          name: locale === 'en' ? 'Status' : 'Statut',
          value: config.enabled 
            ? (locale === 'en' ? '✅ Enabled' : '✅ Activé')
            : (locale === 'en' ? '❌ Disabled' : '❌ Désactivé'),
          inline: true
        });

        summaryFields.push({
          name: locale === 'en' ? 'Container Type' : 'Type de Conteneur',
          value: config.containerType === 'THREAD' 
            ? (locale === 'en' ? '🧵 Threads' : '🧵 Fils')
            : (locale === 'en' ? '#️⃣ Channels' : '#️⃣ Canaux'),
          inline: true
        });

        summaryFields.push({
          name: locale === 'en' ? 'Staff Roles' : 'Rôles du Personnel',
          value: config.staffRoles.length > 0 
            ? `${config.staffRoles.length} ${locale === 'en' ? 'configured' : 'configurés'}`
            : locale === 'en' ? '⚠️ None configured' : '⚠️ Aucun configuré',
          inline: true
        });

        if (config.categories && config.categories.length > 0) {
          const activeCategories = config.categories.filter(c => c.active);
          summaryFields.push({
            name: locale === 'en' ? 'Categories' : 'Catégories',
            value: `${activeCategories.length} ${locale === 'en' ? 'active' : 'actives'} / ${config.categories.length} ${locale === 'en' ? 'total' : 'total'}`,
            inline: true
          });
        }

        summaryFields.push({
          name: locale === 'en' ? 'User Limit' : 'Limite par Utilisateur',
          value: config.maxTicketsPerUser > 0 
            ? `${config.maxTicketsPerUser} ${locale === 'en' ? 'tickets' : 'tickets'}`
            : locale === 'en' ? '∞ Unlimited' : '∞ Illimité',
          inline: true
        });

        summaryFields.push({
          name: locale === 'en' ? 'Inactivity Timeout' : 'Délai d\'Inactivité',
          value: config.inactivityTimeout > 0 
            ? `${config.inactivityTimeout} ${locale === 'en' ? 'hours' : 'heures'}`
            : locale === 'en' ? '❌ Disabled' : '❌ Désactivé',
          inline: true
        });

        embed.addFields(summaryFields);
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('[TicketValidate] Error:', error);
      await interaction.editReply({
        content: locale === 'en'
          ? '❌ An error occurred while validating the configuration.'
          : '❌ Une erreur s\'est produite lors de la validation de la configuration.'
      });
    }
  }
};