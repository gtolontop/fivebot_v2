import { GuildMember } from 'discord.js';
import { WelcomeService } from '../services/welcome.service';

// Déduplication cache pour éviter les spams
const recentWelcomes = new Set<string>();

interface BotConfig {
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: any;
  welcomeLogoUrl?: string;
  moderationEnabled: boolean;
  autoRoleEnabled: boolean;
  autoRoleId?: string;
  autoRoleIds?: string;
  loggingChannelId?: string;
  customCommands?: any;
}

export async function guildMemberAdd(
  member: GuildMember, 
  welcomeService: WelcomeService, 
  config: BotConfig
) {
  try {
    console.log(`New member joined: ${member.user.tag} in ${member.guild.name}`);

    // Créer une clé unique pour éviter les doublons
    const welcomeKey = `${member.user.id}-${member.guild.id}-${Date.now()}`;
    const dedupeKey = `${member.user.id}-${member.guild.id}`;
    
    // Vérifier si on a déjà traité ce membre récemment (dans les 30 dernières secondes)
    if (recentWelcomes.has(dedupeKey)) {
      console.log(`⚠️ Duplicate welcome detected for ${member.user.tag}, skipping...`);
      return;
    }
    
    // Ajouter à la cache et nettoyer après 30 secondes
    recentWelcomes.add(dedupeKey);
    setTimeout(() => {
      recentWelcomes.delete(dedupeKey);
    }, 30000);

    // Send welcome message if enabled
    if (config.welcomeEnabled) {
      await welcomeService.sendWelcomeMessage(member);
    }

    // Auto-assign roles if enabled
    if (config.autoRoleEnabled) {
      try {
        // Parse autoRoleIds (new multi-role system) or fall back to autoRoleId (legacy single role)
        let roleIds: string[] = [];

        if (config.autoRoleIds) {
          try {
            roleIds = JSON.parse(config.autoRoleIds);
          } catch (e) {
            console.error(`❌ Failed to parse autoRoleIds:`, e);
          }
        } else if (config.autoRoleId) {
          // Legacy single role support
          roleIds = [config.autoRoleId];
        }

        console.log(`[Auto-Role] Config check - Enabled: ${config.autoRoleEnabled}, Role IDs: ${roleIds.join(', ')}`);

        if (roleIds.length > 0) {
          const assignedRoles: string[] = [];
          const failedRoles: string[] = [];

          for (const roleId of roleIds) {
            try {
              const role = member.guild.roles.cache.get(roleId);
              console.log(`[Auto-Role] Role lookup for ${roleId}:`, role ? `Found: ${role.name}` : 'Not found in cache');

              if (role) {
                await member.roles.add(role);
                assignedRoles.push(role.name);
                console.log(`✅ Auto-role assigned to ${member.user.tag}: ${role.name}`);
              } else {
                failedRoles.push(roleId);
                console.warn(`⚠️ Auto-role not found in cache: ${roleId}`);
              }
            } catch (roleError) {
              failedRoles.push(roleId);
              console.error(`❌ Failed to assign role ${roleId}:`, roleError);
            }
          }

          if (assignedRoles.length > 0) {
            console.log(`✅ Successfully assigned ${assignedRoles.length} role(s): ${assignedRoles.join(', ')}`);
          }
          if (failedRoles.length > 0) {
            console.warn(`⚠️ Failed to assign ${failedRoles.length} role(s): ${failedRoles.join(', ')}`);
          }
        } else {
          console.warn(`⚠️ Auto-role is enabled but no role IDs are configured`);
        }
      } catch (error) {
        console.error(`❌ Error in auto-role assignment:`, error);
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