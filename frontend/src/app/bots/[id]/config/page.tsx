'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import SearchableDropdown from '@/components/SearchableDropdown';
import TicketSystemConfig from '@/components/TicketSystemConfig';
import StatusRotationConfig from '@/components/StatusRotationConfig';
import V2CommandsConfig from '@/components/V2CommandsConfig';
import { 
  ChartBarIcon, 
  Cog6ToothIcon, 
  HandRaisedIcon, 
  ShieldCheckIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  WrenchScrewdriverIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  EyeIcon,
  DocumentTextIcon,
  ServerIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TicketIcon
} from '@heroicons/react/24/outline';

interface Bot {
  id: string;
  name: string;
  status: string;
  clientId?: string;
  config?: BotConfig;
  updatedAt?: string;
}

interface BotConfig {
  id?: string;
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: {
    title?: string;
    description?: string;
    color?: string;
    thumbnail?: { url?: string };
    footer?: { text?: string };
  };
  welcomeLogoUrl?: string;
  welcomeThumbnailUrl?: string;
  moderationEnabled: boolean;
  autoRoleEnabled: boolean;
  autoRoleId?: string;
  autoRoleIds?: string[];
  loggingChannelId?: string;
  customCommands?: any;
  ticketEnabled?: boolean;
  ticketCategoryId?: string;
  ticketStaffRoleId?: string;
  ticketTranscriptChannelId?: string;
  ticketNamingFormat?: string;
  maxTicketsPerUser?: number;
  autoCloseHours?: number;
  inactivityWarningHours?: number;
  ticketThreads?: boolean;
  ticketMentionStaff?: boolean;
  ticketDMNotifications?: boolean;
  ticketRequireReason?: boolean;
  autoSaveTranscripts?: boolean;
  sendTranscriptToUser?: boolean;
  includeAttachments?: boolean;
  autoWelcomeEnabled?: boolean;
  autoWelcomeMessage?: string;
  inactivityWarningEnabled?: boolean;
  inactivityWarningMessage?: string;
  autoAssignStaff?: boolean;
  autoTagUrgent?: boolean;
  autoEscalate?: boolean;
  ticketData?: any;
  statusRotation?: {
    enabled: boolean;
    interval: number;
    statuses: Array<{
      text: string;
      type: 'playing' | 'streaming' | 'listening' | 'watching' | 'competing';
      url?: string;
      status?: 'online' | 'idle' | 'dnd' | 'invisible';
    }>;
  };
  embedV2Commands?: Record<string, {
    name: string;
    description: string;
    enabled: boolean;
    useEmbedV2: boolean;
    embedV2Data?: any[];
  }>;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  channels: DiscordChannel[];
  roles: DiscordRole[];
  memberCount?: number;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
}


