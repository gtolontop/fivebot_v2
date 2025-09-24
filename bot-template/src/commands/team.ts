import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('team')
  .setDescription('Display your amazing team members');

export async function execute(interaction: ChatInputCommandInteraction) {
  const componentsV2 = [
    // Header
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
                url: "https://i.imgur.com/t9YnjoE.png", // Team banner
              },
              description: "Team banner",
              spoiler: false,
            },
          ],
        },
        { 
          id: 3, 
          type: 10, 
          content: "# 👥 __Meet Our Team__" 
        },
        {
          id: 4,
          type: 10,
          content: `
>>> We are a **passionate team** dedicated to creating the best experience for our community!

Each member brings unique skills and perspectives to make our server amazing.
          `,
        },
        { id: 5, type: 14, divider: true, spacing: 1 },
      ],
    },

    // Founder/Owner
    {
      id: 10,
      type: 17,
      components: [
        { 
          id: 11, 
          type: 10, 
          content: "## 👑 **Founder & Owner**" 
        },
        {
          id: 12,
          type: 12,
          items: [
            {
              media: {
                url: "https://cdn.discordapp.com/avatars/123456789/abcdef.png",
              },
              description: "Founder avatar",
              spoiler: false,
            },
          ],
        },
        {
          id: 13,
          type: 10,
          content: `
### John Doe
*@johndoe*

> "Building communities and bringing people together!"

**Role:** Server Owner
**Joined:** January 2020
**Specialty:** Community Management
          `,
        },
        {
          id: 14,
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: "Twitter",
              url: "https://twitter.com/johndoe",
              emoji: "🐦",
            },
            {
              type: 2,
              style: 5,
              label: "GitHub",
              url: "https://github.com/johndoe",
              emoji: "🐙",
            },
          ],
        },
      ],
    },

    // Admins
    {
      id: 20,
      type: 17,
      components: [
        { 
          id: 21, 
          type: 10, 
          content: "## 🛡️ **Admin Team**" 
        },
        {
          id: 22,
          type: 10,
          content: `
\`\`\`ansi
[2;31m[1;31m━━━ ADMIN ALICE ━━━[0m[2;31m[0m
[2;37mRole:[0m [1;31mHead Administrator[0m
[2;37mTimezone:[0m [1;37mEST (UTC-5)[0m
[2;37mSpecialty:[0m [1;37mServer Security[0m

[2;34m[1;34m━━━ ADMIN BOB ━━━[0m[2;34m[0m
[2;37mRole:[0m [1;34mCommunity Admin[0m
[2;37mTimezone:[0m [1;37mPST (UTC-8)[0m
[2;37mSpecialty:[0m [1;37mEvent Management[0m
\`\`\`
          `,
        },
      ],
    },

    // Moderators
    {
      id: 30,
      type: 17,
      components: [
        { 
          id: 31, 
          type: 10, 
          content: "## 🔨 **Moderation Team**" 
        },
        {
          id: 32,
          type: 10,
          content: `
**🟢 Active Moderators:**

• **Sarah** - *Support Specialist*
  └ Available: Mon-Fri 9AM-5PM EST
  
• **Mike** - *Technical Moderator*
  └ Available: Weekends & Evenings
  
• **Emma** - *Community Helper*
  └ Available: Varies (check status)

• **David** - *Content Moderator*
  └ Available: Daily 2PM-10PM GMT
          `,
        },
        { id: 33, type: 14, divider: true, spacing: 1 },
      ],
    },

    // Support & Helpers
    {
      id: 40,
      type: 17,
      components: [
        { 
          id: 41, 
          type: 10, 
          content: "## 💝 **Support Team & Helpers**" 
        },
        {
          id: 42,
          type: 10,
          content: `
Our amazing helpers who keep the community running smoothly:

🌟 **Luna** - Welcome Team Lead
🌟 **Alex** - Technical Support
🌟 **Jordan** - Event Coordinator
🌟 **Sam** - Content Creator
🌟 **Riley** - Community Artist
          `,
        },
      ],
    },

    // Join the Team
    {
      id: 50,
      type: 17,
      components: [
        { id: 51, type: 14, divider: true, spacing: 1 },
        { 
          id: 52, 
          type: 10, 
          content: "### 📢 **Want to Join Our Team?**" 
        },
        {
          id: 53,
          type: 10,
          content: `
We're always looking for passionate individuals to help grow our community!

**Requirements:**
• Active member for 30+ days
• Good standing in the community
• Available 5+ hours per week
• Positive attitude
          `,
        },
        {
          id: 54,
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: "Apply Now",
              emoji: "📝",
              custom_id: "team:apply",
            },
            {
              type: 2,
              style: 2,
              label: "View Requirements",
              emoji: "📋",
              custom_id: "team:requirements",
            },
          ],
        },
      ],
    },
  ];

  await interaction.reply({ flags: COMP_V2_FLAG, components: componentsV2 });
}