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

interface SuggestionsConfig {
  id?: string;
  guildId: string;
  botId: string;
  enabled: boolean;

  // Channels
  suggestionsChannelId: string | null;
  reviewChannelId: string | null;
  approvedChannelId: string | null;
  deniedChannelId: string | null;
  implementedChannelId: string | null;

  // Staff
  staffRoleIds: string[];

  // Features
  upvoteEnabled: boolean;
  downvoteEnabled: boolean;
  anonymousEnabled: boolean;
  autoThreadEnabled: boolean;
  cooldownSeconds: number;

  // Status Colors
  pendingColor: string;
  approvedColor: string;
  deniedColor: string;
  implementedColor: string;
}

interface Suggestion {
  id: string;
  guildId: string;
  userId: string;
  username: string;
  title: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'IMPLEMENTED';
  upvotes: number;
  downvotes: number;
  isAnonymous: boolean;
  channelId: string;
  messageId: string | null;
  threadId: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function SuggestionsConfigPage() {
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeTab, setActiveTab] = useState<'config' | 'recent'>('config');

  const [config, setConfig] = useState<SuggestionsConfig>({
    guildId: '',
    botId: botId,
    enabled: true,
    suggestionsChannelId: null,
    reviewChannelId: null,
    approvedChannelId: null,
    deniedChannelId: null,
    implementedChannelId: null,
    staffRoleIds: [],
    upvoteEnabled: true,
    downvoteEnabled: true,
    anonymousEnabled: false,
    autoThreadEnabled: true,
    cooldownSeconds: 300,
    pendingColor: '#FFA500',
    approvedColor: '#00FF00',
    deniedColor: '#FF0000',
    implementedColor: '#0000FF',
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
      fetchRecentSuggestions(selectedGuild);
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/suggestions/${botId}/config?guildId=${guildId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        setConfig({
          ...response.data,
          guildId: guildId,
          staffRoleIds: response.data.staffRoleIds || [],
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

  const fetchRecentSuggestions = async (guildId: string) => {
    try {
      const token = Cookies.get('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suggestions/${botId}/suggestions?guildId=${guildId}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuggestions(response.data || []);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching suggestions:', error);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedGuild) {
      toast.error('Please select a server');
      return;
    }

    if (!config.suggestionsChannelId) {
      toast.error('Please select a suggestions channel');
      return;
    }

    try {
      setSaving(true);
      const token = Cookies.get('token');

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suggestions/${botId}/config`,
        { ...config, guildId: selectedGuild },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Suggestions configuration saved successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save configuration';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveSuggestion = async (suggestionId: string) => {
    try {
      const token = Cookies.get('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suggestions/${botId}/suggestions/${suggestionId}`,
        { status: 'APPROVED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Suggestion approved');
      fetchRecentSuggestions(selectedGuild);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to approve suggestion';
      toast.error(message);
    }
  };

  const handleDenySuggestion = async (suggestionId: string) => {
    try {
      const token = Cookies.get('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suggestions/${botId}/suggestions/${suggestionId}`,
        { status: 'DENIED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Suggestion denied');
      fetchRecentSuggestions(selectedGuild);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to deny suggestion';
      toast.error(message);
    }
  };

  const handleImplementSuggestion = async (suggestionId: string) => {
    try {
      const token = Cookies.get('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suggestions/${botId}/suggestions/${suggestionId}`,
        { status: 'IMPLEMENTED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Suggestion marked as implemented');
      fetchRecentSuggestions(selectedGuild);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update suggestion';
      toast.error(message);
    }
  };

  const updateConfig = (updates: Partial<SuggestionsConfig>) => {
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
            <div className="text-4xl">💡</div>
            <div>
              <h1 className={designTokens.typography.h2}>Suggestions Configuration</h1>
              <p className={designTokens.typography.body + ' text-gray-500'}>
                Configure suggestion system and manage community feedback
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
            Select the Discord server to configure suggestions
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <TabButton
              active={activeTab === 'config'}
              onClick={() => setActiveTab('config')}
              icon="⚙️"
              label="Configuration"
            />
            <TabButton
              active={activeTab === 'recent'}
              onClick={() => setActiveTab('recent')}
              icon="📋"
              label={`Recent Suggestions (${suggestions.length})`}
            />
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'config' ? (
            <div className="space-y-6">
              {/* Master Toggle */}
              <ConfigSection
                title="Suggestions System"
                description="Enable or disable the suggestions system"
                icon="🎚️"
              >
                <ToggleSwitch
                  label="Enable Suggestions"
                  checked={config.enabled}
                  onChange={(checked) => updateConfig({ enabled: checked })}
                  description="Master switch for suggestions feature"
                />
              </ConfigSection>

              {/* Channels Configuration */}
              <ConfigSection
                title="Channels"
                description="Configure where suggestions are posted and reviewed"
                icon="📝"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Suggestions Channel <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      options={textChannels.map((channel) => ({
                        value: channel.id,
                        label: channel.name,
                        icon: '#',
                      }))}
                      value={config.suggestionsChannelId || ''}
                      onChange={(value) => updateConfig({ suggestionsChannelId: value || null })}
                      placeholder="Select suggestions channel"
                      searchable={textChannels.length > 10}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Where users submit their suggestions
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Staff Review Channel
                    </label>
                    <CustomSelect
                      options={textChannels.map((channel) => ({
                        value: channel.id,
                        label: channel.name,
                        icon: '#',
                      }))}
                      value={config.reviewChannelId || ''}
                      onChange={(value) => updateConfig({ reviewChannelId: value || null })}
                      placeholder="Select review channel (optional)"
                      searchable={textChannels.length > 10}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Private channel where staff can review pending suggestions
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Approved Channel
                      </label>
                      <CustomSelect
                        options={textChannels.map((channel) => ({
                          value: channel.id,
                          label: channel.name,
                          icon: '#',
                        }))}
                        value={config.approvedChannelId || ''}
                        onChange={(value) =>
                          updateConfig({ approvedChannelId: value || null })
                        }
                        placeholder="Optional"
                        searchable={textChannels.length > 10}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Where approved suggestions are posted
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Denied Channel
                      </label>
                      <CustomSelect
                        options={textChannels.map((channel) => ({
                          value: channel.id,
                          label: channel.name,
                          icon: '#',
                        }))}
                        value={config.deniedChannelId || ''}
                        onChange={(value) => updateConfig({ deniedChannelId: value || null })}
                        placeholder="Optional"
                        searchable={textChannels.length > 10}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Where denied suggestions are logged
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Implemented Channel
                      </label>
                      <CustomSelect
                        options={textChannels.map((channel) => ({
                          value: channel.id,
                          label: channel.name,
                          icon: '#',
                        }))}
                        value={config.implementedChannelId || ''}
                        onChange={(value) =>
                          updateConfig({ implementedChannelId: value || null })
                        }
                        placeholder="Optional"
                        searchable={textChannels.length > 10}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Where implemented suggestions are showcased
                      </p>
                    </div>
                  </div>
                </div>
              </ConfigSection>

              {/* Staff Roles */}
              <ConfigSection
                title="Staff Roles"
                description="Roles that can manage and review suggestions"
                icon="👥"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff Roles
                  </label>
                  <CustomMultiSelect
                    options={roles.map((role) => ({
                      value: role.id,
                      label: role.name,
                      color: role.color
                        ? `#${role.color.toString(16).padStart(6, '0')}`
                        : undefined,
                    }))}
                    values={config.staffRoleIds}
                    onChange={(values) => updateConfig({ staffRoleIds: values })}
                    placeholder="Select staff roles"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Users with these roles can approve, deny, and manage suggestions
                  </p>
                </div>
              </ConfigSection>

              {/* Voting Settings */}
              <ConfigSection
                title="Voting Settings"
                description="Configure how users vote on suggestions"
                icon="👍"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ToggleSwitch
                      label="Enable Upvotes"
                      checked={config.upvoteEnabled}
                      onChange={(checked) => updateConfig({ upvoteEnabled: checked })}
                      description="Allow users to upvote suggestions"
                    />
                    <ToggleSwitch
                      label="Enable Downvotes"
                      checked={config.downvoteEnabled}
                      onChange={(checked) => updateConfig({ downvoteEnabled: checked })}
                      description="Allow users to downvote suggestions"
                    />
                  </div>
                </div>
              </ConfigSection>

              {/* Feature Settings */}
              <ConfigSection
                title="Feature Settings"
                description="Additional suggestion features"
                icon="✨"
              >
                <div className="space-y-4">
                  <ToggleSwitch
                    label="Anonymous Suggestions"
                    checked={config.anonymousEnabled}
                    onChange={(checked) => updateConfig({ anonymousEnabled: checked })}
                    description="Allow users to submit suggestions anonymously"
                  />
                  <ToggleSwitch
                    label="Auto-Thread Creation"
                    checked={config.autoThreadEnabled}
                    onChange={(checked) => updateConfig({ autoThreadEnabled: checked })}
                    description="Automatically create discussion threads for suggestions"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cooldown Between Suggestions (seconds)
                    </label>
                    <input
                      type="number"
                      value={config.cooldownSeconds}
                      onChange={(e) =>
                        updateConfig({ cooldownSeconds: parseInt(e.target.value) || 0 })
                      }
                      min={0}
                      max={86400}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Time users must wait between submitting suggestions (0 to disable)
                    </p>
                  </div>
                </div>
              </ConfigSection>

              {/* Status Colors */}
              <ConfigSection
                title="Status Colors"
                description="Customize embed colors for different suggestion statuses"
                icon="🎨"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ColorPicker
                    label="Pending"
                    value={config.pendingColor}
                    onChange={(color) => updateConfig({ pendingColor: color })}
                  />
                  <ColorPicker
                    label="Approved"
                    value={config.approvedColor}
                    onChange={(color) => updateConfig({ approvedColor: color })}
                  />
                  <ColorPicker
                    label="Denied"
                    value={config.deniedColor}
                    onChange={(color) => updateConfig({ deniedColor: color })}
                  />
                  <ColorPicker
                    label="Implemented"
                    value={config.implementedColor}
                    onChange={(color) => updateConfig({ implementedColor: color })}
                  />
                </div>
              </ConfigSection>
            </div>
          ) : (
            <RecentSuggestionsSection
              suggestions={suggestions}
              onApprove={handleApproveSuggestion}
              onDeny={handleDenySuggestion}
              onImplement={handleImplementSuggestion}
            />
          )}
        </div>
      </div>

      {/* Save Button */}
      {activeTab === 'config' && (
        <div className="flex justify-end sticky bottom-0 bg-white py-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving || !selectedGuild}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
          >
            {saving ? 'Saving Configuration...' : 'Save Configuration'}
          </button>
        </div>
      )}
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

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <span className="flex items-center space-x-2">
        <span>{icon}</span>
        <span>{label}</span>
      </span>
    </button>
  );
}

interface RecentSuggestionsSectionProps {
  suggestions: Suggestion[];
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onImplement: (id: string) => void;
}

function RecentSuggestionsSection({
  suggestions,
  onApprove,
  onDeny,
  onImplement,
}: RecentSuggestionsSectionProps) {
  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">💡</div>
        <h3 className={designTokens.typography.h3 + ' mb-2'}>No suggestions yet</h3>
        <p className={designTokens.typography.body + ' text-gray-500'}>
          Suggestions will appear here once users start submitting them
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={designTokens.typography.h3}>Recent Suggestions</h3>
          <p className={designTokens.typography.small + ' text-gray-500'}>
            Quick actions for managing suggestions
          </p>
        </div>
      </div>

      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onApprove={onApprove}
          onDeny={onDeny}
          onImplement={onImplement}
        />
      ))}
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onImplement: (id: string) => void;
}

function SuggestionCard({ suggestion, onApprove, onDeny, onImplement }: SuggestionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'DENIED':
        return 'bg-red-100 text-red-800';
      case 'IMPLEMENTED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className={designTokens.typography.h4}>{suggestion.title}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(suggestion.status)}`}>
              {suggestion.status}
            </span>
            {suggestion.isAnonymous && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                Anonymous
              </span>
            )}
          </div>
          <p className={designTokens.typography.small + ' text-gray-600 mb-3'}>
            {suggestion.description}
          </p>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>
              By: {suggestion.isAnonymous ? 'Anonymous' : suggestion.username}
            </span>
            <span>•</span>
            <span>{formatDate(suggestion.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <span className="text-green-600">👍</span>
            <span className="font-medium">{suggestion.upvotes}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-red-600">👎</span>
            <span className="font-medium">{suggestion.downvotes}</span>
          </div>
          <div className="text-gray-500">
            Net: {suggestion.upvotes - suggestion.downvotes}
          </div>
        </div>

        {suggestion.status === 'PENDING' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onApprove(suggestion.id)}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onDeny(suggestion.id)}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Deny
            </button>
          </div>
        )}

        {suggestion.status === 'APPROVED' && (
          <button
            onClick={() => onImplement(suggestion.id)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Mark as Implemented
          </button>
        )}
      </div>

      {suggestion.reviewNote && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-1">Staff Note:</p>
          <p className="text-sm text-gray-600">{suggestion.reviewNote}</p>
        </div>
      )}
    </div>
  );
}
