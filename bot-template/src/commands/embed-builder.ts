import { SlashCommandBuilder, ChatInputCommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalActionRowComponentBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('embed-builder')
  .setDescription('Create beautiful V2 embeds with live preview')
  .addSubcommand(subcommand =>
    subcommand
      .setName('create')
      .setDescription('Create a new V2 embed')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('preview')
      .setDescription('Preview your V2 embed templates')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('gallery')
      .setDescription('Browse pre-made embed templates')
  );

// Store user's embed drafts in memory (in production, use database)
const userEmbedDrafts = new Map<string, any[]>();

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'create':
      await handleCreate(interaction);
      break;
    case 'preview':
      await handlePreview(interaction);
      break;
    case 'gallery':
      await handleGallery(interaction);
      break;
  }
}

async function handleCreate(interaction: ChatInputCommandInteraction) {
  // Interactive builder with buttons
  const builderComponents = [
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
                url: "https://i.imgur.com/4M34hi2.png", // Placeholder image
              },
              description: "Embed Builder V2",
              spoiler: false,
            },
          ],
        },
        { 
          id: 3, 
          type: 10, 
          content: "# 🎨 __Embed Builder V2__" 
        },
        {
          id: 4,
          type: 10,
          content: `
>>> Welcome to the **most advanced** embed builder!

**Features:**
• 🎯 **Live preview** as you build
• 🎨 **Unlimited containers** support
• 🖼️ **Media galleries** with carousel
• 🔘 **Interactive buttons** and menus
• 📊 **Progress bars** and stats
• 🌈 **Gradient backgrounds** (coming soon)

**Quick Start:** Click a button below to start building!
          `,
        },
        { id: 5, type: 14, divider: true, spacing: 1 },
        {
          id: 6,
          type: 1,
          components: [
            {
              id: 'builder:text',
              type: 2,
              style: 1,
              label: "Add Text",
              emoji: "📝",
              custom_id: "builder:text",
            },
            {
              id: 'builder:image',
              type: 2,
              style: 1,
              label: "Add Image",
              emoji: "🖼️",
              custom_id: "builder:image",
            },
            {
              id: 'builder:button',
              type: 2,
              style: 1,
              label: "Add Button",
              emoji: "🔘",
              custom_id: "builder:button",
            },
            {
              id: 'builder:divider',
              type: 2,
              style: 1,
              label: "Add Divider",
              emoji: "➖",
              custom_id: "builder:divider",
            },
          ],
        },
        {
          id: 7,
          type: 1,
          components: [
            {
              id: 'builder:container',
              type: 2,
              style: 3,
              label: "New Container",
              emoji: "📦",
              custom_id: "builder:container",
            },
            {
              id: 'builder:preview',
              type: 2,
              style: 2,
              label: "Preview",
              emoji: "👁️",
              custom_id: "builder:preview",
            },
            {
              id: 'builder:save',
              type: 2,
              style: 3,
              label: "Save Draft",
              emoji: "💾",
              custom_id: "builder:save",
            },
            {
              id: 'builder:export',
              type: 2,
              style: 1,
              label: "Export Code",
              emoji: "📤",
              custom_id: "builder:export",
            },
          ],
        },
      ],
    },
  ];

  await interaction.reply({ 
    flags: COMP_V2_FLAG, 
    components: builderComponents,
    ephemeral: true 
  });
}

async function handlePreview(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const userDraft = userEmbedDrafts.get(userId);

  if (!userDraft || userDraft.length === 0) {
    await interaction.reply({
      content: "You don't have any saved drafts. Use `/embed-builder create` to start!",
      ephemeral: true
    });
    return;
  }

  await interaction.reply({ 
    flags: COMP_V2_FLAG, 
    components: userDraft 
  });
}

