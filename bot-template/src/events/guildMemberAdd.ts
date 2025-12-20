import { GuildMember, TextChannel } from 'discord.js';
import { WelcomeService } from '../services/welcome.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    console.log(`\n👋 New member: ${member.user.tag}`);

    // Créer une clé unique pour éviter les doublons
    const welcomeKey = `${member.user.id}-${member.guild.id}-${Date.now()}`;
    const dedupeKey = `${member.user.id}-${member.guild.id}`;

    // Vérifier si on a déjà traité ce membre récemment (dans les 30 dernières secondes)
    if (recentWelcomes.has(dedupeKey)) {
      console.log(`⚠️  Duplicate event detected, skipping...`);
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

    // Ghost ping new member if module is enabled
    const botId = process.env.BOT_ID;
    if (botId) {
      try {
        const ghostPingModule = await prisma.botModule.findFirst({
          where: {
            botId,
            module: { slug: 'ghost-ping' },
            enabled: true
          },
          include: { module: true }
        });

        if (ghostPingModule?.config) {
          let moduleConfig: any = {};
          try {
            moduleConfig = typeof ghostPingModule.config === 'string'
              ? JSON.parse(ghostPingModule.config)
              : ghostPingModule.config;
          } catch {
            moduleConfig = {};
          }

          // Check if enabled and channel is configured
          if (moduleConfig.enabled !== false && moduleConfig.pingChannel) {
            const pingChannel = member.guild.channels.cache.get(moduleConfig.pingChannel) as TextChannel;

            if (pingChannel && pingChannel.isTextBased()) {
              // Send the ghost ping
              const pingMessage = await pingChannel.send(`<@${member.user.id}>`);

              // Delete after delay (default 100ms)
              const deleteDelay = moduleConfig.deleteDelay || 100;

              setTimeout(async () => {
                try {
                  await pingMessage.delete();
                  console.log(`   └─ 👻 Ghost pinged ${member.user.tag} in #${pingChannel.name}`);
                } catch (deleteError) {
                  console.error(`   └─ ❌ Failed to delete ghost ping:`, deleteError);
                }
              }, deleteDelay);
            }
          }
        }
      } catch (ghostPingError) {
        console.error(`   └─ ❌ Ghost ping error:`, ghostPingError);
      }
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
            console.error(`   ❌ Failed to parse role configuration`);
          }
        } else if (config.autoRoleId) {
          // Legacy single role support
          roleIds = [config.autoRoleId];
        }

        if (roleIds.length > 0) {
          const assignedRoles: string[] = [];
          const failedRoles: string[] = [];

          for (const roleId of roleIds) {
            try {
              const role = member.guild.roles.cache.get(roleId);

              if (role) {
                await member.roles.add(role);
                assignedRoles.push(role.name);
              } else {
                failedRoles.push(roleId);
              }
            } catch (roleError) {
              failedRoles.push(roleId);
            }
          }

          if (assignedRoles.length > 0) {
            console.log(`   └─ Auto-assigned ${assignedRoles.length} role(s): ${assignedRoles.join(', ')}`);
          }
          if (failedRoles.length > 0) {
            console.log(`   └─ Failed to assign ${failedRoles.length} role(s)`);
          }
        } else {
          console.log(`   └─ Auto-role enabled but no roles configured`);
        }
      } catch (error) {
        console.error(`   ❌ Error in auto-role:`, error instanceof Error ? error.message : 'Unknown error');
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