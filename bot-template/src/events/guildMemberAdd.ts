import { GuildMember } from 'discord.js';
import { WelcomeService } from '../services/welcome.service';

interface BotConfig {
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: any;
  welcomeLogoUrl?: string;
  moderationEnabled: boolean;
  autoRoleEnabled: boolean;
  autoRoleId?: string;
  loggingChannelId?: string;
  customCommands?: any;
}

export async function guildMemberAdd(
  member: GuildMember, 
  welcomeService: WelcomeService, 
  config: BotConfig
) {
  try {
    console.log(`👋 New member joined: ${member.user.tag} in ${member.guild.name}`);

    // Send welcome message if enabled
    if (config.welcomeEnabled) {
      await welcomeService.sendWelcomeMessage(member);
    }

    // Auto-assign role if enabled
    if (config.autoRoleEnabled && config.autoRoleId) {
      try {
        const role = member.guild.roles.cache.get(config.autoRoleId);
        if (role) {
          await member.roles.add(role);
          console.log(`✅ Auto-role assigned to ${member.user.tag}: ${role.name}`);
        } else {
          console.warn(`⚠️ Auto-role not found: ${config.autoRoleId}`);
        }
      } catch (roleError) {
        console.error(`❌ Failed to assign auto-role:`, roleError);
      }
    }

    // Log to designated channel if configured
    if (config.loggingChannelId) {
      try {
        const logChannel = member.guild.channels.cache.get(config.loggingChannelId);
        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send({
            content: `📥 **Nouveau membre:** ${member.user.tag} (${member.user.id}) a rejoint le serveur.`,
          });
        }
      } catch (logError) {
        console.error('Failed to log member join:', logError);
      }
    }

  } catch (error) {
    console.error('Error handling new member:', error);
  }
}