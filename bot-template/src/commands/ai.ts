import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
  .setName('ai')
  .setDescription('AI Assistant commands')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(subcommand =>
    subcommand
      .setName('stats')
      .setDescription('View AI usage statistics')
      .addIntegerOption(option =>
        option
          .setName('days')
          .setDescription('Number of days to analyze')
          .setMinValue(1)
          .setMaxValue(90)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('clear-history')
      .setDescription('Clear conversation history for this channel')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('toggle')
      .setDescription('Enable or disable AI in current channel')
      .addBooleanOption(option =>
        option
          .setName('enabled')
          .setDescription('Enable or disable')
          .setRequired(true)
      )
  )
  .addSubcommandGroup(group =>
    group
      .setName('docs')
      .setDescription('Manage AI knowledge base documents')
      .addSubcommand(subcommand =>
        subcommand
          .setName('add')
          .setDescription('Add a document to the knowledge base')
          .addStringOption(option =>
            option
              .setName('title')
              .setDescription('Document title')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('content')
              .setDescription('Document content')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('category')
              .setDescription('Document category')
          )
          .addIntegerOption(option =>
            option
              .setName('priority')
              .setDescription('Priority (higher = more important)')
              .setMinValue(0)
              .setMaxValue(100)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('list')
          .setDescription('List all documents in the knowledge base')
          .addStringOption(option =>
            option
              .setName('category')
              .setDescription('Filter by category')
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('remove')
          .setDescription('Remove a document from the knowledge base')
          .addStringOption(option =>
            option
              .setName('id')
              .setDescription('Document ID')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('view')
          .setDescription('View a document')
          .addStringOption(option =>
            option
              .setName('id')
              .setDescription('Document ID')
              .setRequired(true)
          )
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommandGroup = interaction.options.getSubcommandGroup();
  const subcommand = interaction.options.getSubcommand();

  if (subcommandGroup === 'docs') {
    return handleDocsCommand(interaction, subcommand);
  }

  switch (subcommand) {
    case 'stats':
      return handleStatsCommand(interaction);
    case 'clear-history':
      return handleClearHistoryCommand(interaction);
    case 'toggle':
      return handleToggleCommand(interaction);
    default:
      await interaction.reply({
        content: '❌ Unknown subcommand',
        ephemeral: true,
      });
  }
}

async function handleStatsCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const days = interaction.options.getInteger('days') || 30;

    const config = await prisma.aIConfig.findUnique({
      where: { guildId: interaction.guildId! },
    });

    if (!config) {
      return interaction.editReply({
        content: '❌ AI is not configured for this server. Please configure it in the dashboard.',
      });
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const usage = await prisma.aIUsage.findMany({
      where: {
        configId: config.id,
        createdAt: { gte: since },
      },
    });

    const conversations = await prisma.aIConversation.findMany({
      where: {
        configId: config.id,
        createdAt: { gte: since },
      },
    });

    const totalTokens = usage.reduce((sum, u) => sum + u.totalTokens, 0);
    const totalCost = usage.reduce((sum, u) => sum + u.cost, 0);
    const avgResponseTime = usage.length > 0
      ? usage.reduce((sum, u) => sum + u.responseTime, 0) / usage.length
      : 0;
    const errors = usage.filter(u => u.error).length;
    const errorRate = usage.length > 0 ? (errors / usage.length) * 100 : 0;

    // User breakdown
    const userStats = new Map<string, number>();
    usage.forEach(u => {
      userStats.set(u.userId, (userStats.get(u.userId) || 0) + 1);
    });
    const topUsers = Array.from(userStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const embed = new EmbedBuilder()
      .setTitle(`📊 AI Usage Statistics (Last ${days} days)`)
      .setColor('#5865F2')
      .addFields(
        {
          name: '💬 Total Requests',
          value: usage.length.toLocaleString(),
          inline: true,
        },
        {
          name: '🗨️ Conversations',
          value: conversations.length.toLocaleString(),
          inline: true,
        },
        {
          name: '🎯 Success Rate',
          value: `${(100 - errorRate).toFixed(1)}%`,
          inline: true,
        },
        {
          name: '🪙 Total Tokens',
          value: totalTokens.toLocaleString(),
          inline: true,
        },
        {
          name: '💰 Total Cost',
          value: `$${totalCost.toFixed(4)}`,
          inline: true,
        },
        {
          name: '⚡ Avg Response Time',
          value: `${Math.round(avgResponseTime)}ms`,
          inline: true,
        }
      )
      .setTimestamp();

    if (topUsers.length > 0) {
      const topUsersText = topUsers
        .map(([userId, count]) => `<@${userId}>: ${count} requests`)
        .join('\n');
      embed.addFields({
        name: '👥 Top Users',
        value: topUsersText,
      });
    }

    // Model breakdown
    const modelStats = new Map<string, number>();
    usage.forEach(u => {
      modelStats.set(u.model, (modelStats.get(u.model) || 0) + 1);
    });
    if (modelStats.size > 0) {
      const modelText = Array.from(modelStats.entries())
        .map(([model, count]) => `${model}: ${count}`)
        .join('\n');
      embed.addFields({
        name: '🤖 Models Used',
        value: modelText,
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[AI Command] Error fetching stats:', error);
    await interaction.editReply({
      content: '❌ Error fetching statistics. Please try again.',
    });
  }
}

async function handleClearHistoryCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const config = await prisma.aIConfig.findUnique({
      where: { guildId: interaction.guildId! },
    });

    if (!config) {
      return interaction.editReply({
        content: '❌ AI is not configured for this server.',
      });
    }

    // Delete conversations for this channel
    const deleted = await prisma.aIConversation.deleteMany({
      where: {
        configId: config.id,
        channelId: interaction.channelId,
      },
    });

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Conversation History Cleared')
      .setDescription(`Cleared ${deleted.count} conversation(s) from this channel.`)
      .setColor('#00FF00')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[AI Command] Error clearing history:', error);
    await interaction.editReply({
      content: '❌ Error clearing history. Please try again.',
    });
  }
}

async function handleToggleCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const enabled = interaction.options.getBoolean('enabled', true);

    const config = await prisma.aIConfig.findUnique({
      where: { guildId: interaction.guildId! },
    });

    if (!config) {
      return interaction.editReply({
        content: '❌ AI is not configured for this server. Please configure it in the dashboard first.',
      });
    }

    const enabledChannels: string[] = config.enabledChannels
      ? JSON.parse(config.enabledChannels as string)
      : [];
    const disabledChannels: string[] = config.disabledChannels
      ? JSON.parse(config.disabledChannels as string)
      : [];

    if (enabled) {
      // Remove from disabled, add to enabled
      const newDisabled = disabledChannels.filter(id => id !== interaction.channelId);
      if (!enabledChannels.includes(interaction.channelId)) {
        enabledChannels.push(interaction.channelId);
      }

      await prisma.aIConfig.update({
        where: { guildId: interaction.guildId! },
        data: {
          enabledChannels: JSON.stringify(enabledChannels),
          disabledChannels: JSON.stringify(newDisabled),
        },
      });
    } else {
      // Remove from enabled, add to disabled
      const newEnabled = enabledChannels.filter(id => id !== interaction.channelId);
      if (!disabledChannels.includes(interaction.channelId)) {
        disabledChannels.push(interaction.channelId);
      }

      await prisma.aIConfig.update({
        where: { guildId: interaction.guildId! },
        data: {
          enabledChannels: JSON.stringify(newEnabled),
          disabledChannels: JSON.stringify(disabledChannels),
        },
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(enabled ? '✅ AI Enabled' : '❌ AI Disabled')
      .setDescription(
        enabled
          ? 'AI will now respond in this channel according to the configured response mode.'
          : 'AI will no longer respond in this channel.'
      )
      .setColor(enabled ? '#00FF00' : '#FF0000')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[AI Command] Error toggling AI:', error);
    await interaction.editReply({
      content: '❌ Error toggling AI. Please try again.',
    });
  }
}

async function handleDocsCommand(interaction: ChatInputCommandInteraction, subcommand: string) {
  await interaction.deferReply({ ephemeral: true });

  const config = await prisma.aIConfig.findUnique({
    where: { guildId: interaction.guildId! },
  });

  if (!config) {
    return interaction.editReply({
      content: '❌ AI is not configured for this server.',
    });
  }

  try {
    switch (subcommand) {
      case 'add':
        return handleDocsAdd(interaction, config.id);
      case 'list':
        return handleDocsList(interaction, config.id);
      case 'remove':
        return handleDocsRemove(interaction, config.id);
      case 'view':
        return handleDocsView(interaction, config.id);
    }
  } catch (error) {
    console.error('[AI Docs] Error:', error);
    await interaction.editReply({
      content: '❌ Error managing documents. Please try again.',
    });
  }
}

async function handleDocsAdd(interaction: ChatInputCommandInteraction, configId: string) {
  const title = interaction.options.getString('title', true);
  const content = interaction.options.getString('content', true);
  const category = interaction.options.getString('category');
  const priority = interaction.options.getInteger('priority') || 0;

  const doc = await prisma.aIDocument.create({
    data: {
      configId,
      title,
      content,
      category,
      priority,
    },
  });

  const embed = new EmbedBuilder()
    .setTitle('📄 Document Added')
    .setDescription(`Successfully added document to knowledge base`)
    .addFields(
      { name: 'ID', value: doc.id, inline: true },
      { name: 'Title', value: title, inline: true },
      { name: 'Priority', value: priority.toString(), inline: true }
    )
    .setColor('#00FF00')
    .setTimestamp();

  if (category) {
    embed.addFields({ name: 'Category', value: category, inline: true });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleDocsList(interaction: ChatInputCommandInteraction, configId: string) {
  const category = interaction.options.getString('category');

  const docs = await prisma.aIDocument.findMany({
    where: {
      configId,
      ...(category && { category }),
    },
    orderBy: [{ priority: 'desc' }, { title: 'asc' }],
  });

  if (docs.length === 0) {
    return interaction.editReply({
      content: '📄 No documents found in the knowledge base.',
    });
  }

  // Group by category
  const byCategory = new Map<string, typeof docs>();
  docs.forEach(doc => {
    const cat = doc.category || 'Uncategorized';
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(doc);
  });

  const embed = new EmbedBuilder()
    .setTitle('📚 Knowledge Base Documents')
    .setDescription(`Total: ${docs.length} document(s)`)
    .setColor('#5865F2')
    .setTimestamp();

  for (const [cat, catDocs] of byCategory.entries()) {
    const docList = catDocs
      .map(
        doc =>
          `• **${doc.title}** (${doc.enabled ? '✅' : '❌'})\n  ID: \`${doc.id}\` | Priority: ${doc.priority}`
      )
      .join('\n');

    embed.addFields({
      name: `📁 ${cat} (${catDocs.length})`,
      value: docList.length > 1024 ? docList.substring(0, 1021) + '...' : docList,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleDocsRemove(interaction: ChatInputCommandInteraction, configId: string) {
  const docId = interaction.options.getString('id', true);

  const doc = await prisma.aIDocument.findFirst({
    where: {
      id: docId,
      configId,
    },
  });

  if (!doc) {
    return interaction.editReply({
      content: '❌ Document not found.',
    });
  }

  await prisma.aIDocument.delete({
    where: { id: docId },
  });

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Document Removed')
    .setDescription(`Successfully removed document: **${doc.title}**`)
    .setColor('#FF0000')
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleDocsView(interaction: ChatInputCommandInteraction, configId: string) {
  const docId = interaction.options.getString('id', true);

  const doc = await prisma.aIDocument.findFirst({
    where: {
      id: docId,
      configId,
    },
  });

  if (!doc) {
    return interaction.editReply({
      content: '❌ Document not found.',
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`📄 ${doc.title}`)
    .setDescription(doc.content.length > 4000 ? doc.content.substring(0, 4000) + '...' : doc.content)
    .setColor('#5865F2')
    .addFields(
      { name: 'ID', value: doc.id, inline: true },
      { name: 'Priority', value: doc.priority.toString(), inline: true },
      { name: 'Status', value: doc.enabled ? '✅ Enabled' : '❌ Disabled', inline: true }
    )
    .setTimestamp(doc.createdAt);

  if (doc.category) {
    embed.addFields({ name: 'Category', value: doc.category, inline: true });
  }

  await interaction.editReply({ embeds: [embed] });
}
