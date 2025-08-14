'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import SearchableDropdown from '@/components/SearchableDropdown';

interface Bot {
  id: string;
  name: string;
  status: string;
  clientId?: string;
  config?: BotConfig;
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
  loggingChannelId?: string;
  customCommands?: any;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  channels: DiscordChannel[];
  roles: DiscordRole[];
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
  const [guildsLoading, setGuildsLoading] = useState(false);
  
  // Bot configuration state
  const [config, setConfig] = useState<BotConfig>({
    welcomeEnabled: false,
    moderationEnabled: false,
    autoRoleEnabled: false,
    customCommands: {},
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
  }, [user, botId]);

  const fetchBot = async () => {
    try {
      const response = await botsAPI.getById(botId);
      setBot(response.data);
      if (response.data.config) {
        setConfig(response.data.config);
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
      await botsAPI.updateConfig(botId, config);
      toast.success('Configuration saved successfully');
      await fetchBot(); // Refresh data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<BotConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
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
      version: '1.0'
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
    // Reset the input
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="discord-spinner w-8 h-8 border-4 border-discord-200 border-t-discord-500 rounded-full"></div>
      </div>
    );
  }

  if (!user || !bot) {
    return null;
  }

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'welcome', name: 'Welcome', icon: '👋' },
    { id: 'moderation', name: 'Moderation', icon: '🛡️' },
    { id: 'roles', name: 'Roles', icon: '🎭' },
    { id: 'channels', name: 'Channels', icon: '📺' },
    { id: 'advanced', name: 'Advanced', icon: '🔧' },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/bots/${botId}`)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuration - {bot.name}</h1>
                <p className="text-gray-600">Customize your Discord bot</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {bot && (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    bot.status === 'ONLINE' ? 'bg-green-500' : 
                    bot.status === 'STARTING' || bot.status === 'STOPPING' ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-gray-600">
                    {bot.status === 'ONLINE' ? 'Online' : 
                     bot.status === 'STARTING' ? 'Starting...' :
                     bot.status === 'STOPPING' ? 'Stopping...' :
                     'Offline'}
                  </span>
                  {bot.status === 'ONLINE' && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Will restart automatically
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={saveConfig}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <>
                    <div className="discord-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar avec onglets */}
            <div className="lg:w-64">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-discord-100 text-discord-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Contenu principal */}
            <div className="flex-1">
              <div className="card p-6">
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">General Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Discord Servers
                          </label>
                          {guildsLoading ? (
                            <div className="flex items-center justify-center p-8">
                              <div className="discord-spinner w-6 h-6 border-4 border-discord-200 border-t-discord-500 rounded-full mr-3"></div>
                              <span className="text-gray-600">Loading Discord servers...</span>
                            </div>
                          ) : guilds.length > 0 ? (
                            <div className="space-y-2">
                              {guilds.map((guild) => (
                                <div key={guild.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    {guild.icon && (
                                      <img 
                                        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                                        alt={guild.name}
                                        className="w-8 h-8 rounded-full"
                                      />
                                    )}
                                    <div>
                                      <p className="font-medium">{guild.name}</p>
                                      <p className="text-sm text-gray-500">
                                        {guild.channels.length} channels • {guild.roles.length} roles
                                      </p>
                                    </div>
                                  </div>
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    Connected
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center p-8 bg-gray-50 rounded-lg">
                              <p className="text-gray-600">No Discord servers found</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Make sure your bot has been invited to servers
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'welcome' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Welcome Messages</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.welcomeEnabled}
                            onChange={(e) => updateConfig({ welcomeEnabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-discord-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-600"></div>
                        </label>
                      </div>

                      {config.welcomeEnabled && (
                        <div className="space-y-4">
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

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Message Title
                            </label>
                            <input
                              type="text"
                              value={config.welcomeEmbedJson?.title || ''}
                              onChange={(e) => updateWelcomeEmbed({ title: e.target.value })}
                              placeholder="👋 Welcome!"
                              className="input-field"
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
                              className="input-field"
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
                              className="input-field"
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
                              className="input-field"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              This will be used as the main image in the footer area
                            </p>
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
                              className="input-field"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Small image displayed in the top-right corner of the embed
                            </p>
                          </div>

                          {/* Live Preview */}
                          <div className="mt-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Message Preview</h4>
                            <div className="bg-gray-800 rounded-lg p-4">
                              <div className="bg-gray-700 rounded-md p-3" style={{
                                borderLeft: `4px solid ${config.welcomeEmbedJson?.color || '#5865F2'}`
                              }}>
                                {config.welcomeEmbedJson?.title && (
                                  <h5 className="text-white font-medium mb-2">
                                    {config.welcomeEmbedJson.title}
                                  </h5>
                                )}
                                {config.welcomeEmbedJson?.description && (
                                  <p className="text-gray-300 text-sm mb-2">
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
                                    className="w-16 h-16 rounded mt-2"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div className="text-xs text-gray-400 mt-2">
                                  FiveBot • today at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'moderation' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Automatic Moderation</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.moderationEnabled}
                            onChange={(e) => updateConfig({ moderationEnabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-discord-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-600"></div>
                        </label>
                      </div>

                      {config.moderationEnabled && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Logs Channel
                            </label>
                            <SearchableDropdown
                              options={textChannels}
                              value={config.loggingChannelId || ''}
                              onChange={(value) => updateConfig({ loggingChannelId: value })}
                              placeholder="Select a logging channel"
                              emptyMessage="No text channels available"
                            />
                          </div>

                          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">Moderation Features</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                              <li>• Automatic anti-spam</li>
                              <li>• Suspicious link detection</li>
                              <li>• Inappropriate content filtering</li>
                              <li>• Moderation action logs</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'roles' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Automatic Role Assignment</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.autoRoleEnabled}
                            onChange={(e) => updateConfig({ autoRoleEnabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-discord-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-600"></div>
                        </label>
                      </div>

                      {config.autoRoleEnabled && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Role to assign automatically
                            </label>
                            <SearchableDropdown
                              options={allRoles.map(role => ({ ...role, isRole: true }))}
                              value={config.autoRoleId || ''}
                              onChange={(value) => updateConfig({ autoRoleId: value })}
                              placeholder="Select a role to assign automatically"
                              emptyMessage="No roles available"
                            />
                          </div>

                          <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <p className="text-sm text-green-800">
                              This role will be automatically assigned to all new members who join the server.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'channels' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Discord Channels</h3>
                    
                    {guildsLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <div className="discord-spinner w-6 h-6 border-4 border-discord-200 border-t-discord-500 rounded-full mr-3"></div>
                        <span className="text-gray-600">Loading channels...</span>
                      </div>
                    ) : guilds.length > 0 ? (
                      guilds.map((guild) => (
                        <div key={guild.id} className="border rounded-lg p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            {guild.icon && (
                              <img 
                                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                                alt={guild.name}
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <h4 className="font-medium text-gray-900">{guild.name}</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Text Channels</h5>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {guild.channels.filter(c => c.type === 0).length > 0 ? (
                                  guild.channels.filter(c => c.type === 0).map((channel) => (
                                    <div key={channel.id} className="text-sm text-gray-600">
                                      # {channel.name}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-gray-400">No text channels</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Voice Channels</h5>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {guild.channels.filter(c => c.type === 2).length > 0 ? (
                                  guild.channels.filter(c => c.type === 2).map((channel) => (
                                    <div key={channel.id} className="text-sm text-gray-600">
                                      🔊 {channel.name}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-gray-400">No voice channels</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">No Discord servers found</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Invite your bot to servers to see channels
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'advanced' && (
                  <div className="space-y-6">
                    {/* Custom Commands Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Custom Commands</h3>
                        <button 
                          onClick={() => setShowCommandBuilder(true)}
                          className="btn-primary text-sm"
                        >
                          ➕ Add Command
                        </button>
                      </div>

                      {/* Existing Commands List */}
                      <div className="space-y-3 mb-6">
                        {Object.entries(config.customCommands || {}).map(([commandName, command]: [string, any]) => (
                          <div key={commandName} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">/{commandName}</span>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    command.type === 'embed' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {command.type === 'embed' ? 'Embed' : 'Simple'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {command.description || 'No description'}
                                </p>
                                {command.type === 'simple' && command.response && (
                                  <p className="text-sm text-gray-500 mt-1 italic">
                                    "{command.response.length > 100 ? command.response.substring(0, 100) + '...' : command.response}"
                                  </p>
                                )}
                                {command.type === 'embed' && command.embed && (
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                    {command.embed.title && <div className="font-medium">{command.embed.title}</div>}
                                    {command.embed.description && <div className="text-gray-600">{command.embed.description}</div>}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => deleteCommand(commandName)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        ))}
                        
                        {Object.keys(config.customCommands || {}).length === 0 && (
                          <div className="text-center p-8 bg-gray-50 rounded-lg">
                            <p className="text-gray-600">No custom commands yet</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Click "Add Command" to create your first custom command
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Command Builder Modal */}
                      {showCommandBuilder && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold">Create Custom Command</h4>
                              <button 
                                onClick={() => setShowCommandBuilder(false)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="space-y-4">
                              {/* Command Name */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Command Name
                                </label>
                                <div className="flex items-center">
                                  <span className="bg-gray-100 px-3 py-2 border border-r-0 rounded-l text-sm">/</span>
                                  <input
                                    type="text"
                                    value={newCommand.name}
                                    onChange={(e) => setNewCommand(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="salut"
                                    className="input-field rounded-l-none"
                                  />
                                </div>
                              </div>

                              {/* Description */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Description (optional)
                                </label>
                                <input
                                  type="text"
                                  value={newCommand.description}
                                  onChange={(e) => setNewCommand(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Say hello to someone"
                                  className="input-field"
                                />
                              </div>

                              {/* Response Type */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Response Type
                                </label>
                                <div className="flex space-x-4">
                                  <label className="flex items-center">
                                    <input
                                      type="radio"
                                      value="simple"
                                      checked={newCommand.type === 'simple'}
                                      onChange={(e) => setNewCommand(prev => ({ ...prev, type: e.target.value }))}
                                      className="mr-2"
                                    />
                                    Simple Text
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="radio"
                                      value="embed"
                                      checked={newCommand.type === 'embed'}
                                      onChange={(e) => setNewCommand(prev => ({ ...prev, type: e.target.value }))}
                                      className="mr-2"
                                    />
                                    Embed Message
                                  </label>
                                </div>
                              </div>

                              {/* Simple Response */}
                              {newCommand.type === 'simple' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Response Text
                                  </label>
                                  <textarea
                                    value={newCommand.response}
                                    onChange={(e) => setNewCommand(prev => ({ ...prev, response: e.target.value }))}
                                    placeholder="Salut ! Comment ça va ?"
                                    rows={3}
                                    className="input-field"
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
                                      placeholder="👋 Salut !"
                                      className="input-field"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Embed Description
                                    </label>
                                    <textarea
                                      value={newCommand.embedDescription}
                                      onChange={(e) => setNewCommand(prev => ({ ...prev, embedDescription: e.target.value }))}
                                      placeholder="Comment ça va ? J'espère que tu passes une bonne journée !"
                                      rows={3}
                                      className="input-field"
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
                                      className="input-field"
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
                                      className="input-field"
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
                                      className="input-field"
                                    />
                                  </div>

                                  {/* Preview */}
                                  <div>
                                    <h5 className="text-sm font-medium text-gray-700 mb-2">Preview</h5>
                                    <div className="bg-gray-800 rounded-lg p-4">
                                      <div className="bg-gray-700 rounded-md p-3" style={{
                                        borderLeft: `4px solid ${newCommand.embedColor || '#5865F2'}`
                                      }}>
                                        {newCommand.embedTitle && (
                                          <h6 className="text-white font-medium mb-2">
                                            {newCommand.embedTitle}
                                          </h6>
                                        )}
                                        {newCommand.embedDescription && (
                                          <p className="text-gray-300 text-sm mb-2">
                                            {newCommand.embedDescription}
                                          </p>
                                        )}
                                        {newCommand.embedThumbnail && (
                                          <img 
                                            src={newCommand.embedThumbnail} 
                                            alt="Thumbnail" 
                                            className="w-16 h-16 rounded mt-2"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        )}
                                        <div className="text-xs text-gray-400 mt-2">
                                          {newCommand.embedFooter || 'FiveBot'} • today at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Buttons */}
                              <div className="flex space-x-3 pt-4">
                                <button 
                                  onClick={addCommand}
                                  className="btn-primary"
                                >
                                  Create Command
                                </button>
                                <button 
                                  onClick={() => setShowCommandBuilder(false)}
                                  className="btn-secondary"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Configuration Management */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Management</h3>
                      <div className="flex flex-wrap gap-3">
                        <button 
                          onClick={exportConfig}
                          className="btn-secondary"
                        >
                          📤 Export Configuration
                        </button>
                        <label className="btn-secondary cursor-pointer">
                          📥 Import Configuration
                          <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={importConfig}
                          />
                        </label>
                        <button 
                          onClick={resetConfig}
                          className="btn-danger"
                        >
                          🔄 Reset Configuration
                        </button>
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