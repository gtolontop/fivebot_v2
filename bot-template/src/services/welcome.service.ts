import { Client, GuildMember, PartialGuildMember, EmbedBuilder, TextChannel, AttachmentBuilder } from 'discord.js';

interface BotConfig {
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: any;
  welcomeLogoUrl?: string;
  welcomeThumbnailUrl?: string;
  goodbyeEnabled: boolean;
  goodbyeChannelId?: string;
  moderationEnabled: boolean;
  autoRoleEnabled: boolean;
  autoRoleId?: string;
  loggingChannelId?: string;
  customCommands?: any;
}

export class WelcomeService {
  private client: Client;
  private config: BotConfig;

  constructor(client: Client, config: BotConfig) {
    this.client = client;
    this.config = config;
  }

  updateConfig(config: BotConfig) {
    this.config = config;
  }

  async sendWelcomeMessage(member: GuildMember): Promise<boolean> {
    try {
      if (!this.config.welcomeEnabled) {
        return false;
      }

      // Determine welcome channel
      let welcomeChannel: TextChannel | null = null;

      if (this.config.welcomeChannelId) {
        const channel = member.guild.channels.cache.get(this.config.welcomeChannelId);
        if (channel && channel.isTextBased()) {
          welcomeChannel = channel as TextChannel;
        }
      }

      // Fallback to system channel or general channel
      if (!welcomeChannel) {
        welcomeChannel = member.guild.systemChannel ||
          member.guild.channels.cache.find(
            (ch) => ch.name.includes('general') && ch.isTextBased()
          ) as TextChannel || null;
      }

      if (!welcomeChannel) {
        console.warn('No suitable welcome channel found');
        return false;
      }

      // Build welcome message
      const embed = await this.buildWelcomeEmbed(member);
      const messageOptions: any = { embeds: [embed] };

      // Add logo attachment if configured
      if (this.config.welcomeLogoUrl) {
        try {
          const logoAttachment = new AttachmentBuilder(this.config.welcomeLogoUrl, {
            name: 'welcome-logo.png'
          });
          messageOptions.files = [logoAttachment];
          
          // Update embed to use attachment
          embed.setThumbnail('attachment://welcome-logo.png');
        } catch (logoError) {
          console.warn('Failed to attach logo:', logoError);
          // Continue without logo
        }
      }

      await welcomeChannel.send(messageOptions);
      console.log(`✅ Welcome message sent for ${member.user.tag} in #${welcomeChannel.name}`);
      
      return true;
    } catch (error) {
      console.error('Error sending welcome message:', error);
      return false;
    }
  }

  private async buildWelcomeEmbed(member: GuildMember): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder();

    // Use custom embed configuration if available
    if (this.config.welcomeEmbedJson) {
      try {
        const customEmbed = this.config.welcomeEmbedJson;
        
        // Replace placeholders
        const title = this.replacePlaceholders(customEmbed.title || 'Bienvenue!', member);
        const description = this.replacePlaceholders(
          customEmbed.description || 'Bienvenue sur notre serveur {user}!',
          member
        );

        embed.setTitle(title);
        embed.setDescription(description);
        
        if (customEmbed.color) {
          embed.setColor(customEmbed.color);
        }
        
        // Set thumbnail with priority: welcomeThumbnailUrl > custom embed thumbnail > logo
        if (this.config.welcomeThumbnailUrl) {
          const thumbnailUrl = this.replacePlaceholders(this.config.welcomeThumbnailUrl, member);
          embed.setThumbnail(thumbnailUrl);
        } else if (customEmbed.thumbnail && !this.config.welcomeLogoUrl) {
          const thumbnailUrl = this.replacePlaceholders(customEmbed.thumbnail.url, member);
          embed.setThumbnail(thumbnailUrl);
        }
        
        if (customEmbed.footer) {
          embed.setFooter({
            text: this.replacePlaceholders(customEmbed.footer.text, member),
            iconURL: customEmbed.footer.iconURL || undefined,
          });
        }
        
        if (customEmbed.fields) {
          customEmbed.fields.forEach((field: any) => {
            embed.addFields({
              name: this.replacePlaceholders(field.name, member),
              value: this.replacePlaceholders(field.value, member),
              inline: field.inline || false,
            });
          });
        }
        
        if (customEmbed.timestamp) {
          embed.setTimestamp();
        }
        
      } catch (customEmbedError) {
        console.warn('Error building custom embed, using default:', customEmbedError);
        this.buildDefaultEmbed(embed, member);
      }
    } else {
      this.buildDefaultEmbed(embed, member);
    }

