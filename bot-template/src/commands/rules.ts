import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('rules')
  .setDescription('Display server rules with beautiful embed');

export async function execute(interaction: ChatInputCommandInteraction) {
  const componentsV2 = [
    // Container 1 - Welcome
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
                url: "https://cdn.discordapp.com/attachments/1234567890/banner1.png",
              },
              description: "Welcome banner",
              spoiler: false,
            },
          ],
        },
        { id: 3, type: 10, content: "# __Welcome to Our Server__" },
        {
          id: 4,
          type: 10,
          content: `
>>> **Welcome** to our amazing community server!

Here you can:
- **Share** your ideas and projects  
- **Connect** with other members  
- **Learn** new things every day

Whether you're a **beginner** or an **expert**,  
everyone is welcome here!
          `,
        },
        { id: 5, type: 14, divider: true, spacing: 1 },
        {
          id: 6,
          type: 1,
          components: [
            {
              id: 7,
              type: 2,
              style: 5,
              url: "https://discord.gg/yourserver",
              label: "📌 Invite Link",
            },
            {
              id: 8,
              type: 2,
              style: 5,
              url: "https://yourwebsite.com",
              label: "🌐 Website",
            },
          ],
        },
        { id: 9, type: 14, divider: true, spacing: 1 },
      ],
    },

    // Container 2 - Rules
    {
      id: 20,
      type: 17,
      components: [
        {
          id: 21,
          type: 12,
          items: [
            {
              media: {
                url: "https://cdn.discordapp.com/attachments/1234567890/rules.png",
              },
              description: "Rules banner",
              spoiler: false,
            },
          ],
        },
        { id: 22, type: 10, content: "# __Server Rules__" },
        {
          id: 23,
          type: 10,
          content: "`1. Be Respectful`\n-# **Treat everyone with kindness and respect.**",
        },
        {
          id: 24,
          type: 10,
          content: "`2. No Spam`\n-# **Avoid flooding channels with repeated messages.**",
        },
        {
          id: 25,
          type: 10,
          content: "`3. Stay On-Topic`\n-# **Keep conversations relevant to the channel.**",
        },
        {
          id: 26,
          type: 10,
          content: "`4. No NSFW Content`\n-# **Keep content appropriate for all ages.**",
        },
        {
          id: 27,
          type: 10,
          content: "`5. No Self-Promotion`\n-# **Ask permission before promoting.**",
        },
        {
          id: 28,
          type: 10,
          content: "`6. Listen to Staff`\n-# **Follow moderator instructions.**",
        },
        { id: 31, type: 14, divider: true, spacing: 1 },
      ],
    },

    // Container 3 - Useful Links
    {
      id: 40,
      type: 17,
      components: [
        {
          id: 41,
          type: 12,
          items: [
            {
              media: {
                url: "https://cdn.discordapp.com/attachments/1234567890/links.png",
              },
              description: "Links Banner",
              spoiler: false,
            },
          ],
        },
        { id: 42, type: 10, content: "# __Useful Links__" },
        {
          id: 43,
          type: 10,
          content: "**Support Channel** - Get help from our team\n<#1234567890123456789>",
        },
        {
          id: 44,
          type: 10,
          content: "**Announcements** - Stay updated\n<#1234567890123456789>",
        },
        {
          id: 45,
          type: 10,
          content: "**FAQ** - Frequently asked questions\n<#1234567890123456789>",
        },
        { id: 46, type: 14, divider: true, spacing: 1 },
        {
          id: 47,
          type: 1,
          components: [
            {
              id: 48,
              type: 2,
              style: 5,
              url: "https://discord.gg/yourserver",
              label: "🔗 Support Server",
            },
            {
              id: 49,
              type: 2,
              style: 5,
              url: "https://docs.yourserver.com",
              label: "📖 Documentation",
            },
            {
              id: 50,
              type: 2,
              style: 5,
              url: "https://status.yourserver.com",
              label: "📊 Status Page",
            },
          ],
        },
        { id: 51, type: 14, divider: true, spacing: 1 },
      ],
    },
  ];

  await interaction.reply({ flags: COMP_V2_FLAG, components: componentsV2 });
}