export default function BotConfigPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<Bot | null>(null);
  const [botLoading, setBotLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [newToken, setNewToken] = useState('');
  const [guildsLoading, setGuildsLoading] = useState(false);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Bot configuration state
  const [config, setConfig] = useState<BotConfig>({
    welcomeEnabled: false,
    moderationEnabled: false,
    autoRoleEnabled: false,
    customCommands: {},
    ticketEnabled: false,
  });

  // Command builder state
  const [showCommandBuilder, setShowCommandBuilder] = useState(false);
  const [newCommand, setNewCommand] = useState({
    name: '',
    description: '',
    type: 'simple', // 'simple' or 'embed'
    response: '',
    embedTitle: '',
    embedDescription: '',
    embedColor: '#5865F2',
    embedThumbnail: '',
    embedFooter: ''
  });

  // Discord data state
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [guildChannels, setGuildChannels] = useState<Record<string, DiscordChannel[]>>({});
  const [guildRoles, setGuildRoles] = useState<Record<string, DiscordRole[]>>({});

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchBot();
      fetchDiscordGuilds();
    }
    
    // Cleanup interval on unmount
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [user, botId]);

  const fetchBot = async () => {
    try {
      const response = await botsAPI.getById(botId);
      setBot(response.data);
      if (response.data.config) {
        const configData = response.data.config;
        let ticketData = {};
        
        // Parse ticketData if it's a string
        if (configData.ticketData) {
          if (typeof configData.ticketData === 'string') {
            try {
              ticketData = JSON.parse(configData.ticketData);
            } catch (e) {
              console.error('Failed to parse ticketData:', e);
              ticketData = {};
            }
          } else {
            ticketData = configData.ticketData;
          }
        }
        
        // Parse statusRotation if it's a string
        let statusRotation = null;
        if (configData.statusRotation) {
          if (typeof configData.statusRotation === 'string') {
            try {
              statusRotation = JSON.parse(configData.statusRotation);
            } catch (e) {
              console.error('Failed to parse statusRotation:', e);
            }
          } else {
            statusRotation = configData.statusRotation;
          }
        }
        
        // Parse embedV2Commands if it's a string
        let embedV2Commands = null;
        if (configData.embedV2Commands) {
          if (typeof configData.embedV2Commands === 'string') {
            try {
              embedV2Commands = JSON.parse(configData.embedV2Commands);
            } catch (e) {
              console.error('Failed to parse embedV2Commands:', e);
            }
          } else {
            embedV2Commands = configData.embedV2Commands;
          }
        }
        
        // Type the ticketData properly
        const typedTicketData = ticketData as any;
        
        // Merge ticketData fields into config
        // Use the value from ticketData if it exists, otherwise check configData, then use default
        setConfig({
          ...configData,
          statusRotation: statusRotation,
          embedV2Commands: embedV2Commands,
          ticketEnabled: typedTicketData.ticketEnabled ?? configData.ticketEnabled ?? false,
          ticketCategoryId: typedTicketData.ticketCategoryId ?? configData.ticketCategoryId ?? '',
          ticketStaffRoleId: typedTicketData.ticketStaffRoleId ?? configData.ticketStaffRoleId ?? '',
          ticketTranscriptChannelId: typedTicketData.ticketTranscriptChannelId ?? configData.ticketTranscriptChannelId ?? '',
          ticketNamingFormat: typedTicketData.ticketNamingFormat ?? configData.ticketNamingFormat ?? 'number',
          maxTicketsPerUser: typedTicketData.maxTicketsPerUser ?? configData.maxTicketsPerUser ?? 3,
          autoCloseHours: typedTicketData.autoCloseHours ?? configData.autoCloseHours ?? 72,
          inactivityWarningHours: typedTicketData.inactivityWarningHours ?? configData.inactivityWarningHours ?? 24,
          ticketThreads: typedTicketData.ticketThreads ?? configData.ticketThreads ?? false,
          ticketMentionStaff: typedTicketData.ticketMentionStaff ?? configData.ticketMentionStaff ?? false,
          ticketDMNotifications: typedTicketData.ticketDMNotifications ?? configData.ticketDMNotifications ?? false,
          ticketRequireReason: typedTicketData.ticketRequireReason ?? configData.ticketRequireReason ?? false,
          autoSaveTranscripts: typedTicketData.autoSaveTranscripts ?? configData.autoSaveTranscripts ?? false,
          sendTranscriptToUser: typedTicketData.sendTranscriptToUser ?? configData.sendTranscriptToUser ?? false,
          includeAttachments: typedTicketData.includeAttachments ?? configData.includeAttachments ?? false,
          autoWelcomeEnabled: typedTicketData.autoWelcomeEnabled ?? configData.autoWelcomeEnabled ?? false,
          autoWelcomeMessage: typedTicketData.autoWelcomeMessage ?? configData.autoWelcomeMessage ?? '',
          inactivityWarningEnabled: typedTicketData.inactivityWarningEnabled ?? configData.inactivityWarningEnabled ?? false,
          inactivityWarningMessage: typedTicketData.inactivityWarningMessage ?? configData.inactivityWarningMessage ?? '',
          autoAssignStaff: typedTicketData.autoAssignStaff ?? configData.autoAssignStaff ?? false,
          autoTagUrgent: typedTicketData.autoTagUrgent ?? configData.autoTagUrgent ?? false,
          autoEscalate: typedTicketData.autoEscalate ?? configData.autoEscalate ?? false,
        });
        
        console.log('Loaded config with ticketEnabled:', typedTicketData.ticketEnabled ?? configData.ticketEnabled ?? false);
      }
    } catch (error) {
      console.error('Error loading bot:', error);
      toast.error('Unable to load bot information');
      router.push('/bots');
    } finally {
      setBotLoading(false);
    }
  };


  const fetchDiscordGuilds = async () => {
    if (!botId) return;
    
    setGuildsLoading(true);
    try {
      const response = await botsAPI.getGuilds(botId);
      const discordGuilds = response.data;
      
      // Fetch channels and roles for each guild
      const guildData: DiscordGuild[] = [];
      const channelsData: Record<string, DiscordChannel[]> = {};
      const rolesData: Record<string, DiscordRole[]> = {};
      
      for (const guild of discordGuilds) {
        try {
          // Fetch channels
          const channelsResponse = await botsAPI.getGuildChannels(botId, guild.id);
          const channels = channelsResponse.data;
          channelsData[guild.id] = channels;
          
          // Fetch roles
          const rolesResponse = await botsAPI.getGuildRoles(botId, guild.id);
          const roles = rolesResponse.data;
          rolesData[guild.id] = roles;
          
          guildData.push({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            channels,
            roles,
            memberCount: guild.memberCount || 0
          });
        } catch (error) {
          console.error(`Error loading data for server ${guild.name}:`, error);
          // Add guild with empty data if API fails
          guildData.push({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            channels: [],
            roles: [],
            memberCount: 0
          });
        }
      }
      
      setGuilds(guildData);
      setGuildChannels(channelsData);
      setGuildRoles(rolesData);
      
    } catch (error) {
      console.error('Error loading Discord servers:', error);
      toast.error('Unable to load Discord servers');
    } finally {
      setGuildsLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      // Prepare config data with stringified fields
      const configToSave = {
        ...config,
        statusRotation: config.statusRotation ? JSON.stringify(config.statusRotation) : null,
        embedV2Commands: config.embedV2Commands ? JSON.stringify(config.embedV2Commands) : null,
      };
      
      await botsAPI.updateConfig(botId, configToSave);
      toast.success('Configuration saved successfully');
      
      // If bot was online, it will restart automatically
      if (bot?.status === 'ONLINE') {
        setBot(prev => prev ? { ...prev, status: 'RESTARTING' } : null);
        toast('Bot is restarting to apply new configuration...', { icon: 'ℹ️' });
      }
      
      // Refresh bot status after a delay
      setTimeout(fetchBot, 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const startBot = async () => {
    try {
      await botsAPI.start(botId);
      toast.success('Bot start command sent');
      // Update status immediately to STARTING
      setBot(prev => prev ? { ...prev, status: 'STARTING' } : null);
      
      // Clear any existing interval
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      
      // Check status multiple times
      let attempts = 0;
      statusCheckInterval.current = setInterval(async () => {
        attempts++;
        const response = await botsAPI.getById(botId);
        setBot(response.data);
        
        // Stop checking after 30 seconds or when bot is online
        if (attempts >= 15 || response.data.status === 'ONLINE') {
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
            statusCheckInterval.current = null;
          }
          if (response.data.status === 'ONLINE') {
            toast.success('Bot is now online!');
          }
        }
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error starting bot');
    }
  };

  const stopBot = async () => {
    try {
      await botsAPI.stop(botId);
      toast.success('Bot stop command sent');
      setTimeout(fetchBot, 2000); // Refresh after 2 seconds
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error stopping bot');
    }
  };

  const restartBot = async () => {
    try {
      await botsAPI.start(botId, { force: true });
      toast.success('Bot restart command sent');
      setTimeout(fetchBot, 2000); // Refresh after 2 seconds
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error restarting bot');
    }
  };

  const updateConfig = async (updates: Partial<BotConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    
    // Auto-save for important toggles and V2 features
    if ('ticketEnabled' in updates || 'welcomeEnabled' in updates || 
        'moderationEnabled' in updates || 'autoRoleEnabled' in updates ||
        'statusRotation' in updates || 'embedV2Commands' in updates) {
      try {
        // Prepare data with proper serialization
        const dataToSave: any = { ...config, ...updates };
        if ('statusRotation' in updates && updates.statusRotation) {
          dataToSave.statusRotation = JSON.stringify(updates.statusRotation);
        }
        if ('embedV2Commands' in updates && updates.embedV2Commands) {
          dataToSave.embedV2Commands = JSON.stringify(updates.embedV2Commands);
        }
        
        await botsAPI.updateConfig(botId, dataToSave);
        toast.success('Settings updated');
        
        // If bot was online and these are major changes, notify about restart
        if (bot?.status === 'ONLINE' && ('statusRotation' in updates || 'embedV2Commands' in updates)) {
          toast('Bot will restart to apply changes', { icon: '🔄' });
        }
      } catch (error: any) {
        toast.error('Failed to save settings');
        // Revert the change
        setConfig(prev => ({ ...prev, ...config }));
      }
    }
  };

  const updateWelcomeEmbed = (updates: Partial<BotConfig['welcomeEmbedJson']>) => {
    setConfig(prev => ({
      ...prev,
      welcomeEmbedJson: { ...prev.welcomeEmbedJson, ...updates }
    }));
  };

  const exportConfig = () => {
    const configToExport = {
      ...config,
      exportedAt: new Date().toISOString(),
      botName: bot?.name,
      version: '2.0'
    };
    
    const dataStr = JSON.stringify(configToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${bot?.name || 'bot'}-config-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Configuration exported successfully');
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        
        // Validate the config structure
        const validConfig: Partial<BotConfig> = {
          welcomeEnabled: Boolean(importedConfig.welcomeEnabled),
          welcomeChannelId: importedConfig.welcomeChannelId || undefined,
          welcomeEmbedJson: importedConfig.welcomeEmbedJson || undefined,
          welcomeLogoUrl: importedConfig.welcomeLogoUrl || undefined,
          moderationEnabled: Boolean(importedConfig.moderationEnabled),
          autoRoleEnabled: Boolean(importedConfig.autoRoleEnabled),
          autoRoleId: importedConfig.autoRoleId || undefined,
          loggingChannelId: importedConfig.loggingChannelId || undefined,
          customCommands: importedConfig.customCommands || {}
        };
        
        setConfig(prev => ({ ...prev, ...validConfig }));
        toast.success('Configuration imported successfully');
      } catch (error) {
        toast.error('Import error: invalid JSON file');
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const resetConfig = () => {
    if (!confirm('Are you sure you want to reset the entire configuration? This action is irreversible.')) {
      return;
    }

    const defaultConfig: BotConfig = {
      welcomeEnabled: false,
      moderationEnabled: false,
      autoRoleEnabled: false,
      customCommands: {},
    };

    setConfig(defaultConfig);
    toast.success('Configuration reset');
  };

  const handleUpdateToken = async () => {
    if (!newToken.trim()) {
      toast.error('Please enter a new token');
      return;
    }

    if (!confirm('⚠️ Are you sure you want to update the bot token?\n\nThe bot will:\n• Validate the new token with Discord\n• Stop the bot if it\'s running\n• Update the token\n• Restart automatically\n\nThis may take a few seconds.')) {
      return;
    }

    setSaving(true);
    try {
      await botsAPI.updateToken(botId, newToken);
      toast.success('Bot token updated successfully! The bot will restart now.');
      setNewToken(''); // Clear the input

      // Refresh bot data after a short delay to see the new status
      setTimeout(() => {
        fetchBot();
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error updating bot token';
      toast.error(errorMessage);

      // Show more specific error if it's a validation error
      if (errorMessage.includes('Invalid') || errorMessage.includes('token')) {
        toast.error('Please check that your token is correct and hasn\'t been reset on Discord Developer Portal', {
          duration: 5000
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendBot = async () => {
    if (!confirm('Are you sure you want to suspend this bot? The bot will be stopped and marked as inactive. You can reactivate it later.')) {
      return;
    }

    setSaving(true);
    try {
      await botsAPI.suspend(botId);
      toast.success('Bot suspended successfully');
      router.push('/bots');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error suspending bot');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBot = async () => {
    if (!confirm('⚠️ WARNING: Are you sure you want to permanently delete this bot?\n\nThis action will:\n• Stop the bot immediately\n• Delete all bot data\n• Remove all configurations\n• This CANNOT be undone\n\nType "DELETE" in the next prompt to confirm.')) {
      return;
    }

    const confirmation = prompt('Please type "DELETE" to confirm permanent deletion:');
    if (confirmation !== 'DELETE') {
      toast.error('Deletion cancelled. You must type "DELETE" exactly.');
      return;
    }

    setSaving(true);
    try {
      await botsAPI.delete(botId);
      toast.success('Bot deleted successfully');
      router.push('/bots');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting bot');
    } finally {
      setSaving(false);
    }
  };

  const addCommand = () => {
    if (!newCommand.name.trim()) {
      toast.error('Command name is required');
      return;
    }

    if (!newCommand.response.trim() && newCommand.type === 'simple') {
      toast.error('Response text is required');
      return;
    }

    if (newCommand.type === 'embed' && !newCommand.embedTitle.trim() && !newCommand.embedDescription.trim()) {
      toast.error('Embed title or description is required');
      return;
    }

    const commandData = {
      name: newCommand.name.toLowerCase().replace(/\s+/g, ''),
      description: newCommand.description || `Custom command: ${newCommand.name}`,
      type: newCommand.type,
      response: newCommand.type === 'simple' ? newCommand.response : undefined,
      embed: newCommand.type === 'embed' ? {
        title: newCommand.embedTitle,
        description: newCommand.embedDescription,
        color: newCommand.embedColor,
        thumbnail: newCommand.embedThumbnail || undefined,
        footer: newCommand.embedFooter ? { text: newCommand.embedFooter } : undefined,
      } : undefined,
    };

    const updatedCommands = {
      ...config.customCommands,
      [commandData.name]: commandData
    };

    setConfig(prev => ({ ...prev, customCommands: updatedCommands }));
    
    // Reset form
    setNewCommand({
      name: '',
      description: '',
      type: 'simple',
      response: '',
      embedTitle: '',
      embedDescription: '',
      embedColor: '#5865F2',
      embedThumbnail: '',
      embedFooter: ''
    });
    
    setShowCommandBuilder(false);
    toast.success(`Command /${commandData.name} added successfully`);
  };

  const deleteCommand = (commandName: string) => {
    if (!confirm(`Are you sure you want to delete the command /${commandName}?`)) {
      return;
    }

    const updatedCommands = { ...config.customCommands };
    delete updatedCommands[commandName];
    
    setConfig(prev => ({ ...prev, customCommands: updatedCommands }));
    toast.success(`Command /${commandName} deleted`);
  };

  if (loading || botLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading bot configuration...</p>
        </div>
      </div>
    );
  }

  if (!user || !bot) {
    return null;
  }

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon, description: 'Bot info and servers' },
    { id: 'welcome', name: 'Welcome', icon: HandRaisedIcon, description: 'Welcome messages' },
    { id: 'moderation', name: 'Moderation', icon: ShieldCheckIcon, description: 'Auto-moderation' },
    { id: 'roles', name: 'Auto-Roles', icon: UserGroupIcon, description: 'Automatic role assignment' },
    { id: 'tickets', name: 'Tickets', icon: TicketIcon, description: 'Support ticket system' },
    { id: 'commands', name: 'Commands', icon: ChatBubbleLeftRightIcon, description: 'Custom commands' },
    { id: 'status', name: 'Status', icon: ChartBarIcon, description: 'Bot status rotation' },
    { id: 'v2commands', name: 'V2 Embeds', icon: DocumentTextIcon, description: 'Advanced V2 embed commands' },
    { id: 'advanced', name: 'Advanced', icon: WrenchScrewdriverIcon, description: 'Advanced settings' },
  ];

  const textChannels = guilds.flatMap(guild => 
    guild.channels.filter(channel => channel.type === 0).map(channel => ({
      ...channel,
      guildName: guild.name
    }))
  );

  const allRoles = guilds.flatMap(guild => 
    guild.roles.filter(role => role.name !== '@everyone').map(role => ({
      ...role,
      guildName: guild.name
    }))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'text-green-600 bg-green-100';
      case 'STARTING': case 'STOPPING': case 'RESTARTING': return 'text-yellow-600 bg-yellow-100';
      case 'ERROR': return 'text-red-600 bg-red-100';
      case 'OFFLINE': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/bots/${botId}`)}
                className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Bot
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{bot.name}</h1>
                <p className="text-gray-600 mt-1">Bot Configuration & Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Bot Status Badge */}
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bot.status)}`}>
                {bot.status === 'ONLINE' && <CheckCircleIcon className="w-4 h-4 mr-1" />}
                {bot.status === 'ERROR' && <ExclamationTriangleIcon className="w-4 h-4 mr-1" />}
                {(bot.status === 'STARTING' || bot.status === 'STOPPING' || bot.status === 'RESTARTING' || bot.status === 'OFFLINE') && <ClockIcon className="w-4 h-4 mr-1" />}
                {bot.status === 'ONLINE' ? 'Online' : 
                 bot.status === 'STARTING' ? 'Starting...' :
                 bot.status === 'STOPPING' ? 'Stopping...' :
                 bot.status === 'RESTARTING' ? 'Restarting...' :
                 bot.status === 'ERROR' ? 'Error' : 'Offline'}
              </div>

              {/* Start/Stop/Restart Buttons */}
              {bot.status === 'OFFLINE' && (
                <button
                  onClick={startBot}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <PlayIcon className="w-4 h-4 mr-1" />
                  Start Bot
                </button>
              )}
              
              {bot.status === 'ONLINE' && (
                <>
                  <button
                    onClick={restartBot}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-1" />
                    Restart
                  </button>
                  <button
                    onClick={stopBot}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <StopIcon className="w-4 h-4 mr-1" />
                    Stop
                  </button>
                </>
              )}

              {/* Save Button */}
              <button
                onClick={saveConfig}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:w-80">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-start px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <IconComponent className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium">{tab.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{tab.description}</div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                {/* General Tab */}
                {activeTab === 'general' && (
                  <div className="p-6">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">General Information</h2>
                      <p className="text-gray-600">Bot information and connected Discord servers</p>
                    </div>

                    <div className="space-y-6">
                      {/* Bot Information */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bot Information</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Bot Name</dt>
                              <dd className="text-sm text-gray-900 mt-1">{bot.name}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Status</dt>
                              <dd className="text-sm text-gray-900 mt-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bot.status)}`}>
                                  {bot.status}
                                </span>
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Client ID</dt>
                              <dd className="text-sm text-gray-900 mt-1 font-mono">{bot.clientId || 'N/A'}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                              <dd className="text-sm text-gray-900 mt-1">
                                {bot.updatedAt ? new Date(bot.updatedAt).toLocaleString() : 'N/A'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Total Servers</dt>
                              <dd className="text-sm text-gray-900 mt-1 font-semibold">{guilds.length}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Total Users</dt>
                              <dd className="text-sm text-gray-900 mt-1 font-semibold">
                                {guilds.reduce((sum, guild) => sum + (guild.memberCount || 0), 0).toLocaleString()}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>

                      {/* Discord Servers */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Discord Servers</h3>
                        {guildsLoading ? (
                          <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-3"></div>
                            <span className="text-gray-600">Loading Discord servers...</span>
                          </div>
                        ) : guilds.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {guilds.map((guild) => (
                              <div key={guild.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                <div className="flex items-center space-x-3">
                                  {guild.icon ? (
                                    <img 
                                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                                      alt={guild.name}
                                      className="w-12 h-12 rounded-full"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                                      <ServerIcon className="w-6 h-6 text-gray-600" />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{guild.name}</h4>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                      <span>{guild.memberCount?.toLocaleString()} members</span>
                                      <span>{guild.channels.length} channels</span>
                                      <span>{guild.roles.length} roles</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1 text-green-600">
                                    <CheckCircleIcon className="w-4 h-4" />
                                    <span className="text-xs font-medium">Connected</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center p-8 bg-gray-50 rounded-lg">
                            <ServerIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Discord Servers</h3>
                            <p className="text-gray-600 mb-4">Your bot hasn't been invited to any servers yet.</p>
                            <button
                              onClick={() => router.push(`/bots/${botId}`)}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              Generate Invite Link
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Setup</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <button
                            onClick={() => setActiveTab('welcome')}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                          >
                            <HandRaisedIcon className="w-8 h-8 text-indigo-600 mb-2" />
                            <h4 className="font-medium text-gray-900">Welcome Messages</h4>
                            <p className="text-sm text-gray-600 mt-1">Greet new members automatically</p>
                          </button>
                          
                          <button
                            onClick={() => setActiveTab('commands')}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                          >
                            <ChatBubbleLeftRightIcon className="w-8 h-8 text-purple-600 mb-2" />
                            <h4 className="font-medium text-gray-900">Custom Commands</h4>
                            <p className="text-sm text-gray-600 mt-1">Create custom slash commands</p>
                          </button>
                          
                          <button
                            onClick={() => setActiveTab('moderation')}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                          >
                            <ShieldCheckIcon className="w-8 h-8 text-green-600 mb-2" />
                            <h4 className="font-medium text-gray-900">Moderation</h4>
                            <p className="text-sm text-gray-600 mt-1">Enable automatic moderation</p>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Welcome Tab */}
                {activeTab === 'welcome' && (
                  <div className="p-6">
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Messages</h2>
                          <p className="text-gray-600">Customize welcome messages for new members</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.welcomeEnabled}
                            onChange={(e) => updateConfig({ welcomeEnabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          <span className="ml-3 text-sm font-medium text-gray-900">
                            {config.welcomeEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>
                    </div>

                    {config.welcomeEnabled && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Welcome Channel
                          </label>
                          <SearchableDropdown
                            options={textChannels}
                            value={config.welcomeChannelId || ''}
                            onChange={(value) => updateConfig({ welcomeChannelId: value })}
                            placeholder="Select a welcome channel"
                            emptyMessage="No text channels available"
                          />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Configuration */}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Message Title
                              </label>
                              <input
                                type="text"
                                value={config.welcomeEmbedJson?.title || ''}
                                onChange={(e) => updateWelcomeEmbed({ title: e.target.value })}
                                placeholder="👋 Welcome!"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                              </label>
                              <textarea
                                value={config.welcomeEmbedJson?.description || ''}
                                onChange={(e) => updateWelcomeEmbed({ description: e.target.value })}
                                placeholder="Welcome to our server {user}! We're excited to have you here."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Use {'{user}'} to mention the user, {'{username}'} for the name, {'{guild}'} for the server
                              </p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Color (hex)
                              </label>
                              <input
                                type="text"
                                value={config.welcomeEmbedJson?.color || '#5865F2'}
                                onChange={(e) => updateWelcomeEmbed({ color: e.target.value })}
                                placeholder="#5865F2"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Logo URL (optional)
                              </label>
                              <input
                                type="url"
                                value={config.welcomeLogoUrl || ''}
                                onChange={(e) => updateConfig({ welcomeLogoUrl: e.target.value })}
                                placeholder="https://example.com/logo.png"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Thumbnail URL (optional)
                              </label>
                              <input
                                type="url"
                                value={config.welcomeThumbnailUrl || ''}
                                onChange={(e) => updateConfig({ welcomeThumbnailUrl: e.target.value })}
                                placeholder="https://example.com/thumbnail.png"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          {/* Live Preview */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Live Preview</h4>
                            <div className="bg-gray-800 rounded-lg p-4">
                              <div className="bg-gray-700 rounded-md p-4 relative" style={{
                                borderLeft: `4px solid ${config.welcomeEmbedJson?.color || '#5865F2'}`
                              }}>
                                {config.welcomeThumbnailUrl && (
                                  <img 
                                    src={config.welcomeThumbnailUrl} 
                                    alt="Thumbnail" 
                                    className="absolute top-4 right-4 w-16 h-16 rounded"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                                {config.welcomeEmbedJson?.title && (
                                  <h5 className="text-white font-semibold mb-2 pr-20">
                                    {config.welcomeEmbedJson.title}
                                  </h5>
                                )}
                                {config.welcomeEmbedJson?.description && (
                                  <p className="text-gray-300 text-sm mb-3 pr-20">
                                    {config.welcomeEmbedJson.description
                                      .replace(/{user}/g, '@NewMember')
                                      .replace(/{username}/g, 'NewMember')
                                      .replace(/{guild}/g, guilds[0]?.name || 'My Server')}
                                  </p>
                                )}
                                {config.welcomeLogoUrl && (
                                  <img 
                                    src={config.welcomeLogoUrl} 
                                    alt="Logo" 
                                    className="w-20 h-20 rounded mt-2"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div className="text-xs text-gray-400 mt-3 flex items-center">
                                  <span className="font-medium">FiveBot</span>
                                  <span className="mx-1">•</span>
                                  <span>Today at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!config.welcomeEnabled && (
                      <div className="text-center p-12 bg-gray-50 rounded-lg">
                        <HandRaisedIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome Messages Disabled</h3>
                        <p className="text-gray-600 mb-4">Enable welcome messages to greet new members automatically.</p>
                        <button
                          onClick={() => updateConfig({ welcomeEnabled: true })}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Enable Welcome Messages
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Moderation Tab */}
                {activeTab === 'moderation' && (
                  <div className="p-6">
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">Moderation</h2>
                          <p className="text-gray-600">Automatic moderation and security features</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.moderationEnabled}
                            onChange={(e) => updateConfig({ moderationEnabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          <span className="ml-3 text-sm font-medium text-gray-900">
                            {config.moderationEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>
                    </div>

                    {config.moderationEnabled && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Logging Channel
                          </label>
                          <SearchableDropdown
                            options={textChannels}
                            value={config.loggingChannelId || ''}
                            onChange={(value) => updateConfig({ loggingChannelId: value })}
                            placeholder="Select a logging channel"
                            emptyMessage="No text channels available"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            All moderation actions will be logged to this channel
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center mb-3">
                              <ShieldCheckIcon className="w-6 h-6 text-blue-600 mr-2" />
                              <h4 className="font-medium text-blue-900">Anti-Spam</h4>
                            </div>
                            <p className="text-sm text-blue-800 mb-3">
                              Automatically detects and removes spam messages
                            </p>
                            <div className="text-xs text-blue-700">
                              • Message rate limiting<br/>
                              • Duplicate message detection<br/>
                              • Automated warnings
                            </div>
                          </div>

                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center mb-3">
                              <ExclamationTriangleIcon className="w-6 h-6 text-green-600 mr-2" />
                              <h4 className="font-medium text-green-900">Link Protection</h4>
                            </div>
                            <p className="text-sm text-green-800 mb-3">
                              Scans links for malicious content and scams
                            </p>
                            <div className="text-xs text-green-700">
                              • Malware detection<br/>
                              • Phishing protection<br/>
                              • Suspicious domain filtering
                            </div>
                          </div>

                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-center mb-3">
                              <ChatBubbleLeftRightIcon className="w-6 h-6 text-purple-600 mr-2" />
                              <h4 className="font-medium text-purple-900">Content Filter</h4>
                            </div>
                            <p className="text-sm text-purple-800 mb-3">
                              Filters inappropriate content automatically
                            </p>
                            <div className="text-xs text-purple-700">
                              • Profanity filtering<br/>
                              • NSFW content detection<br/>
                              • Custom word blacklist
                            </div>
                          </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-yellow-900 mb-1">Important Notice</h4>
                              <p className="text-sm text-yellow-800">
                                Moderation features require your bot to have appropriate permissions in each server. 
                                Make sure the bot has "Manage Messages", "Kick Members", and "Ban Members" permissions where needed.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!config.moderationEnabled && (
                      <div className="text-center p-12 bg-gray-50 rounded-lg">
                        <ShieldCheckIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Moderation Disabled</h3>
                        <p className="text-gray-600 mb-4">Enable automatic moderation to keep your servers safe and clean.</p>
                        <button
                          onClick={() => updateConfig({ moderationEnabled: true })}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Enable Moderation
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Roles Tab */}
                {activeTab === 'roles' && (
                  <div className="p-6">
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">Auto-Role Assignment</h2>
                          <p className="text-gray-600">Automatically assign roles to new members</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.autoRoleEnabled}
                            onChange={(e) => updateConfig({ autoRoleEnabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          <span className="ml-3 text-sm font-medium text-gray-900">
                            {config.autoRoleEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>
                    </div>

                    {config.autoRoleEnabled && (
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Role to assign automatically
                            </label>
                            <button
                              onClick={() => {
                                setGuildsLoading(true);
                                loadGuildsData();
                              }}
                              disabled={guildsLoading}
                              className="text-xs text-indigo-600 hover:text-indigo-700 disabled:text-gray-400 flex items-center gap-1"
                            >
                              <ArrowPathIcon className={`w-4 h-4 ${guildsLoading ? 'animate-spin' : ''}`} />
                              Refresh roles
                            </button>
                          </div>
                          <SearchableDropdown
                            options={allRoles.map(role => ({ ...role, isRole: true }))}
                            value={config.autoRoleIds || []}
                            onChange={(value) => updateConfig({ autoRoleIds: value as string[] })}
                            placeholder="Select roles to assign automatically"
                            emptyMessage="No roles available"
                            multiple={true}
                          />
                          {allRoles.some(r => r.canAssign === false) && (
                            <p className="text-xs text-orange-600 mt-2">
                              🔒 Some roles are locked because the bot doesn't have permission to assign them. Move the bot's role higher in the server settings.
                            </p>
                          )}
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <CheckCircleIcon className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-green-900 mb-1">Auto-Role Active</h4>
                              <p className="text-sm text-green-800">
                                New members will automatically receive the selected roles when they join any server where your bot is present.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-2">Tips for Auto-Role Setup</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Make sure the bot has "Manage Roles" permission</li>
                            <li>• The bot's role must be higher than the roles you want to assign</li>
                            <li>• You can select multiple roles to assign to new members</li>
                            <li>• Consider using a basic "Member" or "Verified" role</li>
                            <li>• Test the feature with a new account first</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {!config.autoRoleEnabled && (
                      <div className="text-center p-12 bg-gray-50 rounded-lg">
                        <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Auto-Role Disabled</h3>
                        <p className="text-gray-600 mb-4">Enable auto-role to automatically assign roles to new members.</p>
                        <button
                          onClick={() => updateConfig({ autoRoleEnabled: true })}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Enable Auto-Role
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tickets Tab */}
                {activeTab === 'tickets' && (
                  <div className="p-6">
                    <TicketSystemConfig 
                      botId={botId}
                      guilds={guilds}
                      config={config}
                      updateConfig={updateConfig}
                      textChannels={textChannels}
                      allRoles={allRoles}
                    />
                  </div>
                )}

                {/* Commands Tab */}
                {activeTab === 'commands' && (
                  <div className="p-6">
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">Custom Commands</h2>
                          <p className="text-gray-600">Create custom slash commands for your bot</p>
                        </div>
                        <button 
                          onClick={() => setShowCommandBuilder(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                          Add Command
                        </button>
                      </div>
                    </div>

                    {/* Existing Commands List */}
                    <div className="space-y-4 mb-8">
                      {Object.entries(config.customCommands || {}).length > 0 ? (
                        Object.entries(config.customCommands || {}).map(([commandName, command]: [string, any]) => (
                          <div key={commandName} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-md">/{commandName}</span>
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    command.type === 'embed' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {command.type === 'embed' ? 'Rich Embed' : 'Simple Text'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  {command.description || 'No description provided'}
                                </p>
                                {command.type === 'simple' && command.response && (
                                  <div className="bg-gray-50 rounded p-2 text-sm text-gray-700 italic">
                                    "{command.response.length > 150 ? command.response.substring(0, 150) + '...' : command.response}"
                                  </div>
                                )}
                                {command.type === 'embed' && command.embed && (
                                  <div className="bg-gray-50 rounded p-3 text-sm">
                                    {command.embed.title && <div className="font-medium text-gray-900 mb-1">{command.embed.title}</div>}
                                    {command.embed.description && <div className="text-gray-600">{command.embed.description}</div>}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => deleteCommand(commandName)}
                                className="ml-4 text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded transition-colors"
                                title="Delete command"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center p-12 bg-gray-50 rounded-lg">
                          <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Custom Commands</h3>
                          <p className="text-gray-600 mb-4">Create your first custom command to add personalized responses to your bot.</p>
                          <button
                            onClick={() => setShowCommandBuilder(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                          >
                            <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                            Create First Command
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Command Builder Modal */}
                    {showCommandBuilder && (
                      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                          <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Create Custom Command</h3>
                            <button 
                              onClick={() => setShowCommandBuilder(false)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Configuration */}
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Command Name *
                                  </label>
                                  <div className="flex items-center">
                                    <span className="bg-gray-100 px-3 py-2 border border-r-0 rounded-l-md text-sm text-gray-600">/</span>
                                    <input
                                      type="text"
                                      value={newCommand.name}
                                      onChange={(e) => setNewCommand(prev => ({ ...prev, name: e.target.value }))}
                                      placeholder="hello"
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                  </label>
                                  <input
                                    type="text"
                                    value={newCommand.description}
                                    onChange={(e) => setNewCommand(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Say hello to someone"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Response Type
                                  </label>
                                  <div className="space-y-3">
                                    <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                      <input
                                        type="radio"
                                        value="simple"
                                        checked={newCommand.type === 'simple'}
                                        onChange={(e) => setNewCommand(prev => ({ ...prev, type: e.target.value }))}
                                        className="mr-3 text-indigo-600"
                                      />
                                      <div>
                                        <div className="font-medium text-gray-900">Simple Text</div>
                                        <div className="text-sm text-gray-500">Basic text response</div>
                                      </div>
                                    </label>
                                    <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                      <input
                                        type="radio"
                                        value="embed"
                                        checked={newCommand.type === 'embed'}
                                        onChange={(e) => setNewCommand(prev => ({ ...prev, type: e.target.value }))}
                                        className="mr-3 text-indigo-600"
                                      />
                                      <div>
                                        <div className="font-medium text-gray-900">Rich Embed</div>
                                        <div className="text-sm text-gray-500">Styled embed with colors and images</div>
                                      </div>
                                    </label>
                                  </div>
                                </div>

                                {/* Simple Response */}
                                {newCommand.type === 'simple' && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Response Text *
                                    </label>
                                    <textarea
                                      value={newCommand.response}
                                      onChange={(e) => setNewCommand(prev => ({ ...prev, response: e.target.value }))}
                                      placeholder="Hello! How are you doing today?"
                                      rows={4}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                  </div>
                                )}

                                {/* Embed Response */}
                                {newCommand.type === 'embed' && (
                                  <div className="space-y-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Embed Title
                                      </label>
                                      <input
                                        type="text"
                                        value={newCommand.embedTitle}
                                        onChange={(e) => setNewCommand(prev => ({ ...prev, embedTitle: e.target.value }))}
                                        placeholder="👋 Hello there!"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Embed Description
                                      </label>
                                      <textarea
                                        value={newCommand.embedDescription}
                                        onChange={(e) => setNewCommand(prev => ({ ...prev, embedDescription: e.target.value }))}
                                        placeholder="How are you doing today? Hope you're having a great time!"
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Embed Color
                                      </label>
                                      <input
                                        type="text"
                                        value={newCommand.embedColor}
                                        onChange={(e) => setNewCommand(prev => ({ ...prev, embedColor: e.target.value }))}
                                        placeholder="#5865F2"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Thumbnail URL (optional)
                                      </label>
                                      <input
                                        type="url"
                                        value={newCommand.embedThumbnail}
                                        onChange={(e) => setNewCommand(prev => ({ ...prev, embedThumbnail: e.target.value }))}
                                        placeholder="https://example.com/image.png"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Footer Text (optional)
                                      </label>
                                      <input
                                        type="text"
                                        value={newCommand.embedFooter}
                                        onChange={(e) => setNewCommand(prev => ({ ...prev, embedFooter: e.target.value }))}
                                        placeholder="FiveBot - Custom Command"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Preview */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Preview</h4>
                                <div className="bg-gray-800 rounded-lg p-4">
                                  {newCommand.type === 'simple' ? (
                                    <div className="bg-gray-700 rounded p-3">
                                      <p className="text-gray-300 text-sm">
                                        {newCommand.response || 'Your response text will appear here...'}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="bg-gray-700 rounded p-4 relative" style={{
                                      borderLeft: `4px solid ${newCommand.embedColor || '#5865F2'}`
                                    }}>
                                      {newCommand.embedThumbnail && (
                                        <img 
                                          src={newCommand.embedThumbnail} 
                                          alt="Thumbnail" 
                                          className="absolute top-4 right-4 w-16 h-16 rounded"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      )}
                                      {newCommand.embedTitle && (
                                        <h5 className="text-white font-semibold mb-2 pr-20">
                                          {newCommand.embedTitle}
                                        </h5>
                                      )}
                                      {newCommand.embedDescription && (
                                        <p className="text-gray-300 text-sm mb-3 pr-20">
                                          {newCommand.embedDescription}
                                        </p>
                                      )}
                                      <div className="text-xs text-gray-400 mt-3 flex items-center">
                                        <span className="font-medium">{newCommand.embedFooter || 'FiveBot'}</span>
                                        <span className="mx-1">•</span>
                                        <span>Today at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-4 text-xs text-gray-500">
                                  This is how your command response will look in Discord
                                </div>
                              </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                              <button 
                                onClick={() => setShowCommandBuilder(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={addCommand}
                                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                Create Command
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Tab */}
                {activeTab === 'status' && (
                  <div className="p-6">
                    <StatusRotationConfig 
                      config={config}
                      updateConfig={updateConfig}
                    />
                  </div>
                )}

                {/* V2 Commands Tab */}
                {activeTab === 'v2commands' && (
                  <div className="p-6">
                    <V2CommandsConfig 
                      config={config}
                      updateConfig={updateConfig}
                    />
                  </div>
                )}

                {/* Advanced Tab */}
                {activeTab === 'advanced' && (
                  <div className="p-6">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Advanced Settings</h2>
                      <p className="text-gray-600">Configuration management and advanced options</p>
                    </div>

                    <div className="space-y-8">
                      {/* Configuration Management */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Management</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <button 
                            onClick={exportConfig}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                          >
                            <div className="flex items-center mb-2">
                              <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="font-medium">Export Config</span>
                            </div>
                            <p className="text-sm text-gray-600">Download your current configuration as a JSON file</p>
                          </button>
                          
                          <label className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors cursor-pointer">
                            <div className="flex items-center mb-2">
                              <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                              </svg>
                              <span className="font-medium">Import Config</span>
                            </div>
                            <p className="text-sm text-gray-600">Upload and restore a configuration file</p>
                            <input
                              type="file"
                              accept=".json"
                              className="hidden"
                              onChange={importConfig}
                            />
                          </label>
                          
                          <button 
                            onClick={resetConfig}
                            className="p-4 border border-red-200 rounded-lg hover:bg-red-50 text-left transition-colors"
                          >
                            <div className="flex items-center mb-2">
                              <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span className="font-medium">Reset Config</span>
                            </div>
                            <p className="text-sm text-gray-600">Reset all settings to default values</p>
                          </button>
                        </div>
                      </div>

                      {/* Bot Management */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bot Management</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button
                            onClick={() => router.push(`/bots/${botId}/logs`)}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                          >
                            <div className="flex items-center mb-2">
                              <DocumentTextIcon className="w-6 h-6 text-purple-600 mr-2" />
                              <span className="font-medium">View Logs</span>
                            </div>
                            <p className="text-sm text-gray-600">Check bot activity and error logs</p>
                          </button>

                          <button
                            onClick={() => router.push(`/bots/${botId}`)}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                          >
                            <div className="flex items-center mb-2">
                              <EyeIcon className="w-6 h-6 text-indigo-600 mr-2" />
                              <span className="font-medium">Bot Details</span>
                            </div>
                            <p className="text-sm text-gray-600">View bot information and invite links</p>
                          </button>
                        </div>
                      </div>

                      {/* Bot Token Update */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bot Token</h3>
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">Update Bot Token</h4>
                              <p className="text-sm text-gray-600 mb-4">
                                Update your Discord bot token. The token will be validated before saving.
                              </p>
                              <div className="space-y-2">
                                <input
                                  type="password"
                                  placeholder="Enter new bot token..."
                                  value={newToken}
                                  onChange={(e) => setNewToken(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500">
                                  ⚠️ The bot will automatically restart after the token is updated
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={handleUpdateToken}
                              disabled={saving || !newToken.trim()}
                              className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {saving ? 'Updating...' : 'Update Token'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Danger Zone */}
                      <div>
                        <h3 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h3>
                        <div className="border border-red-200 rounded-lg overflow-hidden">
                          <div className="p-4 bg-red-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-red-900 mb-1">Suspend Bot</h4>
                                <p className="text-sm text-red-700">
                                  Temporarily disable this bot. You can reactivate it later.
                                </p>
                              </div>
                              <button
                                onClick={handleSuspendBot}
                                disabled={saving}
                                className="ml-4 px-4 py-2 border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Suspend Bot
                              </button>
                            </div>
                          </div>

                          <div className="p-4 bg-red-50 border-t border-red-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-red-900 mb-1">Delete Bot</h4>
                                <p className="text-sm text-red-700">
                                  Permanently delete this bot and all its data. This action cannot be undone.
                                </p>
                              </div>
                              <button
                                onClick={handleDeleteBot}
                                disabled={saving}
                                className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Delete Bot
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Information */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <h4 className="font-medium text-blue-900 mb-1">Configuration Tips</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                              <li>• Always backup your configuration before making major changes</li>
                              <li>• Test new features in a development server first</li>
                              <li>• Make sure your bot has the necessary permissions in each server</li>
                              <li>• Monitor logs regularly to catch and resolve issues early</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}