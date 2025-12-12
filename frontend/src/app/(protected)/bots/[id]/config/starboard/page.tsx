'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { designTokens } from '@/styles/design-tokens';
import axios from 'axios';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import CustomSelect from '@/components/CustomSelect';
import CustomMultiSelect from '@/components/CustomMultiSelect';

interface StarboardConfig {
  id?: string;
  guildId: string;
  botId: string;
  enabled: boolean;

  // Main Settings
  channelId: string;
  emoji: string;
  threshold: number;

  // Embed Settings
  embedColor?: string;
  showJumpButton: boolean;

  // Restrictions
  ignoredChannels: string[];
  selfStarAllowed: boolean;
  botStarAllowed: boolean;
  nsfwAllowed: boolean;

  // Message Age Settings
  minMessageAge: number; // in seconds
  maxMessageAge?: number; // in seconds (for decay)
}

interface StarboardEntry {
  id: string;
  messageId: string;
  channelId: string;
  authorId: string;
  content?: string;
  attachments?: string;
  starboardMessageId?: string;
  starCount: number;
  starUsers?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function StarboardConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [guildChannels, setGuildChannels] = useState<any[]>([]);
  const [recentEntries, setRecentEntries] = useState<StarboardEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const [config, setConfig] = useState<StarboardConfig>({
    guildId: '',
    botId: botId,
    enabled: true,
    channelId: '',
    emoji: '⭐',
    threshold: 3,
    embedColor: '#FFD700',
    showJumpButton: true,
    ignoredChannels: [],
    selfStarAllowed: false,
    botStarAllowed: false,
    nsfwAllowed: false,
    minMessageAge: 0,
    maxMessageAge: undefined,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchBotData();
      fetchGuilds();
    }
  }, [user, botId]);

  useEffect(() => {
    if (selectedGuild) {
      fetchGuildData(selectedGuild);
      fetchConfig(selectedGuild);
      fetchRecentEntries(selectedGuild);
    }
  }, [selectedGuild]);

  const fetchBotData = async () => {
    try {
      const token = Cookies.get('token');
      const botRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBot(botRes.data);
    } catch (error) {
      console.error('Error fetching bot:', error);
      toast.error('Failed to load bot data');
    }
  };

  const fetchGuilds = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGuilds(response.data);
      if (response.data.length > 0) {
        setSelectedGuild(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching guilds:', error);
      toast.error('Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const fetchGuildData = async (guildId: string) => {
    try {
      const token = Cookies.get('token');
      const channelsRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds/${guildId}/channels`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGuildChannels(channelsRes.data);
    } catch (error) {
      console.error('Error fetching guild data:', error);
      toast.error('Failed to load server data');
    }
  };

  const fetchConfig = async (guildId: string) => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/starboard/config?guildId=${guildId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        // Parse JSON strings for arrays
        const parsedConfig = { ...response.data };
        if (typeof parsedConfig.ignoredChannels === 'string') {
          parsedConfig.ignoredChannels = JSON.parse(parsedConfig.ignoredChannels || '[]');
        }
        setConfig(parsedConfig);
      } else {
        setConfig((prev) => ({ ...prev, guildId }));
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching config:', error);
      }
      setConfig((prev) => ({ ...prev, guildId }));
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentEntries = async (guildId: string) => {
    try {
      setEntriesLoading(true);
      const token = Cookies.get('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/starboard/entries?guildId=${guildId}&page=1&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.entries) {
        setRecentEntries(response.data.entries);
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching entries:', error);
      }
      setRecentEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedGuild) {
      toast.error('Please select a server');
      return;
    }

    if (!config.channelId) {
      toast.error('Please select a starboard channel');
      return;
    }

    try {
      setSaving(true);
      const token = Cookies.get('token');

      // Prepare data with JSON stringified arrays
      const saveData = {
        ...config,
        guildId: selectedGuild,
        ignoredChannels: JSON.stringify(config.ignoredChannels),
      };

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/starboard/config?guildId=${selectedGuild}`,
        saveData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Starboard configuration saved successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save configuration';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<StarboardConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const textChannels = guildChannels.filter((ch) => ch.type === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push(`/bots/${botId}/config`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center space-x-3">
            <div className="text-4xl">⭐</div>
            <div>
              <h1 className={designTokens.typography.h2}>Starboard Configuration</h1>
              <p className={designTokens.typography.body + ' text-gray-500'}>
                Highlight the best messages in your server
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guild Selector */}
      {guilds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-blue-900 mb-2">Select Server</label>
          <CustomSelect
            options={guilds.map((guild) => ({
              value: guild.id,
              label: guild.name,
              icon: '🌐',
            }))}
            value={selectedGuild}
            onChange={setSelectedGuild}
            placeholder="Select a server"
            searchable={guilds.length > 5}
          />
          <p className="mt-2 text-xs text-blue-700">
            Select the Discord server to configure the starboard
          </p>
        </div>
      )}

      {/* Main Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <ConfigSection
          title="Basic Settings"
          description="Configure the core starboard functionality"
          icon="⚙️"
        >
          <div className="space-y-4">
            <ToggleSwitch
              label="Enable Starboard"
              checked={config.enabled}
              onChange={(checked) => updateConfig({ enabled: checked })}
              description="Master switch for the starboard system"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Starboard Channel *
              </label>
              <CustomSelect
                options={textChannels.map((channel) => ({
                  value: channel.id,
                  label: channel.name,
                  icon: '#',
                }))}
                value={config.channelId}
                onChange={(value) => updateConfig({ channelId: value })}
                placeholder="Select starboard channel"
                searchable={textChannels.length > 10}
              />
              <p className="mt-1 text-xs text-gray-500">
                Channel where starred messages will be posted
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Star Emoji
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={config.emoji}
                  onChange={(e) => updateConfig({ emoji: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="⭐"
                  maxLength={10}
                />
                <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-lg text-2xl">
                  {config.emoji || '⭐'}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Emoji users react with to star messages
              </p>
            </div>

            <NumberInput
              label="Minimum Stars Required"
              value={config.threshold}
              onChange={(value) => updateConfig({ threshold: value })}
              min={1}
              max={50}
              description="Number of stars needed to appear on the starboard"
            />
          </div>
        </ConfigSection>

        {/* Embed Customization */}
        <ConfigSection
          title="Embed Customization"
          description="Customize how starboard messages appear"
          icon="🎨"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Embed Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={config.embedColor || '#FFD700'}
                  onChange={(e) => updateConfig({ embedColor: e.target.value })}
                  className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.embedColor || '#FFD700'}
                  onChange={(e) => updateConfig({ embedColor: e.target.value })}
                  placeholder="#FFD700"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Color of the starboard embed (default: gold)
              </p>
            </div>

            <ToggleSwitch
              label="Show Jump Button"
              checked={config.showJumpButton}
              onChange={(checked) => updateConfig({ showJumpButton: checked })}
              description="Display a button to jump to the original message"
            />
          </div>
        </ConfigSection>

        {/* Restrictions */}
        <ConfigSection
          title="Restrictions"
          description="Control which messages can be starred"
          icon="🚫"
        >
          <div className="space-y-4">
            <ToggleSwitch
              label="Allow Self-Starring"
              checked={config.selfStarAllowed}
              onChange={(checked) => updateConfig({ selfStarAllowed: checked })}
              description="Allow users to star their own messages"
            />

            <ToggleSwitch
              label="Allow Bot Stars"
              checked={config.botStarAllowed}
              onChange={(checked) => updateConfig({ botStarAllowed: checked })}
              description="Allow bot messages to be starred"
            />

            <ToggleSwitch
              label="Allow NSFW Content"
              checked={config.nsfwAllowed}
              onChange={(checked) => updateConfig({ nsfwAllowed: checked })}
              description="Allow messages from NSFW channels to be starred"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ignored Channels
              </label>
              <CustomMultiSelect
                options={textChannels.map((channel) => ({
                  value: channel.id,
                  label: channel.name,
                  icon: '#',
                }))}
                values={config.ignoredChannels}
                onChange={(values) => updateConfig({ ignoredChannels: values })}
                placeholder="Select channels to ignore"
              />
              <p className="mt-1 text-xs text-gray-500">
                Messages from these channels cannot be starred
              </p>
            </div>
          </div>
        </ConfigSection>

        {/* Message Age Settings */}
        <ConfigSection
          title="Message Age Settings"
          description="Configure time-based restrictions"
          icon="⏰"
        >
          <div className="space-y-4">
            <NumberInput
              label="Minimum Message Age (seconds)"
              value={config.minMessageAge}
              onChange={(value) => updateConfig({ minMessageAge: value })}
              min={0}
              max={86400}
              description="How old a message must be before it can be starred (0 = no minimum)"
            />

            <NumberInput
              label="Maximum Message Age (days)"
              value={config.maxMessageAge ? Math.floor(config.maxMessageAge / 86400) : 0}
              onChange={(value) => updateConfig({ maxMessageAge: value > 0 ? value * 86400 : undefined })}
              min={0}
              max={365}
              nullable
              description="Messages older than this won't appear (0 = no limit)"
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 text-lg">ℹ️</span>
                <div className="text-xs text-blue-900">
                  <p className="font-medium mb-1">Star Decay</p>
                  <p>
                    Messages older than the maximum age will automatically be removed from the starboard.
                    This helps keep your starboard fresh and relevant.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ConfigSection>
      </div>

      {/* Recent Starboard Entries */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🌟</span>
              <div>
                <h2 className={designTokens.typography.h3 + ' text-gray-900'}>Recent Starboard Entries</h2>
                <p className={designTokens.typography.small + ' text-gray-600 mt-0.5'}>
                  Top 10 most recent starred messages
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchRecentEntries(selectedGuild)}
              disabled={entriesLoading}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {entriesLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {entriesLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">⭐</div>
              <p className="text-sm font-medium">No starred messages yet</p>
              <p className="text-xs mt-1">
                Messages that receive {config.threshold} or more {config.emoji} reactions will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg font-bold text-yellow-500">
                          {config.emoji} {entry.starCount}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(entry.createdAt)}
                        </span>
                      </div>

                      {entry.content && (
                        <p className="text-sm text-gray-700 line-clamp-3 mb-2">
                          {entry.content}
                        </p>
                      )}

                      {entry.attachments && JSON.parse(entry.attachments).length > 0 && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <span>📎</span>
                          <span>{JSON.parse(entry.attachments).length} attachment(s)</span>
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col items-end space-y-1">
                      <span className="text-xs text-gray-500">
                        ID: {entry.messageId.slice(0, 8)}...
                      </span>
                      {entry.starboardMessageId && (
                        <span className="text-xs text-green-600 flex items-center space-x-1">
                          <span>✓</span>
                          <span>Posted</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-3 sticky bottom-0 bg-white py-4 border-t border-gray-200">
        <button
          onClick={() => router.push(`/bots/${botId}/config`)}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !selectedGuild || !config.channelId}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
        >
          {saving ? 'Saving Configuration...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

// Helper Components

interface ConfigSectionProps {
  title: string;
  description: string;
  icon: string;
  children: React.ReactNode;
}

function ConfigSection({ title, description, icon, children }: ConfigSectionProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h2 className={designTokens.typography.h3 + ' text-gray-900'}>{title}</h2>
            <p className={designTokens.typography.small + ' text-gray-600 mt-0.5'}>
              {description}
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

function ToggleSwitch({
  label,
  checked,
  onChange,
  description,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  nullable?: boolean;
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  description,
  nullable = false,
}: NumberInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const val = parseInt(e.target.value);
          if (!isNaN(val)) {
            onChange(Math.min(Math.max(val, min), max));
          } else if (nullable) {
            onChange(0);
          }
        }}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
      {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
      {(min !== undefined || max !== undefined) && (
        <p className="mt-1 text-xs text-gray-400">
          Range: {min} - {max}
        </p>
      )}
    </div>
  );
}
