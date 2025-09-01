import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ChannelType
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ticket-example')
  .setDescription('Quick setup example for the ticket system');

export async function execute(interaction: ChatInputCommandInteraction) {
  // Check permissions
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({
      content: '❌ You need Administrator permission to use this command.',
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const steps = [
    '**Step 1**: Create a staff role\n`/ticket setup staff-role:@Support Team`',
    '**Step 2**: Create a ticket panel\n`/ticket panel channel:#support`',
    '**Step 3**: Test it!\nClick the button in the panel to create a ticket',
    '\n**Advanced Options**:',
    '• Set a category for channels: `/ticket setup category:#Tickets staff-role:@Support`',
    '• Create dropdown panel: `/ticket panel channel:#support type:Dropdown`',
    '• Add users to tickets: `/ticket add user:@username`',
    '• Close tickets: `/ticket close reason:"Resolved"`'
  ];

  const exampleEmbed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎫 Ticket System Quick Start')
    .setDescription('Here\'s how to set up the ticket system:')
    .addFields({
      name: 'Setup Steps',
      value: steps.join('\n\n')
    })
    .addFields({
      name: 'Features',
      value: [
        '✅ Activity-based state colors (gray → orange → green)',
        '✅ Auto-close inactive tickets',
        '✅ Thread or channel support',
        '✅ Staff assignment options',
        '✅ Transcript generation',
        '✅ DM notifications'
      ].join('\n')
    })
    .setFooter({
      text: 'Need help? Create a ticket!'
    });

  await interaction.editReply({ embeds: [exampleEmbed] });

  // Offer to create example setup
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:example:create')
        .setLabel('Create Example Setup')
        .setEmoji('🚀')
        .setStyle(ButtonStyle.Primary)
    );

  await interaction.followUp({
    content: 'Would you like me to create an example ticket panel?',
    components: [row],
    ephemeral: true
  });

  // Handle button interaction
  const filter = (i: any) => i.customId === 'ticket:example:create' && i.user.id === interaction.user.id;
  const collector = interaction.channel?.createMessageComponentCollector({ 
    filter, 
    time: 60000,
    max: 1
  });

  collector?.on('collect', async (i) => {
    await i.deferUpdate();

    try {
      // Get ticket handler
      const ticketHandler = (interaction.client as any).ticketHandler;
      if (!ticketHandler) {
        await i.editReply({
          content: '❌ Ticket system not initialized.',
          components: []
        });
        return;
      }

      const services = ticketHandler.getServices();
      const { ticketService, panelService } = services;

      // Check if already configured
      let config = await ticketService.getConfig(interaction.guildId!);
      if (!config) {
        // Find or create support role
        let supportRole = interaction.guild!.roles.cache.find(r => 
          r.name.toLowerCase().includes('support') || 
          r.name.toLowerCase().includes('staff')
        );

        if (!supportRole) {
          supportRole = await interaction.guild!.roles.create({
            name: 'Ticket Support',
            color: 0x5865F2,
            reason: 'Ticket system example setup'
          });
        }

        // Create config
        config = await ticketService.createConfig(interaction.guildId!, {
          staffRoles: [supportRole.id]
        });
      }

      // Find or create support channel
      let supportChannel = interaction.guild!.channels.cache.find(ch => 
        ch.name === 'support' && ch.type === ChannelType.GuildText
      ) as TextChannel;

      if (!supportChannel) {
        supportChannel = await interaction.guild!.channels.create({
          name: 'support',
          type: ChannelType.GuildText,
          topic: '🎫 Create a support ticket here!'
        }) as TextChannel;
      }

      // Create example panel
      const embedData = {
        title: '🎫 Support Tickets',
        description: [
          'Need help? Create a ticket!',
          '',
          '**How it works:**',
          '1. Click the button below',
          '2. Fill out the form',
          '3. Our team will assist you',
          '',
          '⏰ **Response Time**: Usually within 30 minutes',
          '🔒 **Privacy**: Only you and staff can see your ticket'
        ].join('\n'),
        color: 0x5865F2,
        footer: {
          text: interaction.guild!.name + ' Support'
        }
      };

      const message = await panelService.createPanel(
        interaction.guild!,
        supportChannel.id,
        'BUTTON',
        embedData
      );

      if (message) {
        await i.editReply({
          content: `✅ Example ticket panel created in ${supportChannel}!\n\nStaff role: <@&${config.staffRoles[0]}>`,
          embeds: [],
          components: []
        });
      } else {
        await i.editReply({
          content: '❌ Failed to create example panel.',
          components: []
        });
      }

    } catch (error) {
      console.error('[Ticket Example] Error:', error);
      await i.editReply({
        content: '❌ An error occurred while creating the example.',
        components: []
      });
    }
  });

  collector?.on('end', collected => {
    if (collected.size === 0) {
      interaction.editReply({
        components: []
      });
    }
  });
}