    return embed;
  }

  private buildDefaultEmbed(embed: EmbedBuilder, member: GuildMember) {
    embed
      .setTitle('👋 Bienvenue!')
      .setDescription(`Bienvenue sur **${member.guild.name}**, ${member}!\n\nNous sommes ravis de vous accueillir parmi nous.`)
      .setColor(0x5865F2)
      .addFields(
        {
          name: '📋 Informations',
          value: `**Membre #${member.guild.memberCount}**\nCompte créé: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: '💡 Conseils',
          value: 'N\'hésitez pas à lire les règles et à vous présenter!',
          inline: true,
        }
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setFooter({
        text: `Powered by FiveBot v2`,
        iconURL: this.client.user?.displayAvatarURL(),
      })
      .setTimestamp();
  }

  private replacePlaceholders(text: string, member: GuildMember): string {
    if (!text) return '';

    // Calculate account age
    const accountCreatedDate = new Date(member.user.createdTimestamp);
    const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
    const accountAgeText = accountAgeDays < 1
      ? 'Today'
      : accountAgeDays === 1
        ? '1 day'
        : `${accountAgeDays} days`;

    // Calculate join position
    const memberArray = Array.from(member.guild.members.cache.values());
    const sortedMembers = memberArray.sort((a, b) =>
      (a.joinedTimestamp || 0) - (b.joinedTimestamp || 0)
    );
    const joinPosition = sortedMembers.findIndex(m => m.id === member.id) + 1;

    // Get boost info
    const boostCount = member.guild.premiumSubscriptionCount || 0;
    const boostTier = member.guild.premiumTier || 0;

    // Get counts
    const channelCount = member.guild.channels.cache.size;
    const roleCount = member.guild.roles.cache.size;

    return text
      // User variables
      .replace(/{user}/g, member.toString())
      .replace(/{username}/g, member.user.username)
      .replace(/{tag}/g, member.user.tag)
      .replace(/{userId}/g, member.user.id)
      .replace(/{userAvatar}/g, member.user.displayAvatarURL({ size: 256 }))
      .replace(/{accountAge}/g, accountAgeText)
      .replace(/{joinPosition}/g, joinPosition.toString())

      // Guild variables
      .replace(/{guild}/g, member.guild.name)
      .replace(/{guildId}/g, member.guild.id)
      .replace(/{guildIcon}/g, member.guild.iconURL({ size: 256 }) || '')
      .replace(/{memberCount}/g, member.guild.memberCount.toString())
      .replace(/{boostCount}/g, boostCount.toString())
      .replace(/{boostTier}/g, boostTier.toString())
      .replace(/{channelCount}/g, channelCount.toString())
      .replace(/{roleCount}/g, roleCount.toString())

      // Date/Time variables
      .replace(/{date}/g, new Date().toLocaleDateString())
      .replace(/{time}/g, new Date().toLocaleTimeString())
      .replace(/{timestamp}/g, Math.floor(Date.now() / 1000).toString())

      // Legacy/Config variables
      .replace(/{logo}/g, this.config.welcomeLogoUrl || member.guild.iconURL() || '')
      .replace(/{thumbnail}/g, this.config.welcomeThumbnailUrl || '');
  }

  async testWelcomeMessage(member: GuildMember): Promise<EmbedBuilder> {
    return this.buildWelcomeEmbed(member);
  }

  async sendGoodbyeMessage(member: GuildMember | PartialGuildMember): Promise<boolean> {
    try {
      if (!this.config.goodbyeEnabled) {
        return false;
      }

      // Determine goodbye channel
      let goodbyeChannel: TextChannel | null = null;

      if (this.config.goodbyeChannelId) {
        const channel = member.guild.channels.cache.get(this.config.goodbyeChannelId);
        if (channel && channel.isTextBased()) {
          goodbyeChannel = channel as TextChannel;
        }
      }

      // Fallback to welcome channel if no specific goodbye channel
      if (!goodbyeChannel && this.config.welcomeChannelId) {
        const channel = member.guild.channels.cache.get(this.config.welcomeChannelId);
        if (channel && channel.isTextBased()) {
          goodbyeChannel = channel as TextChannel;
        }
      }

      // Fallback to system channel or general channel
      if (!goodbyeChannel) {
        goodbyeChannel = member.guild.systemChannel ||
          member.guild.channels.cache.find(
            (ch) => ch.name.includes('general') && ch.isTextBased()
          ) as TextChannel || null;
      }

      if (!goodbyeChannel) {
        console.warn('No suitable goodbye channel found');
        return false;
      }

      // Build goodbye message
      const embed = this.buildGoodbyeEmbed(member);
      await goodbyeChannel.send({ embeds: [embed] });

      console.log(`👋 Goodbye message sent for ${member.user.tag} in #${goodbyeChannel.name}`);
      return true;
    } catch (error) {
      console.error('Error sending goodbye message:', error);
      return false;
    }
  }

  private buildGoodbyeEmbed(member: GuildMember | PartialGuildMember): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle('👋 Au revoir!')
      .setDescription(`**${member.user.tag}** a quitté le serveur.\n\nNous espérons vous revoir bientôt!`)
      .setColor(0xED4245)
      .addFields(
        {
          name: '📊 Statistiques',
          value: `Il reste **${member.guild.memberCount} membres** dans le serveur.`,
          inline: true,
        }
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setFooter({
        text: `Powered by FiveBot v2`,
        iconURL: this.client.user?.displayAvatarURL(),
      })
      .setTimestamp();

    return embed;
  }
}