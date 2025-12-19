/**
 * /poll command
 * Create a new poll
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from 'discord.js';
import { PollsService } from '../../services/polls.service';

export const data = new SlashCommandBuilder()
  .setName('poll')
  .setDescription('Create a poll')
  .addStringOption(option =>
    option
      .setName('question')
      .setDescription('The poll question')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('option1')
      .setDescription('First option')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('option2')
      .setDescription('Second option')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('option3')
      .setDescription('Third option')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('option4')
      .setDescription('Fourth option')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('option5')
      .setDescription('Fifth option')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('option6')
      .setDescription('Sixth option')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('option7')
      .setDescription('Seventh option')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('option8')
      .setDescription('Eighth option')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('option9')
      .setDescription('Ninth option')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('option10')
      .setDescription('Tenth option')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('duration')
      .setDescription('Duration (e.g., 1h, 30m, 1d, 1w) - leave empty for no time limit')
      .setRequired(false)
  )
  .addBooleanOption(option =>
    option
      .setName('multiple')
      .setDescription('Allow users to vote for multiple options')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const question = interaction.options.getString('question', true);
    const durationStr = interaction.options.getString('duration');
    const allowMultiple = interaction.options.getBoolean('multiple') || false;

    // Collect options
    const options: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const option = interaction.options.getString(`option${i}`);
      if (option) {
        options.push(option);
      }
    }

    if (options.length < 2) {
      await interaction.editReply({
        content: '❌ You must provide at least 2 options.',
      });
      return;
    }

    // Parse duration
    let duration: number | undefined;
    let endTime: Date | undefined;

    if (durationStr) {
      duration = parseDuration(durationStr) ?? undefined;
      if (!duration) {
        await interaction.editReply({
          content: '❌ Invalid duration format. Use formats like: 1h, 30m, 1d, 1w',
        });
        return;
      }

      if (duration < 60000) {
        await interaction.editReply({
          content: '❌ Duration must be at least 1 minute.',
        });
        return;
      }

      if (duration > 30 * 24 * 60 * 60 * 1000) {
        await interaction.editReply({
          content: '❌ Duration cannot exceed 30 days.',
        });
        return;
      }

      endTime = new Date(Date.now() + duration);
    }

    // Create the poll service
    const pollsService = new PollsService();
    const botId = process.env.BOT_ID || interaction.client.user!.id;

    // Create results visualization
    let resultsText = '';
    options.forEach((option: string, index: number) => {
      resultsText += `\n\n**${index + 1}. ${option}**\n${'░'.repeat(20)} 0.0% (0 votes)`;
    });

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊 ${question}`)
      .setDescription(resultsText)
      .setFooter({
        text: `0 total votes${allowMultiple ? ' • Multiple votes allowed' : ''}`,
      })
      .setTimestamp(endTime);

    if (endTime) {
      embed.addFields({
        name: '⏰ Ends',
        value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`,
        inline: false,
      });
    }

    // Create buttons (max 5 per row, 5 rows = 25 buttons, but we limit to 10 options)
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    let currentRow = new ActionRowBuilder<ButtonBuilder>();

    options.forEach((option, index) => {
      const button = new ButtonBuilder()
        .setCustomId(`poll:vote:${index}`)
        .setLabel(`${index + 1}`)
        .setStyle(ButtonStyle.Primary);

      currentRow.addComponents(button);

      // Discord allows max 5 buttons per row
      if ((index + 1) % 5 === 0 || index === options.length - 1) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder<ButtonBuilder>();
      }
    });

    // Send the poll message
    const channel = interaction.channel as TextChannel;
    const pollMessage = await channel.send({
      embeds: [embed],
      components: rows,
    });

    // Save to database
    await pollsService.createPoll(interaction.guildId, botId, {
      messageId: pollMessage.id,
      channelId: channel.id,
      creatorId: interaction.user.id,
      question,
      options,
      duration,
      allowMultiple,
    });

    let confirmText = `✅ Poll created!\n📊 **Question:** ${question}\n`;
    if (endTime) {
      confirmText += `⏰ **Ends:** <t:${Math.floor(endTime.getTime() / 1000)}:R>`;
    } else {
      confirmText += '⏰ **Duration:** No time limit';
    }

    await interaction.editReply({
      content: confirmText,
    });

    // Schedule auto-end if duration is set
    if (duration) {
      setTimeout(async () => {
        const poll = await pollsService.getPollByMessageId(pollMessage.id);
        if (poll && !poll.ended) {
          await pollsService.endPoll(poll.id);
          await pollsService.updatePollMessage(poll, interaction.client);
        }
      }, duration);
    }

  } catch (error: any) {
    console.error('[Poll] Error creating poll:', error);
    await interaction.editReply({
      content: `❌ Failed to create poll: ${error.message}`,
    });
  }
}

function parseDuration(duration: string): number | null {
  const regex = /^(\d+)([smhdw])$/;
  const match = duration.toLowerCase().match(regex);

  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}
