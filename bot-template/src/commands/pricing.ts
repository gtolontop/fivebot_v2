import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('pricing')
  .setDescription('Display pricing information with beautiful embed');

export async function execute(interaction: ChatInputCommandInteraction) {
  const componentsV2 = [
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
                url: "https://cdn.discordapp.com/attachments/1234567890/pricing-banner.png",
              },
              description: "Pricing banner",
              spoiler: false,
            },
          ],
        },
        { id: 3, type: 10, content: "# __Our Pricing Plans__" },
        {
          id: 4,
          type: 10,
          content: `
>>> Choose the perfect plan for your needs!

We offer **flexible pricing** options to suit everyone:
- **Monthly** subscriptions
- **Annual** plans with discounts
- **Custom** enterprise solutions

All plans include **24/7 support** and regular updates!
          `,
        },
        { id: 5, type: 14, divider: true, spacing: 1 },
      ],
    },

    // Container 2 - Free Plan
    {
      id: 20,
      type: 17,
      components: [
        { id: 21, type: 10, content: "## 🆓 **Free Plan**" },
        {
          id: 22,
          type: 10,
          content: "### **$0** / month",
        },
        {
          id: 23,
          type: 10,
          content: `
\`✓\` **Basic Features**
\`✓\` Up to **100** uses per day
\`✓\` **Community** support
\`✓\` Access to **documentation**
\`✗\` Priority support
\`✗\` Advanced features
          `,
        },
        {
          id: 24,
          type: 1,
          components: [
            {
              id: 25,
              type: 2,
              style: 2,
              label: "Get Started Free",
              emoji: "🚀",
              custom_id: "pricing:free",
            },
          ],
        },
        { id: 26, type: 14, divider: true, spacing: 1 },
      ],
    },

    // Container 3 - Pro Plan
    {
      id: 30,
      type: 17,
      components: [
        { id: 31, type: 10, content: "## ⭐ **Pro Plan** `POPULAR`" },
        {
          id: 32,
          type: 10,
          content: "### **$9.99** / month",
        },
        {
          id: 33,
          type: 10,
          content: `
\`✓\` **All Free features**
\`✓\` **Unlimited** uses
\`✓\` **Priority** support
\`✓\` **Advanced** features
\`✓\` **Custom** branding
\`✓\` **Analytics** dashboard
\`✗\` API access
          `,
        },
        {
          id: 34,
          type: 1,
          components: [
            {
              id: 35,
              type: 2,
              style: 3,
              label: "Upgrade to Pro",
              emoji: "⭐",
              custom_id: "pricing:pro",
            },
          ],
        },
        { id: 36, type: 14, divider: true, spacing: 1 },
      ],
    },

    // Container 4 - Enterprise Plan
    {
      id: 40,
      type: 17,
      components: [
        { id: 41, type: 10, content: "## 🏢 **Enterprise Plan**" },
        {
          id: 42,
          type: 10,
          content: "### **$49.99** / month",
        },
        {
          id: 43,
          type: 10,
          content: `
\`✓\` **All Pro features**
\`✓\` **API** access
\`✓\` **Dedicated** support
\`✓\` **White-label** options
\`✓\` **SLA** guarantee
\`✓\` **Custom** integrations
\`✓\` **Training** sessions
          `,
        },
        {
          id: 44,
          type: 1,
          components: [
            {
              id: 45,
              type: 2,
              style: 1,
              label: "Contact Sales",
              emoji: "📞",
              custom_id: "pricing:enterprise",
            },
          ],
        },
        { id: 46, type: 14, divider: true, spacing: 1 },
      ],
    },

    // Container 5 - Footer
    {
      id: 50,
      type: 17,
      components: [
        {
          id: 51,
          type: 10,
          content: `
### 💳 **Payment Methods**
We accept: **Visa**, **MasterCard**, **PayPal**, **Crypto**

### 💰 **Money-Back Guarantee**
**30-day** refund policy on all paid plans!

### ❓ **Questions?**
Contact our sales team for custom pricing!
          `,
        },
        { id: 52, type: 14, divider: true, spacing: 1 },
        {
          id: 53,
          type: 1,
          components: [
            {
              id: 54,
              type: 2,
              style: 5,
              url: "https://yourwebsite.com/pricing",
              label: "🌐 View Full Pricing",
            },
            {
              id: 55,
              type: 2,
              style: 5,
              url: "https://yourwebsite.com/faq",
              label: "❓ FAQ",
            },
            {
              id: 56,
              type: 2,
              style: 5,
              url: "https://yourwebsite.com/contact",
              label: "📧 Contact Us",
            },
          ],
        },
      ],
    },
  ];

  await interaction.reply({ flags: COMP_V2_FLAG, components: componentsV2 });
}