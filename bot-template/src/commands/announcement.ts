import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';

const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('announcement')
  .setDescription('Create beautiful announcements with V2 embeds')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption(option =>
    option.setName('type')
      .setDescription('Type of announcement')
      .setRequired(true)
      .addChoices(
        { name: '📢 General Update', value: 'update' },
        { name: '🎉 Event', value: 'event' },
        { name: '⚠️ Important', value: 'important' },
        { name: '🔧 Maintenance', value: 'maintenance' },
        { name: '🎊 Celebration', value: 'celebration' }
      )
  )
  .addStringOption(option =>
    option.setName('title')
      .setDescription('Announcement title')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('message')
      .setDescription('Main announcement message')
      .setRequired(true)
  )
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Channel to send the announcement')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const type = interaction.options.getString('type', true);
  const title = interaction.options.getString('title', true);
  const message = interaction.options.getString('message', true);
  const channel = interaction.options.getChannel('channel') || interaction.channel;

  const configs = {
    update: {
      color: '#5865F2',
      emoji: '📢',
      banner: 'https://i.imgur.com/4M34hi2.png',
    },
    event: {
      color: '#57F287',
      emoji: '🎉',
      banner: 'https://i.imgur.com/AfFp7pu.png',
    },
    important: {
      color: '#ED4245',
      emoji: '⚠️',
      banner: 'https://i.imgur.com/t9YnjoE.png',
    },
    maintenance: {
      color: '#FEE75C',
      emoji: '🔧',
      banner: 'https://i.imgur.com/4M34hi2.png',
    },
    celebration: {
      color: '#EB459E',
      emoji: '🎊',
      banner: 'https://i.imgur.com/AfFp7pu.png',
    },
  };

  const config = configs[type as keyof typeof configs];
  const timestamp = new Date().toISOString();

  const componentsV2 = [
    // Main Announcement
    {
      id: 1,
      type: 17,
      components: [
        {
          id: 2,
          type: 12,
          items: [
            {
              media: {
                url: config.banner,
              },
              description: "Announcement banner",
              spoiler: false,
            },
          ],
        },
        { 
          id: 3, 
          type: 10, 
          content: `# ${config.emoji} __${title}__` 
        },
        {
          id: 4,
          type: 10,
          content: `>>> ${message}`,
        },
        { id: 5, type: 14, divider: true, spacing: 1 },
        {
          id: 6,
          type: 10,
          content: `
📅 **Posted:** <t:${Math.floor(Date.now() / 1000)}:F>
👤 **Author:** ${interaction.user}
📌 **Type:** ${type.charAt(0).toUpperCase() + type.slice(1)}
          `,
        },
      ],
    },

    // Special sections based on type
    ...(type === 'event' ? [{
      id: 20,
      type: 17,
      components: [
        { 
          id: 21, 
          type: 10, 
          content: "## 📍 **Event Details**" 
        },
        {
          id: 22,
          type: 10,
          content: `
**When:** TBD
**Where:** TBD
**Duration:** TBD

*More details coming soon!*
          `,
        },
        {
          id: 23,
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: "RSVP",
              emoji: "✅",
              custom_id: "event:rsvp",
            },
            {
              type: 2,
              style: 2,
              label: "Set Reminder",
              emoji: "🔔",
              custom_id: "event:remind",
            },
          ],
        },
      ],
    }] : []),

    ...(type === 'maintenance' ? [{
      id: 30,
      type: 17,
      components: [
        { 
          id: 31, 
          type: 10, 
          content: "## 🔧 **Maintenance Info**" 
        },
        {
          id: 32,
          type: 10,
          content: `
\`\`\`diff
- Services may be temporarily unavailable
- Expected downtime: ~30 minutes
+ We'll notify when everything is back online
\`\`\`
          `,
        },
        {
          id: 33,
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: "Status Page",
              url: "https://status.example.com",
              emoji: "📊",
            },
          ],
        },
      ],
    }] : []),

    // Reactions/Engagement
    {
      id: 100,
      type: 17,
      components: [
        { id: 101, type: 14, divider: true, spacing: 1 },
        {
          id: 102,
          type: 10,
          content: "*React below to acknowledge you've read this announcement!*",
        },
        {
          id: 103,
          type: 1,
          components: [
            {
              type: 2,
              style: 2,
              label: "0",
              emoji: "👍",
              custom_id: "announce:like",
            },
            {
              type: 2,
              style: 2,
              label: "0",
              emoji: "❤️",
              custom_id: "announce:heart",
            },
            {
              type: 2,
              style: 2,
              label: "0",
              emoji: "🎉",
              custom_id: "announce:party",
            },
            ...(type === 'important' ? [{
              type: 2,
              style: 4,
              label: "Acknowledged",
              emoji: "✅",
              custom_id: "announce:ack",
            }] : []),
          ],
        },
      ],
    },
  ];

  // Send to specified channel
  if (channel && 'send' in channel && channel.id !== interaction.channelId) {
    await (channel as any).send({ flags: COMP_V2_FLAG, components: componentsV2 });
    await interaction.reply({ 
      content: `✅ Announcement sent to ${channel}!`, 
      ephemeral: true 
    });
  } else {
    await interaction.reply({ flags: COMP_V2_FLAG, components: componentsV2 });
  }
}