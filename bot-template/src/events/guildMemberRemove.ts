import { GuildMember, PartialGuildMember } from 'discord.js';
import { WelcomeService } from '../services/welcome.service';

interface BotConfig {
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  goodbyeEnabled: boolean;
  goodbyeChannelId?: string;
  loggingChannelId?: string;
}

export async function guildMemberRemove(
  member: GuildMember | PartialGuildMember,
  welcomeService: WelcomeService,
  config: BotConfig
) {
  try {
    console.log(`\n👋 Member left: ${member.user.tag}`);

    // Send goodbye message if enabled
    if (config.goodbyeEnabled) {
      await welcomeService.sendGoodbyeMessage(member);
    }

    // Log to designated channel if configured
    if (config.loggingChannelId) {
      try {
        const logChannel = member.guild.channels.cache.get(config.loggingChannelId);
        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send({
            content: `📤 **Membre parti:** ${member.user.tag} (${member.user.id}) a quitté le serveur.`,
          });
        }
      } catch (logError) {
        console.error('Failed to log member leave:', logError);
      }
    }

  } catch (error) {
    console.error('Error handling member leave:', error);
  }
}
