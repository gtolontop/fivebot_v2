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

interface ModerationConfig {
  id?: string;
  guildId: string;
  botId: string;
  enabled: boolean;

  // Auto-Moderation
  autoModEnabled: boolean;
  antiSpamEnabled: boolean;
  antiSpamThreshold: number;
  antiSpamInterval: number;
  antiRaidEnabled: boolean;
  antiRaidThreshold: number;
  antiRaidInterval: number;
  antiLinkEnabled: boolean;
  allowedDomains: string[];
  antiInviteEnabled: boolean;
  antiMassmentionEnabled: boolean;
  massMentionThreshold: number;
  antiCapsEnabled: boolean;
  capsThreshold: number;
  wordFilterEnabled: boolean;
  filteredWords: string[];
  filteredRegex: string;

  // Punishment Escalation
  autoMuteOnWarns: number | null;
  autoKickOnWarns: number | null;
  autoBanOnWarns: number | null;

  // Roles & Channels
  modRoleIds: string[];
  adminRoleIds: string[];
  mutedRoleId: string | null;
  modLogChannelId: string | null;
  publicLogChannelId: string | null;
  appealChannelId: string | null;

  // Immune Roles/Channels
  immuneRoleIds: string[];
  immuneChannelIds: string[];

  // DM Settings
  dmOnWarn: boolean;
  dmOnMute: boolean;
  dmOnKick: boolean;
  dmOnBan: boolean;
}

