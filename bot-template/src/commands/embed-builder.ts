import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../services/config.service';

const prisma = new PrismaClient();
const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('embed-builder')
  .setDescription('Create and manage beautiful V2 embeds');

// Default embed data - fivelink.lol style
const DEFAULT_EMBED_DATA = [
  // Container 1 - Header
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
              url: "http://83.150.218.36:3030/uploads/1750257926284-embedbuilder.png",
            },
            description: "Embed builder banner",
            spoiler: false,
          },
        ],
      },
      { id: 3, type: 10, content: "# __V2 Embed Builder__" },
      {
        id: 4,
        type: 10,
        content: `> Create stunning Discord embeds with our advanced builder!
> 
> Design professional announcements, welcome messages, rules,
> and more with our intuitive visual editor.`,
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
            url: "https://example.com/builder",
            label: "🧷 Open Builder",
          },
          {
            id: 8,
            type: 2,
            style: 5,
            url: "https://example.com/templates",
            label: "🧷 Templates",
          },
        ],
      },
      { id: 9, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 2 - Features
  {
    id: 10,
    type: 17,
    components: [
      {
        id: 11,
        type: 12,
        items: [
          {
            media: {
              url: "http://83.150.218.36:3030/uploads/1750258038482-features.png",
            },
            description: "Features banner",
            spoiler: false,
          },
        ],
      },
      { id: 12, type: 10, content: "# __✨ Builder Features__" },
      {
        id: 13,
        type: 10,
        content: `\`- Visual Editor\`
-# **Drag-and-drop interface for easy design**
\`- Live Preview\`
-# **See changes instantly as you build**
\`- Component Library\`
-# **Text, images, buttons, dividers, and more**
\`- Template Gallery\`
-# **Start with pre-made professional designs**
\`- Code Export\`
-# **Get the JSON code for your embeds**
\`- Save & Load\`
-# **Keep your designs for later editing**
\`- Multi-Container\`
-# **Create complex layouts with multiple sections**
\`- Interactive Elements\`
-# **Add buttons, select menus, and modals**`,
      },
      { id: 14, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 3 - Component Types
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
              url: "http://83.150.218.36:3030/uploads/1750258152736-components.png",
            },
            description: "Components banner",
            spoiler: false,
          },
        ],
      },
      { id: 22, type: 10, content: "# __🧩 Component Types__" },
      {
        id: 23,
        type: 10,
        content: `## Text Components
\`- Headers\`
-# **# Large titles with markdown support**
\`- Paragraphs\`
-# **Regular text with formatting options**
\`- Code Blocks\`
-# **Syntax highlighted code snippets**
\`- Quotes\`
-# **> Blockquotes for emphasis**

## Media Components
\`- Images\`
-# **Single images with captions**
\`- Galleries\`
-# **Multiple images in carousel**
\`- Banners\`
-# **Full-width header images**

## Interactive Components
\`- Buttons\`
-# **Clickable actions with styles**
\`- Select Menus\`
-# **Dropdown selection lists**
\`- Dividers\`
-# **Visual separators**`,
      },
      { id: 24, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 4 - Template Showcase
  {
    id: 30,
    type: 17,
    components: [
      {
        id: 31,
        type: 12,
        items: [
          {
            media: {
              url: "http://83.150.218.36:3030/uploads/1750258267483-templates.png",
            },
            description: "Templates showcase",
            spoiler: false,
          },
        ],
      },
      { id: 32, type: 10, content: "# __📚 Popular Templates__" },
      {
        id: 33,
        type: 10,
        content: `\`- Welcome Message\`
-# **Greet new members with style**
\`- Server Rules\`
-# **Clear and beautiful rule displays**
\`- Announcements\`
-# **Eye-catching update posts**
\`- Role Selection\`
-# **Interactive role assignment**
\`- Server Info\`
-# **Showcase your community**
\`- Event Posts\`
-# **Promote events and activities**
\`- FAQ Section\`
-# **Answer common questions**
\`- Application Forms\`
-# **Structured staff applications**

> All templates are fully customizable to match
> your server's branding and style.`,
      },
      { id: 34, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 5 - Get Started
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
              url: "http://83.150.218.36:3030/uploads/1750258381635-getstarted.png",
            },
            description: "Get started banner",
            spoiler: false,
          },
        ],
      },
      { id: 42, type: 10, content: "# __🚀 Get Started__" },
      {
        id: 43,
        type: 10,
        content: `## Quick Start Guide
\`1. Choose a Template\`
-# **Browse our gallery or start from scratch**
\`2. Customize Content\`
-# **Edit text, add images, adjust colors**
\`3. Add Components\`
-# **Drag and drop elements into place**
\`4. Preview\`
-# **See how it looks in Discord**
\`5. Export or Save\`
-# **Get the code or save for later**

## Pro Tips
\`- Use Markdown\`
-# **Format text with **bold**, *italic*, etc.**
\`- Keep it Simple\`
-# **Don't overload with too many elements**
\`- Test Interactivity\`
-# **Make sure buttons and menus work**
\`- Mobile Friendly\`
-# **Check how it looks on phones**`,
      },
      { id: 44, type: 14, divider: true, spacing: 1 },
      {
        id: 45,
        type: 1,
        components: [
          {
            id: 46,
            type: 2,
            style: 3,
            label: "Create New Embed",
            custom_id: "embedbuilder:create",
          },
          {
            id: 47,
            type: 2,
            style: 2,
            label: "Browse Gallery",
            custom_id: "embedbuilder:gallery",
          },
          {
            id: 48,
            type: 2,
            style: 5,
            url: "https://example.com/docs/embeds",
            label: "🧷 Documentation",
          },
        ],
      },
      { id: 49, type: 14, divider: true, spacing: 1 },
    ],
  },
];

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Get bot ID from environment or client
    const botId = process.env.BOT_ID || interaction.client.user?.id;
    if (!botId) {
      await interaction.reply({ content: '❌ Bot configuration error', ephemeral: true });
      return;
    }

    // Create config service
    const configService = new ConfigService(prisma, botId);
    const config = await configService.getConfig();
    
    // Get custom embed data or use default
    let embedData = DEFAULT_EMBED_DATA;
    if ((config as any).embedV2Commands) {
      const v2Commands = (config as any).embedV2Commands;
      if (v2Commands['embed-builder']?.embedV2Data && v2Commands['embed-builder'].embedV2Data.length > 0) {
        embedData = v2Commands['embed-builder'].embedV2Data;
      }
    }

    // Send the V2 embed
    await interaction.reply({
      flags: COMP_V2_FLAG,
      components: embedData
    });
  } catch (error) {
    console.error('Error in embed-builder command:', error);
    await interaction.reply({ 
      content: '❌ An error occurred while displaying the embed builder', 
      ephemeral: true 
    });
  }
}