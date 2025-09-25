export const V2_EMBED_DEFAULTS = {
  rules: [
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
          content: `>>> **Welcome** to our amazing community server!

Here you can:
- **Share** your ideas and projects  
- **Connect** with other members  
- **Learn** new things every day

Whether you're a **beginner** or an **expert**,  
everyone is welcome here!`,
        },
        { id: 5, type: 14, divider: true, spacing: 1 },
        {
          id: 6,
          type: 1,
          components: [
            {
              id: 7,
              type: 2,
              style: 1,
              label: "Invite Friends",
              emoji: { id: null, name: "✉️" },
              custom_id: "invite_button",
            },
            {
              id: 8,
              type: 2,
              style: 5,
              label: "Website",
              emoji: { id: null, name: "🌐" },
              url: "https://yourwebsite.com",
            },
          ],
        },
      ],
    },
    {
      id: 9,
      type: 17,
      components: [
        {
          id: 10,
          type: 12,
          items: [
            {
              media: {
                url: "https://cdn.discordapp.com/attachments/1234567890/rules_banner.png",
              },
              description: "Rules banner",
              spoiler: false,
            },
          ],
        },
        { id: 11, type: 10, content: "# 📜 __Server Rules__", style: 4 },
        { id: 12, type: 14, divider: true },
        {
          id: 13,
          type: 10,
          content: `**1. Be respectful** 🤝  
Treat all members with kindness and respect. No harassment, discrimination, or hate speech.

**2. No spam** 🚫  
Avoid repetitive messages, excessive emojis, or unnecessary pings.

**3. Stay on topic** 💭  
Keep conversations relevant to the channel you're in.

**4. No NSFW content** 🔞  
Keep all content appropriate for all ages.

**5. Follow Discord ToS** 📋  
Abide by Discord's Terms of Service at all times.

**6. Listen to staff** 👮  
Follow instructions from moderators and administrators.`,
        },
        { id: 14, type: 14, divider: true, spacing: 2 },
        {
          id: 15,
          type: 10,
          content: "**Breaking these rules may result in warnings, mutes, or bans.**",
          style: 1,
        },
      ],
    },
    {
      id: 16,
      type: 17,
      components: [
        {
          id: 17,
          type: 12,
          items: [
            {
              media: {
                url: "https://cdn.discordapp.com/attachments/1234567890/links_banner.png",
              },
              description: "Links banner",
              spoiler: false,
            },
          ],
        },
        { id: 18, type: 10, content: "## 🔗 __Useful Links__", style: 2 },
        {
          id: 19,
          type: 10,
          content: `**Important Channels:**
- <#123456789> - General chat
- <#123456790> - Announcements
- <#123456791> - Support

**Resources:**
- [FAQ](https://yourwebsite.com/faq) - Frequently asked questions
- [Guide](https://yourwebsite.com/guide) - Getting started guide`,
        },
        { id: 20, type: 14, divider: true },
        {
          id: 21,
          type: 1,
          components: [
            {
              id: 22,
              type: 2,
              style: 2,
              label: "Rules",
              emoji: { id: null, name: "📜" },
              custom_id: "rules_button",
            },
            {
              id: 23,
              type: 2,
              style: 3,
              label: "Support",
              emoji: { id: null, name: "🎫" },
              custom_id: "support_button",
            },
            {
              id: 24,
              type: 2,
              style: 4,
              label: "Report",
              emoji: { id: null, name: "🚨" },
              custom_id: "report_button",
            },
          ],
        },
      ],
    },
  ],
  pricing: [
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
                url: "https://cdn.discordapp.com/attachments/1234567890/pricing_banner.png",
              },
              description: "Pricing Plans",
              spoiler: false,
            },
          ],
        },
        { id: 3, type: 10, content: "# 💎 __Pricing Plans__", style: 3 },
        { id: 4, type: 10, content: "Choose the perfect plan for your needs!", style: 1 },
        { id: 5, type: 14, divider: true },
      ],
    },
    {
      id: 6,
      type: 17,
      components: [
        { id: 7, type: 10, content: "## 🆓 Free Plan", style: 2 },
        {
          id: 8,
          type: 10,
          content: `**$0** / month

✅ Basic features
✅ Community support
✅ 5 projects
❌ Priority support
❌ Advanced features`,
        },
        {
          id: 9,
          type: 1,
          components: [
            {
              id: 10,
              type: 2,
              style: 2,
              label: "Current Plan",
              emoji: { id: null, name: "✓" },
              disabled: true,
              custom_id: "free_plan",
            },
          ],
        },
      ],
    },
    {
      id: 11,
      type: 17,
      components: [
        { id: 12, type: 10, content: "## ⭐ Premium Plan", style: 2 },
        {
          id: 13,
          type: 10,
          content: `**$9.99** / month

✅ All Free features
✅ Priority support
✅ Unlimited projects
✅ Advanced analytics
✅ Custom branding`,
        },
        {
          id: 14,
          type: 1,
          components: [
            {
              id: 15,
              type: 2,
              style: 3,
              label: "Upgrade",
              emoji: { id: null, name: "🚀" },
              custom_id: "premium_plan",
            },
          ],
        },
      ],
    },
    {
      id: 16,
      type: 17,
      components: [
        { id: 17, type: 10, content: "## 👑 Enterprise Plan", style: 2 },
        {
          id: 18,
          type: 10,
          content: `**$49.99** / month

✅ All Premium features
✅ Dedicated support
✅ SLA guarantee
✅ Custom integrations
✅ White label options`,
        },
        {
          id: 19,
          type: 1,
          components: [
            {
              id: 20,
              type: 2,
              style: 1,
              label: "Contact Sales",
              emoji: { id: null, name: "📞" },
              custom_id: "enterprise_plan",
            },
          ],
        },
      ],
    },
  ],
  'server-info': [
    {
      id: 1,
      type: 17,
      components: [
        { id: 2, type: 10, content: "# 📊 __Server Information__", style: 3 },
        { id: 3, type: 14, divider: true },
        {
          id: 4,
          type: 10,
          content: `**Server Name:** {server.name}
**Server ID:** {server.id}
**Owner:** {server.owner}
**Created:** {server.createdAt}`,
        },
      ],
    },
    {
      id: 5,
      type: 17,
      components: [
        { id: 6, type: 10, content: "## 👥 Members", style: 2 },
        {
          id: 7,
          type: 10,
          content: `**Total Members:** {server.memberCount}
**Online:** {server.onlineCount}
**Offline:** {server.offlineCount}`,
        },
      ],
    },
    {
      id: 8,
      type: 17,
      components: [
        { id: 9, type: 10, content: "## 💬 Channels", style: 2 },
        {
          id: 10,
          type: 10,
          content: `**Text Channels:** {server.textChannels}
**Voice Channels:** {server.voiceChannels}
**Categories:** {server.categories}`,
        },
      ],
    },
  ],
  'embed-builder': [
    {
      id: 1,
      type: 17,
      components: [
        { id: 2, type: 10, content: "# 🛠️ __V2 Embed Builder__", style: 3 },
        { id: 3, type: 14, divider: true },
        {
          id: 4,
          type: 10,
          content: "Use the buttons below to create and manage your V2 embeds!",
        },
        {
          id: 5,
          type: 1,
          components: [
            {
              id: 6,
              type: 2,
              style: 1,
              label: "Create New",
              emoji: { id: null, name: "➕" },
              custom_id: "embed_create",
            },
            {
              id: 7,
              type: 2,
              style: 2,
              label: "Gallery",
              emoji: { id: null, name: "🖼️" },
              custom_id: "embed_gallery",
            },
            {
              id: 8,
              type: 2,
              style: 3,
              label: "Preview",
              emoji: { id: null, name: "👁️" },
              custom_id: "embed_preview",
            },
          ],
        },
      ],
    },
  ],
  'user-profile': [
    {
      id: 1,
      type: 17,
      components: [
        { id: 2, type: 10, content: "# 👤 __User Profile__", style: 3 },
        { id: 3, type: 14, divider: true },
        {
          id: 4,
          type: 10,
          content: `**Username:** {user.username}
**ID:** {user.id}
**Joined Discord:** {user.createdAt}
**Joined Server:** {user.joinedAt}`,
        },
      ],
    },
  ],
  team: [
    {
      id: 1,
      type: 17,
      components: [
        { id: 2, type: 10, content: "# 👥 __Our Team__", style: 3 },
        { id: 3, type: 14, divider: true },
        { id: 4, type: 10, content: "Meet the amazing people behind our community!", style: 1 },
      ],
    },
    {
      id: 5,
      type: 17,
      components: [
        { id: 6, type: 10, content: "## 👑 Owner", style: 2 },
        { id: 7, type: 10, content: "**John Doe** - Founder & Lead Developer" },
        { id: 8, type: 14, divider: true },
      ],
    },
    {
      id: 9,
      type: 17,
      components: [
        { id: 10, type: 10, content: "## 🛡️ Administrators", style: 2 },
        { id: 11, type: 10, content: "**Jane Smith** - Community Manager\n**Bob Johnson** - Technical Administrator" },
        { id: 12, type: 14, divider: true },
      ],
    },
    {
      id: 13,
      type: 17,
      components: [
        { id: 14, type: 10, content: "## 👮 Moderators", style: 2 },
        { id: 15, type: 10, content: "**Alice Brown** - Senior Moderator\n**Charlie Davis** - Moderator\n**Eve Wilson** - Moderator" },
      ],
    },
  ],
  announcement: [
    {
      id: 1,
      type: 17,
      components: [
        { id: 2, type: 10, content: "# 📢 __Important Announcement__", style: 3 },
        { id: 3, type: 14, divider: true },
        {
          id: 4,
          type: 10,
          content: "Your announcement content goes here...",
        },
        { id: 5, type: 14, divider: true },
        {
          id: 6,
          type: 10,
          content: "Posted by @Admin • {timestamp}",
          style: 1,
        },
      ],
    },
  ],
};