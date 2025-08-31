import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('View bot statistics and performance metrics');

export async function execute(interaction: CommandInteraction) {
  const client = interaction.client;
  
  // Calculate bot statistics
  const guildCount = client.guilds.cache.size;
  const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  const channelCount = client.channels.cache.size;
  
  // Calculate uptime
  const uptime = client.uptime || 0;
  const days = Math.floor(uptime / 86400000);
  const hours = Math.floor((uptime % 86400000) / 3600000);
  const minutes = Math.floor((uptime % 3600000) / 60000);
  const seconds = Math.floor((uptime % 60000) / 1000);
  
  const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  
  // Get memory usage
  const memUsage = process.memoryUsage();
  const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  
  // Create embed
  const statsEmbed = new EmbedBuilder()
    .setTitle('📊 Bot Statistics')
    .setColor(0x5865F2)
    .addFields(
      { name: '🏠 Servers', value: guildCount.toString(), inline: true },
      { name: '👥 Users', value: userCount.toString(), inline: true },
      { name: '💬 Channels', value: channelCount.toString(), inline: true },
      { name: '⏱️ Uptime', value: uptimeString, inline: true },
      { name: '💾 Memory', value: `${memoryMB} MB`, inline: true },
      { name: '🏓 Ping', value: `${client.ws.ping}ms`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Real-time metrics tracking enabled' });
  
  await interaction.reply({ embeds: [statsEmbed] });
}