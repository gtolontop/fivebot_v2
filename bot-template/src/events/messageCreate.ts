import { Client, Events, Message, TextChannel } from 'discord.js';
import { TicketService } from '../services/ticket.service';
import { TicketStateManager } from '../services/ticketStateManager.service';

export default {
  name: Events.MessageCreate,
  async execute(message: Message, ticketService: TicketService, stateManager: TicketStateManager) {
    // Check if message is in a ticket channel/thread
    const ticket = await ticketService.getTicketByChannel(message.channel.id);
    if (!ticket) return;

    // Ignore bot messages and webhooks (webhooks are saved by command service with correct userId)
    if (message.author.bot || message.webhookId !== null) {
      return;
    }

    // Check if it's a valid activity message
    if (!isActivityMessage(message)) return;

    try {
      // Check if user is staff
      const isStaff = await ticketService.isStaff(message.guildId!, message.author.id);

      // Track the message
      await ticketService.addMessage({
        ticketId: ticket.id,
        messageId: message.id,
        authorId: message.author.id,
        content: message.content.substring(0, 1000), // Limit content length
        isStaff,
        attachments: message.attachments.size > 0 ? {
          count: message.attachments.size,
          files: Array.from(message.attachments.values()).map(att => ({
            name: att.name,
            url: att.url,
            size: att.size,
            contentType: att.contentType
          }))
        } : undefined
      });

      // Update activity state
      await stateManager.handleMessageActivity(ticket.id, message.author.id, isStaff);

      // Update channel name if it includes activity state
      if (ticket.containerType === 'CHANNEL' || ticket.containerType === 'HYBRID') {
        await updateChannelWithActivityState(message, ticket, stateManager);
      }

      // Log activity
      await ticketService.logAction(ticket.id, 'MESSAGE_SENT', message.author.id, {
        messageId: message.id,
        isStaff,
        hasAttachments: message.attachments.size > 0
      });

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

    // Remove existing state emoji if present
    const emojiPattern = /^(🕔|🟡|🟢|🔴)[-・]/;
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