async function handleGallery(interaction: ChatInputCommandInteraction) {
  // Gallery with multiple template examples
  const galleryComponents = [
    // Header
    {
      id: 100,
      type: 17,
      components: [
        {
          id: 101,
          type: 12,
          items: [
            {
              media: {
                url: "https://i.imgur.com/AfFp7pu.png",
              },
              description: "Template Gallery",
              spoiler: false,
            },
          ],
        },
        { id: 102, type: 10, content: "# 🖼️ __Template Gallery__" },
        {
          id: 103,
          type: 10,
          content: "Browse and use pre-made templates for your embeds!",
        },
        { id: 104, type: 14, divider: true, spacing: 1 },
      ],
    },
    
    // Template 1: Server Stats
    {
      id: 200,
      type: 17,
      components: [
        { id: 201, type: 10, content: "## 📊 Server Statistics Template" },
        {
          id: 202,
          type: 10,
          content: `
\`\`\`ansi
[2;36m[1;36mServer Stats[0m[2;36m[0m
[2;32m✓ Members:[0m [1;37m{memberCount}[0m
[2;32m✓ Channels:[0m [1;37m{channelCount}[0m
[2;32m✓ Roles:[0m [1;37m{roleCount}[0m
[2;32m✓ Boosts:[0m [1;37m{boostCount}[0m
\`\`\`
          `,
        },
        {
          id: 203,
          type: 1,
          components: [
            {
              id: 'template:stats',
              type: 2,
              style: 2,
              label: "Use This Template",
              custom_id: "template:stats",
            },
          ],
        },
      ],
    },
    
    // Template 2: Welcome Card
    {
      id: 300,
      type: 17,
      components: [
        { id: 301, type: 10, content: "## 👋 Welcome Card Template" },
        {
          id: 302,
          type: 12,
          items: [
            {
              media: {
                url: "https://dummyimage.com/600x200/5865F2/ffffff&text=Welcome!",
              },
              description: "Welcome banner",
              spoiler: false,
            },
          ],
        },
        {
          id: 303,
          type: 10,
          content: `
**Welcome {user}!** 🎉

You are member **#{memberNumber}**

Don't forget to:
• Read the <#rules-channel>
• Get your roles in <#roles-channel>
• Introduce yourself in <#intro-channel>
          `,
        },
        {
          id: 304,
          type: 1,
          components: [
            {
              id: 'template:welcome',
              type: 2,
              style: 2,
              label: "Use This Template",
              custom_id: "template:welcome",
            },
          ],
        },
      ],
    },
    
    // Template 3: Poll/Vote
    {
      id: 400,
      type: 17,
      components: [
        { id: 401, type: 10, content: "## 🗳️ Poll Template" },
        {
          id: 402,
          type: 10,
          content: "### What's your favorite feature?" 
        },
        {
          id: 403,
          type: 10,
          content: `
\`\`\`diff
+ Option A: Voice Channels (45%)
████████████████████░░░░░ 

- Option B: Text Channels (30%)
████████████░░░░░░░░░░░░░

! Option C: Stage Channels (25%)
██████████░░░░░░░░░░░░░░░
\`\`\`
          `,
        },
        {
          id: 404,
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              label: "Vote A",
              emoji: "🅰️",
              custom_id: "poll:a",
            },
            {
              type: 2,
              style: 1,
              label: "Vote B",
              emoji: "🅱️",
              custom_id: "poll:b",
            },
            {
              type: 2,
              style: 1,
              label: "Vote C",
              emoji: "🇨",
              custom_id: "poll:c",
            },
          ],
        },
        {
          id: 405,
          type: 1,
          components: [
            {
              id: 'template:poll',
              type: 2,
              style: 2,
              label: "Use This Template",
              custom_id: "template:poll",
            },
          ],
        },
      ],
    },
    
    // Navigation
    {
      id: 500,
      type: 17,
      components: [
        { id: 501, type: 14, divider: true, spacing: 1 },
        {
          id: 502,
          type: 10,
          content: "💡 **Pro Tip:** Click any template to customize it in the builder!"
        },
        {
          id: 503,
          type: 1,
          components: [
            {
              type: 3,
              custom_id: "gallery:category",
              placeholder: "Browse by category...",
              options: [
                {
                  label: "Welcome & Rules",
                  description: "Templates for new members",
                  value: "welcome",
                  emoji: "👋",
                },
                {
                  label: "Server Stats",
                  description: "Analytics and statistics",
                  value: "stats",
                  emoji: "📊",
                },
                {
                  label: "Polls & Votes",
                  description: "Interactive voting templates",
                  value: "polls",
                  emoji: "🗳️",
                },
                {
                  label: "Announcements",
                  description: "News and update templates",
                  value: "announce",
                  emoji: "📢",
                },
                {
                  label: "Forms & Applications",
                  description: "Application templates",
                  value: "forms",
                  emoji: "📝",
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  await interaction.reply({ 
    flags: COMP_V2_FLAG, 
    components: galleryComponents 
  });
}