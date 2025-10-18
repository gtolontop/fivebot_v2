import { Client, GuildMember, EmbedBuilder, TextChannel, AttachmentBuilder } from 'discord.js';

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
    
    return text
      .replace(/{user}/g, member.toString())
      .replace(/{username}/g, member.user.username)
      .replace(/{tag}/g, member.user.tag)
      .replace(/{guild}/g, member.guild.name)
      .replace(/{memberCount}/g, member.guild.memberCount.toString())
      .replace(/{logo}/g, this.config.welcomeLogoUrl || member.guild.iconURL() || '')
      .replace(/{thumbnail}/g, this.config.welcomeThumbnailUrl || '')
      .replace(/{userAvatar}/g, member.user.displayAvatarURL({ size: 256 }))
      .replace(/{guildIcon}/g, member.guild.iconURL({ size: 256 }) || '')
      .replace(/{date}/g, new Date().toLocaleDateString())
      .replace(/{time}/g, new Date().toLocaleTimeString());
  }

  async testWelcomeMessage(member: GuildMember): Promise<EmbedBuilder> {
    return this.buildWelcomeEmbed(member);
  }
}