import { Client, Events, Message, TextChannel, ThreadChannel } from 'discord.js';
import { TicketService } from '../services/ticket.service';
import { TicketStateManager } from '../services/ticketStateManager.service';
import { AIRecruitmentService } from '../services/ai-recruitment.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let aiRecruitmentService: AIRecruitmentService | null = null;

export default {
  name: Events.MessageCreate,
  async execute(message: Message, ticketService: TicketService, stateManager: TicketStateManager) {
    // Check if message is in a ticket channel/thread
    const ticket = await ticketService.getTicketByChannel(message.channel.id);
    if (!ticket) return;

    // Initialize AI recruitment service if not done
    if (!aiRecruitmentService) {
      aiRecruitmentService = new AIRecruitmentService(message.client, prisma);
    }

    // Ignore only webhooks (webhooks are saved by command service with correct userId)
    // Allow normal bot messages to be saved
    if (message.webhookId !== null) {
      return;
    }

    // Check if it's a valid activity message
    if (!isActivityMessage(message)) return;

    try {
      // Check if user is staff
      const isStaff = await ticketService.isStaff(message.guildId!, message.author.id);

      // Build content with attachments
      let fullContent = message.content || '';

      // Parse Discord mentions to readable format
      if (fullContent) {
        // Replace user mentions <@id> with @Username
        const userMentions = fullContent.matchAll(/<@!?(\d+)>/g);
        for (const match of userMentions) {
          const userId = match[1];
          try {
            const user = await message.client.users.fetch(userId);
            fullContent = fullContent.replace(match[0], `@${user.username}`);
          } catch (error) {
            // Keep original if user not found
          }
        }

        // Replace role mentions <@&id> with @RoleName
        const roleMentions = fullContent.matchAll(/<@&(\d+)>/g);
        for (const match of roleMentions) {
          const roleId = match[1];
          try {
            const role = message.guild?.roles.cache.get(roleId);
            if (role) {
              fullContent = fullContent.replace(match[0], `@${role.name}`);
            }
          } catch (error) {
            // Keep original if role not found
          }
        }

        // Replace channel mentions <#id> with #channel-name
        const channelMentions = fullContent.matchAll(/<#(\d+)>/g);
        for (const match of channelMentions) {
          const channelId = match[1];
          try {
            const channel = message.guild?.channels.cache.get(channelId);
            if (channel) {
              fullContent = fullContent.replace(match[0], `#${channel.name}`);
            }
          } catch (error) {
            // Keep original if channel not found
          }
        }
      }

      // Add attachments
      if (message.attachments.size > 0) {
        const attachmentUrls = Array.from(message.attachments.values())
          .map(att => att.url)
          .join('\n');
        fullContent = fullContent ? `${fullContent}\n${attachmentUrls}` : attachmentUrls;
      }

      // Add embeds information
      if (message.embeds.length > 0) {
        const embedsInfo = message.embeds.map(embed => {
          const parts = [];
          if (embed.title) parts.push(`**${embed.title}**`);
          if (embed.description) parts.push(embed.description);
          if (embed.fields && embed.fields.length > 0) {
            embed.fields.forEach(field => {
              parts.push(`**${field.name}:** ${field.value}`);
            });
          }
          if (embed.image?.url) parts.push(`[Image](${embed.image.url})`);
          if (embed.thumbnail?.url) parts.push(`[Thumbnail](${embed.thumbnail.url})`);
          return parts.join('\n');
        }).join('\n\n---\n\n');

        fullContent = fullContent ? `${fullContent}\n\n${embedsInfo}` : embedsInfo;
      }

      // Track the message
      await ticketService.addMessage({
        ticketId: ticket.id,
        messageId: message.id,
        authorId: message.author.id,
        content: fullContent.substring(0, 4000), // Increased limit for embeds
        isStaff,
      });

      // Update activity state
      await stateManager.handleMessageActivity(ticket.id, message.author.id, isStaff);

      // Update channel name if it includes activity state
      if (ticket.containerType === 'CHANNEL' || ticket.containerType === 'HYBRID') {
        // Get updated ticket with new activity state
        const updatedTicket = await ticketService.getTicket(ticket.id);
        if (updatedTicket) {
          await updateChannelWithActivityState(message, updatedTicket, stateManager);
        }
      }

      // Log activity
      await ticketService.logAction(ticket.id, 'MESSAGE_SENT', message.author.id, {
        messageId: message.id,
        isStaff,
        hasAttachments: message.attachments.size > 0
      });

      // Process AI response for ALL tickets (only for non-bot, non-staff messages)
      if (!message.author.bot && !isStaff && aiRecruitmentService) {
        try {
          // Check global ticketAIEnabled config first
          const ticketConfig = await ticketService.getConfig(message.guildId!);
          if (!ticketConfig || ticketConfig.ticketAIEnabled === false) {
            // Global AI is disabled, skip AI processing
            return;
          }

          // Get the full ticket with aiEnabled flag
          const fullTicket = await prisma.ticket.findUnique({
            where: { id: ticket.id }
          });

          // Get category for context (optional)
          const dbCategory = await prisma.ticketCategory.findFirst({
            where: {
              guildId: message.guildId!,
              name: ticket.category || undefined
            }
          });

          // Process with AI if ticket exists and AI is enabled (both global and per-ticket)
          if (fullTicket && fullTicket.aiEnabled) {
            await aiRecruitmentService.processMessage(
              message,
              fullTicket,
              dbCategory
            );
          }
        } catch (aiError) {
          console.error('[MessageCreate] Error processing AI response:', aiError);
        }
      }

    } catch (error) {
      console.error('[MessageCreate] Error handling ticket message:', error);
    }
  }
};

// Check if message counts as activity
function isActivityMessage(message: Message): boolean {
  // Has text content
  if (message.content.trim().length > 0) return true;
  
  // Has attachments
  if (message.attachments.size > 0) return true;
  
  // Has embeds from non-bot users
  if (!message.author.bot && message.embeds.length > 0) return true;
  
  return false;
}

// Update channel name with activity state
async function updateChannelWithActivityState(
  message: Message,
  ticket: any,
  stateManager: TicketStateManager
): Promise<void> {
  try {
    const channel = message.channel;
    if (!channel.isTextBased() || channel.isThread()) return;

    // Check if channel has a name property (not DM)
    if (!('name' in channel)) return;

    const currentName = (channel as any).name;
    if (!currentName) return;
    
    const stateEmoji = stateManager.getStateEmoji(ticket.activityState);

    // Remove existing state emoji if present (including ⚪)
    const emojiPattern = /^(🕔|🟡|🟢|🔴|⚪)[-・]/;
    let baseName = currentName.replace(emojiPattern, '');

    // Add new state emoji
    const newName = `${stateEmoji}・${baseName}`;

    // Only update if name changed and within Discord limits
    if (newName !== currentName && newName.length <= 100 && 'setName' in channel) {
      await (channel as TextChannel).setName(newName);
    }
  } catch (error) {
    console.error('[MessageCreate] Error updating channel name:', error);
  }
}