export default function ModerationConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [guildRoles, setGuildRoles] = useState<any[]>([]);
  const [guildChannels, setGuildChannels] = useState<any[]>([]);

  const [config, setConfig] = useState<ModerationConfig>({
    guildId: '',
    botId: botId,
    enabled: true,
    autoModEnabled: false,
    antiSpamEnabled: false,
    antiSpamThreshold: 5,
    antiSpamInterval: 5000,
    antiRaidEnabled: false,
    antiRaidThreshold: 10,
    antiRaidInterval: 10000,
    antiLinkEnabled: false,
    allowedDomains: [],
    antiInviteEnabled: false,
    antiMassmentionEnabled: false,
    massMentionThreshold: 5,
    antiCapsEnabled: false,
    capsThreshold: 70,
    wordFilterEnabled: false,
    filteredWords: [],
    filteredRegex: '',
    autoMuteOnWarns: null,
    autoKickOnWarns: null,
    autoBanOnWarns: null,
    modRoleIds: [],
    adminRoleIds: [],
    mutedRoleId: null,
    modLogChannelId: null,
    publicLogChannelId: null,
    appealChannelId: null,
    immuneRoleIds: [],
    immuneChannelIds: [],
    dmOnWarn: true,
    dmOnMute: true,
    dmOnKick: true,
    dmOnBan: true,
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

      const [rolesRes, channelsRes] = await Promise.all([
        axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds/${guildId}/roles`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds/${guildId}/channels`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);

      setGuildRoles(rolesRes.data);
      setGuildChannels(channelsRes.data);
    } catch (error) {
      console.error('Error fetching guild data:', error);
      toast.error('Failed to load server data');
    }
  };

  const fetchConfig = async (guildId: string) => {
    try {
      const token = Cookies.get('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/moderation/${botId}/config?guildId=${guildId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        setConfig({
          ...response.data,
          guildId: guildId,
          allowedDomains: response.data.allowedDomains || [],
          filteredWords: response.data.filteredWords || [],
          modRoleIds: response.data.modRoleIds || [],
          adminRoleIds: response.data.adminRoleIds || [],
          immuneRoleIds: response.data.immuneRoleIds || [],
          immuneChannelIds: response.data.immuneChannelIds || [],
        });
      } else {
        setConfig((prev) => ({ ...prev, guildId }));
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching config:', error);
        toast.error('Failed to load configuration');
      }
      setConfig((prev) => ({ ...prev, guildId }));
    }
  };

  const handleSave = async () => {
    if (!selectedGuild) {
      toast.error('Please select a server');
      return;
    }

    try {
      setSaving(true);
      const token = Cookies.get('token');

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/moderation/${botId}/config`,
        { ...config, guildId: selectedGuild },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Moderation configuration saved successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save configuration';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<ModerationConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const textChannels = guildChannels.filter((ch) => ch.type === 0);
  const roles = guildRoles.filter((role) => role.name !== '@everyone');

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
            <div className="text-4xl">🛡️</div>
            <div>
              <h1 className={designTokens.typography.h2}>Moderation Configuration</h1>
              <p className={designTokens.typography.body + ' text-gray-500'}>
                Configure auto-moderation, punishments, and moderation settings
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
            Select the Discord server to configure moderation settings
          </p>
        </div>
      )}

      {/* Main Configuration */}
      <div className="space-y-6">
        {/* Master Toggle */}
        <ConfigSection
          title="Moderation System"
          description="Enable or disable the entire moderation system"
          icon="🎚️"
        >
          <ToggleSwitch
            label="Enable Moderation"
            checked={config.enabled}
            onChange={(checked) => updateConfig({ enabled: checked })}
            description="Master switch for all moderation features"
          />
        </ConfigSection>

        {/* Auto-Moderation Section */}
        <ConfigSection
          title="Auto-Moderation"
          description="Automatically detect and handle rule violations"
          icon="🤖"
        >
          <div className="space-y-4">
            <ToggleSwitch
              label="Enable Auto-Moderation"
              checked={config.autoModEnabled}
              onChange={(checked) => updateConfig({ autoModEnabled: checked })}
              description="Enable automatic message filtering and moderation"
            />

            {config.autoModEnabled && (
              <div className="ml-6 space-y-6 pt-4 border-l-2 border-primary-200 pl-6">
                {/* Anti-Spam */}
                <div className="space-y-3">
                  <ToggleSwitch
                    label="Anti-Spam"
                    checked={config.antiSpamEnabled}
                    onChange={(checked) => updateConfig({ antiSpamEnabled: checked })}
                    description="Detect and prevent spam messages"
                  />
                  {config.antiSpamEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <NumberInput
                        label="Messages Threshold"
                        value={config.antiSpamThreshold}
                        onChange={(value) => updateConfig({ antiSpamThreshold: value })}
                        min={2}
                        max={20}
                        description="Number of messages to trigger spam detection"
                      />
                      <NumberInput
                        label="Time Interval (ms)"
                        value={config.antiSpamInterval}
                        onChange={(value) => updateConfig({ antiSpamInterval: value })}
                        min={1000}
                        max={60000}
                        step={1000}
                        description="Time window for spam detection"
                      />
                    </div>
                  )}
                </div>

                {/* Anti-Raid */}
                <div className="space-y-3">
                  <ToggleSwitch
                    label="Anti-Raid"
                    checked={config.antiRaidEnabled}
                    onChange={(checked) => updateConfig({ antiRaidEnabled: checked })}
                    description="Detect and prevent server raids"
                  />
                  {config.antiRaidEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <NumberInput
                        label="Join Threshold"
                        value={config.antiRaidThreshold}
                        onChange={(value) => updateConfig({ antiRaidThreshold: value })}
                        min={3}
                        max={50}
                        description="Number of joins to trigger raid detection"
                      />
                      <NumberInput
                        label="Time Interval (ms)"
                        value={config.antiRaidInterval}
                        onChange={(value) => updateConfig({ antiRaidInterval: value })}
                        min={5000}
                        max={120000}
                        step={1000}
                        description="Time window for raid detection"
                      />
                    </div>
                  )}
                </div>

                {/* Anti-Link */}
                <div className="space-y-3">
                  <ToggleSwitch
                    label="Anti-Link"
                    checked={config.antiLinkEnabled}
                    onChange={(checked) => updateConfig({ antiLinkEnabled: checked })}
                    description="Filter unauthorized links"
                  />
                  {config.antiLinkEnabled && (
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allowed Domains (one per line)
                      </label>
                      <textarea
                        value={config.allowedDomains.join('\n')}
                        onChange={(e) =>
                          updateConfig({
                            allowedDomains: e.target.value.split('\n').filter((d) => d.trim()),
                          })
                        }
                        placeholder="example.com&#10;trusted-site.org"
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Leave empty to block all links. Add domains to whitelist.
                      </p>
                    </div>
                  )}
                </div>

                {/* Anti-Invite */}
                <ToggleSwitch
                  label="Anti-Invite"
                  checked={config.antiInviteEnabled}
                  onChange={(checked) => updateConfig({ antiInviteEnabled: checked })}
                  description="Block Discord invite links"
                />

                {/* Anti-Mass Mention */}
                <div className="space-y-3">
                  <ToggleSwitch
                    label="Anti-Mass Mention"
                    checked={config.antiMassmentionEnabled}
                    onChange={(checked) => updateConfig({ antiMassmentionEnabled: checked })}
                    description="Prevent excessive user mentions"
                  />
                  {config.antiMassmentionEnabled && (
                    <div className="ml-6">
                      <NumberInput
                        label="Mention Threshold"
                        value={config.massMentionThreshold}
                        onChange={(value) => updateConfig({ massMentionThreshold: value })}
                        min={2}
                        max={20}
                        description="Maximum mentions allowed per message"
                      />
                    </div>
                  )}
                </div>

                {/* Anti-Caps */}
                <div className="space-y-3">
                  <ToggleSwitch
                    label="Anti-Caps"
                    checked={config.antiCapsEnabled}
                    onChange={(checked) => updateConfig({ antiCapsEnabled: checked })}
                    description="Limit excessive capital letters"
                  />
                  {config.antiCapsEnabled && (
                    <div className="ml-6">
                      <NumberInput
                        label="Caps Threshold (%)"
                        value={config.capsThreshold}
                        onChange={(value) => updateConfig({ capsThreshold: value })}
                        min={50}
                        max={100}
                        description="Maximum percentage of caps allowed"
                      />
                    </div>
                  )}
                </div>

                {/* Word Filter */}
                <div className="space-y-3">
                  <ToggleSwitch
                    label="Word Filter"
                    checked={config.wordFilterEnabled}
                    onChange={(checked) => updateConfig({ wordFilterEnabled: checked })}
                    description="Filter specific words and patterns"
                  />
                  {config.wordFilterEnabled && (
                    <div className="ml-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Filtered Words (one per line)
                        </label>
                        <textarea
                          value={config.filteredWords.join('\n')}
                          onChange={(e) =>
                            updateConfig({
                              filteredWords: e.target.value.split('\n').filter((w) => w.trim()),
                            })
                          }
                          placeholder="badword1&#10;badword2&#10;phrase to block"
                          rows={5}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Case-insensitive word matching
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Regex Filter (advanced)
                        </label>
                        <input
                          type="text"
                          value={config.filteredRegex}
                          onChange={(e) => updateConfig({ filteredRegex: e.target.value })}
                          placeholder="^pattern.*$"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Advanced regex pattern matching (case-insensitive)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ConfigSection>

        {/* Punishment Escalation */}
        <ConfigSection
          title="Punishment Escalation"
          description="Automatic punishments based on warning count"
          icon="⚖️"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberInput
              label="Auto-Mute on Warns"
              value={config.autoMuteOnWarns || 0}
              onChange={(value) => updateConfig({ autoMuteOnWarns: value || null })}
              min={0}
              max={20}
              description="0 to disable"
              nullable
            />
            <NumberInput
              label="Auto-Kick on Warns"
              value={config.autoKickOnWarns || 0}
              onChange={(value) => updateConfig({ autoKickOnWarns: value || null })}
              min={0}
              max={20}
              description="0 to disable"
              nullable
            />
            <NumberInput
              label="Auto-Ban on Warns"
              value={config.autoBanOnWarns || 0}
              onChange={(value) => updateConfig({ autoBanOnWarns: value || null })}
              min={0}
              max={20}
              description="0 to disable"
              nullable
            />
          </div>
        </ConfigSection>

        {/* Roles & Channels */}
        <ConfigSection
          title="Roles & Channels"
          description="Configure moderation roles and logging channels"
          icon="👥"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moderator Roles
                </label>
                <CustomMultiSelect
                  options={roles.map((role) => ({
                    value: role.id,
                    label: role.name,
                    color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined,
                  }))}
                  values={config.modRoleIds}
                  onChange={(values) => updateConfig({ modRoleIds: values })}
                  placeholder="Select moderator roles"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Users with these roles can use moderation commands
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Administrator Roles
                </label>
                <CustomMultiSelect
                  options={roles.map((role) => ({
                    value: role.id,
                    label: role.name,
                    color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined,
                  }))}
                  values={config.adminRoleIds}
                  onChange={(values) => updateConfig({ adminRoleIds: values })}
                  placeholder="Select admin roles"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Users with these roles have full moderation access
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Muted Role</label>
              <CustomSelect
                options={roles.map((role) => ({
                  value: role.id,
                  label: role.name,
                  color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined,
                }))}
                value={config.mutedRoleId || ''}
                onChange={(value) => updateConfig({ mutedRoleId: value || null })}
                placeholder="Select muted role"
              />
              <p className="mt-1 text-xs text-gray-500">
                Role assigned to muted users (should have send message permissions disabled)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mod Log Channel
                </label>
                <CustomSelect
                  options={textChannels.map((channel) => ({
                    value: channel.id,
                    label: channel.name,
                    icon: '#',
                  }))}
                  value={config.modLogChannelId || ''}
                  onChange={(value) => updateConfig({ modLogChannelId: value || null })}
                  placeholder="Select mod log channel"
                  searchable={textChannels.length > 10}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Private channel for detailed moderation logs
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appeal Channel
                </label>
                <CustomSelect
                  options={textChannels.map((channel) => ({
                    value: channel.id,
                    label: channel.name,
                    icon: '#',
                  }))}
                  value={config.appealChannelId || ''}
                  onChange={(value) => updateConfig({ appealChannelId: value || null })}
                  placeholder="Select appeal channel"
                  searchable={textChannels.length > 10}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Channel where users can appeal punishments
                </p>
              </div>
            </div>
          </div>
        </ConfigSection>

        {/* Immune Roles & Channels */}
        <ConfigSection
          title="Immunity Settings"
          description="Roles and channels exempt from auto-moderation"
          icon="🛡️"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Immune Roles
              </label>
              <CustomMultiSelect
                options={roles.map((role) => ({
                  value: role.id,
                  label: role.name,
                  color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined,
                }))}
                values={config.immuneRoleIds}
                onChange={(values) => updateConfig({ immuneRoleIds: values })}
                placeholder="Select immune roles"
              />
              <p className="mt-1 text-xs text-gray-500">
                Users with these roles bypass auto-moderation
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exempt Channels
              </label>
              <CustomMultiSelect
                options={textChannels.map((channel) => ({
                  value: channel.id,
                  label: channel.name,
                  icon: '#',
                }))}
                values={config.immuneChannelIds}
                onChange={(values) => updateConfig({ immuneChannelIds: values })}
                placeholder="Select exempt channels"
              />
              <p className="mt-1 text-xs text-gray-500">
                Auto-moderation is disabled in these channels
              </p>
            </div>
          </div>
        </ConfigSection>

        {/* DM Settings */}
        <ConfigSection
          title="DM Notifications"
          description="Send direct messages to users when punished"
          icon="📬"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ToggleSwitch
              label="DM on Warn"
              checked={config.dmOnWarn}
              onChange={(checked) => updateConfig({ dmOnWarn: checked })}
              description="Notify when warned"
            />
            <ToggleSwitch
              label="DM on Mute"
              checked={config.dmOnMute}
              onChange={(checked) => updateConfig({ dmOnMute: checked })}
              description="Notify when muted"
            />
            <ToggleSwitch
              label="DM on Kick"
              checked={config.dmOnKick}
              onChange={(checked) => updateConfig({ dmOnKick: checked })}
              description="Notify when kicked"
            />
            <ToggleSwitch
              label="DM on Ban"
              checked={config.dmOnBan}
              onChange={(checked) => updateConfig({ dmOnBan: checked })}
              description="Notify when banned"
            />
          </div>
        </ConfigSection>
      </div>

      {/* Save Button */}
      <div className="flex justify-end sticky bottom-0 bg-white py-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving || !selectedGuild}
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
    </div>
  );
}
