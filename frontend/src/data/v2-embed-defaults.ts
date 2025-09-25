export const V2_EMBED_DEFAULTS = {
  rules: [
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
                url: "https://example.com/welcome-banner.png",
              },
              description: "Welcome illustration",
              spoiler: false,
            },
          ],
        },
        { id: 3, type: 10, content: "# __Welcome to Our Server__" },
        {
          id: 4,
          type: 10,
          content: `>>> **Our server** is your community platform for the *entire* community.

Create a **100% personalized experience** for yourself, share your content, collaborate with others, or showcase your projects.

- **Share** your creations and ideas  
- **Connect** with like-minded people  
- **Benefit** from a helping hand in a *friendly, collaborative atmosphere*

Whether you're a **beginner** or an **expert**,  
**our server** is here to **showcase your talents**  
and **connect** the community in a single space.`,
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
              url: "https://discord.gg/invite",
              label: "🧷 Invite Friends",
            },
            {
              id: 8,
              type: 2,
              style: 5,
              url: "https://example.com",
              label: "🧷 Website",
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
                url: "https://example.com/rules-banner.png",
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
          content: "`1. Be Respectful`\n-# **Treat others with courtesy and consideration.**",
        },
        {
          id: 24,
          type: 10,
          content: "`2. No Spam or Flooding`\n-# **Avoid repeated or irrelevant messages.**",
        },
        {
          id: 25,
          type: 10,
          content: "`3. Stay On-Topic`\n-# **Keep discussions relevant to the channel.**",
        },
        {
          id: 26,
          type: 10,
          content: "`4. No NSFW or Illegal Content`\n-# **Strictly prohibited, report if spotted.**",
        },
        {
          id: 27,
          type: 10,
          content: "`5. No Self-Promotion`\n-# **Ask permission before promoting content.**",
        },
        {
          id: 28,
          type: 10,
          content: "`6. Protect Privacy`\n-# **Do not share personal information.**",
        },
        {
          id: 29,
          type: 10,
          content: "`7. No Cheating or Exploits`\n-# **Keep interactions fair and honest.**",
        },
        {
          id: 30,
          type: 10,
          content: "`8. Listen to Staff`\n-# **Follow directions from moderators and admins.**",
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
                url: "https://example.com/links-banner.png",
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
          content: "**Visit our website** for features and updates.\nhttps://example.com",
        },
        {
          id: 44,
          type: 10,
          content: "**Check out our resources** for helpful information.\nhttps://example.com/resources",
        },
        {
          id: 45,
          type: 10,
          content: "**Join our community** and get involved.\nhttps://example.com/community",
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
              url: "https://example.com",
              label: "🧷 Website",
            },
            {
              id: 49,
              type: 2,
              style: 5,
              url: "https://example.com/docs",
              label: "🧷 Documentation",
            },
            {
              id: 50,
              type: 2,
              style: 5,
              url: "https://example.com/support",
              label: "🧷 Support",
            },
          ],
        },
        { id: 51, type: 14, divider: true, spacing: 1 },
      ],
    },
  ],
  pricing: [
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
                url: "https://example.com/pricing-header.png",
              },
              description: "Pricing illustration",
              spoiler: false,
            },
          ],
        },
        { id: 3, type: 10, content: "# __Pricing Plans__" },
        {
          id: 4,
          type: 10,
          content: `> Discover our platform's pricing tiers:
> 
> **Free** *(Default)* – Essential features at no cost
> **Premium** *(Most Popular)* – Unlock advanced tools 
> **Business** *(For teams)* – Full suite with custom integrations
> 
> We also offer bespoke services:
> • Custom features
> • Tailored solutions on demand
## Choose the plan that fits your needs

### __Built by the community, for the community__`,
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
              url: "https://example.com/support",
              label: "🧷 Support",
            },
            {
              id: 8,
              type: 2,
              style: 5,
              url: "https://example.com/contact",
              label: "🧷 Contact Us",
            },
          ],
        },
        { id: 9, type: 14, divider: true, spacing: 1 },
      ],
    },
    // Container 2 - Free Plan
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
                url: "https://example.com/free-plan.png",
              },
              description: "Free Plan Banner",
              spoiler: false,
            },
          ],
        },
        { id: 13, type: 10, content: "# __Free Plan__" },
        {
          id: 14,
          type: 10,
          content: `\`- Basic Features\`
-# **Access to essential functionalities**
\`- 5 Projects\`
-# **Create up to 5 projects**
\`- Community Support\`
-# **Get help from our community**
\`- Basic Customization\`
-# **Customize your experience**
\`- Public Profile\`
-# **Share your public profile**
\`- Standard Storage\`
-# **5GB of storage space**`,
        },
        { id: 26, type: 14, divider: true, spacing: 1 },
      ],
    },
    // Container 3 - Premium Plan
    {
      id: 27,
      type: 17,
      components: [
        {
          id: 28,
          type: 12,
          items: [
            {
              media: {
                url: "https://example.com/premium-plan.png",
              },
              description: "Premium Plan Banner",
              spoiler: false,
            },
          ],
        },
        { id: 29, type: 10, content: "# __Premium Plan__" },
        {
          id: 30,
          type: 10,
          content: `\`All in Free Plan\`
-# **Includes all Free Plan features**
\`- Unlimited Projects\`
-# **Create unlimited projects**
\`- Priority Support\`
-# **Get help faster with priority queue**
\`- Advanced Analytics\`
-# **Detailed insights and statistics**
\`- Custom Domain\`
-# **Use your own domain name**
\`- Premium Badge\`
-# **Exclusive premium badge**
\`- API Access\`
-# **Full API access for integrations**
\`- 50GB Storage\`
-# **Expanded storage capacity**`,
        },
        { id: 43, type: 14, divider: true, spacing: 1 },
      ],
    },
    // Container 4 - Business Plan
    {
      id: 44,
      type: 17,
      components: [
        {
          id: 45,
          type: 12,
          items: [
            {
              media: {
                url: "https://example.com/business-plan.png",
              },
              description: "Business Plan Banner",
              spoiler: false,
            },
          ],
        },
        { id: 46, type: 10, content: "# __Business Plan__" },
        {
          id: 47,
          type: 10,
          content: `\`- All Premium Features\`
-# **Everything from Free and Premium**
\`- Team Collaboration\`
-# **Work together with your team**
\`- White Label\`
-# **Remove our branding**
\`- Dedicated Support\`
-# **Your own account manager**
\`- SLA Guarantee\`
-# **99.9% uptime guarantee**
\`- Custom Integrations\`
-# **Tailored integrations for your needs**
\`- Unlimited Storage\`
-# **No storage limits**
\`- Advanced Security\`
-# **Enterprise-grade security features**`,
        },
        { id: 60, type: 14, divider: true, spacing: 1 },
      ],
    },
    // Container 5 - CTA
    {
      id: 90,
      type: 17,
      components: [
        {
          id: 91,
          type: 12,
          items: [
            {
              media: {
                url: "https://example.com/cta-banner.png",
              },
              description: "Call to Action Banner",
              spoiler: false,
            },
          ],
        },
        { id: 92, type: 10, content: "# __Start Your Journey Today__" },
        {
          id: 93,
          type: 10,
          content: `> **Get started today** and unlock your potential!
> 
> Questions? Contact our support team or ask in our community channels
## Thank you for being part of our community!`,
        },
        { id: 94, type: 14, divider: true, spacing: 1 },
        {
          id: 95,
          type: 1,
          components: [
            {
              id: 96,
              type: 2,
              style: 5,
              url: "https://example.com",
              label: "🧷 Website",
            },
            {
              id: 97,
              type: 2,
              style: 5,
              url: "https://example.com/pricing",
              label: "🧷 View Pricing",
            },
            {
              id: 98,
              type: 2,
              style: 5,
              url: "https://example.com/signup",
              label: "🧷 Get Started",
            },
          ],
        },
        { id: 99, type: 14, divider: true, spacing: 1 },
      ],
    },
  ],
  'server-info': [
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
                url: "https://example.com/server-banner.png",
              },
              description: "Server Info Banner",
              spoiler: false,
            },
          ],
        },
        { id: 3, type: 10, content: "# __Server Information__" },
        {
          id: 4,
          type: 10,
          content: `\`Server Name\`
-# **{server.name}**
\`Server ID\`
-# **{server.id}**
\`Owner\`
-# **{server.owner}**
\`Created\`
-# **{server.createdAt}**
\`Members\`
-# **{server.memberCount} total members**
\`Boosts\`
-# **{server.premiumSubscriptionCount} boosts (Level {server.premiumTier})**`,
        },
        { id: 5, type: 14, divider: true, spacing: 1 },
      ],
    },
  ],
  'embed-builder': [
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
                url: "https://example.com/builder-banner.png",
              },
              description: "Embed Builder",
              spoiler: false,
            },
          ],
        },
        { id: 3, type: 10, content: "# __V2 Embed Builder__" },
        {
          id: 4,
          type: 10,
          content: "Use the buttons below to create and manage your V2 embeds!",
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
              label: "Create New",
              emoji: { id: null, name: "➕" },
              custom_id: "embed_create",
            },
            {
              id: 8,
              type: 2,
              style: 2,
              label: "Gallery",
              emoji: { id: null, name: "🖼️" },
              custom_id: "embed_gallery",
            },
            {
              id: 9,
              type: 2,
              style: 3,
              label: "Preview",
              emoji: { id: null, name: "👁️" },
              custom_id: "embed_preview",
            },
          ],
        },
        { id: 10, type: 14, divider: true, spacing: 1 },
      ],
    },
  ],
  'user-profile': [
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
                url: "https://example.com/profile-banner.png",
              },
              description: "User Profile",
              spoiler: false,
            },
          ],
        },
        { id: 3, type: 10, content: "# __User Profile__" },
        {
          id: 4,
          type: 10,
          content: `\`Username\`
-# **{user.username}**
\`User ID\`
-# **{user.id}**
\`Account Created\`
-# **{user.createdAt}**
\`Joined Server\`
-# **{user.joinedAt}**
\`Roles\`
-# **{user.roles}**`,
        },
        { id: 5, type: 14, divider: true, spacing: 1 },
      ],
    },
  ],
  team: [
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
                url: "https://example.com/team-banner.png",
              },
              description: "Team Banner",
              spoiler: false,
            },
          ],
        },
        { id: 3, type: 10, content: "# __Our Team__" },
        {
          id: 4,
          type: 10,
          content: "Meet the amazing people behind our community!",
        },
        { id: 5, type: 14, divider: true, spacing: 1 },
      ],
    },
    {
      id: 6,
      type: 17,
      components: [
        { id: 7, type: 10, content: "## __Leadership__" },
        {
          id: 8,
          type: 10,
          content: `\`👑 Owner\`
-# **@owner** - Founder & Lead
\`⚡ Co-Owner\`
-# **@coowner** - Co-Founder & Manager`,
        },
        { id: 9, type: 14, divider: true, spacing: 1 },
      ],
    },
    {
      id: 10,
      type: 17,
      components: [
        { id: 11, type: 10, content: "## __Staff Team__" },
        {
          id: 12,
          type: 10,
          content: `\`🛡️ Admin\`
-# **@admin1** - Server Administrator
\`👮 Moderators\`
-# **@mod1** - Community Moderator
-# **@mod2** - Community Moderator`,
        },
        { id: 13, type: 14, divider: true, spacing: 1 },
      ],
    },
  ],
  announcement: [
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
                url: "https://example.com/announcement-banner.png",
              },
              description: "Announcement",
              spoiler: false,
            },
          ],
        },
        { id: 3, type: 10, content: "# __Important Announcement__" },
        {
          id: 4,
          type: 10,
          content: "> Your announcement content goes here...\n> \n> Make sure to include all important details!",
        },
        { id: 5, type: 14, divider: true, spacing: 1 },
        {
          id: 6,
          type: 10,
          content: "Posted by **@Admin** • Today at {timestamp}",
          style: 1,
        },
      ],
    },
  ],
};