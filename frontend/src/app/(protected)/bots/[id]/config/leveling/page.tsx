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

interface LevelingConfig {
  enabled: boolean;
  xpPerMessageMin: number;
  xpPerMessageMax: number;
  xpCooldown: number;
  xpMultiplier: number;
  voiceXpEnabled: boolean;
  voiceXpPerMinute: number;
  levelUpEnabled: boolean;
  levelUpChannelId?: string;
  levelUpMessage?: string;
  levelUpDM: boolean;
  defaultCardBg?: string;
  defaultCardColor: string;
  roleMultipliers: { [roleId: string]: number };
  channelMultipliers: { [channelId: string]: number };
  weekendMultiplier: number;
  excludedChannels: string[];
  excludedRoles: string[];
  maxLevel: number;
  showRankOnCard: boolean;
  stackMultipliers: boolean;
}

interface LevelReward {
  id: string;
  level: number;
  type: 'ROLE_ADD' | 'ROLE_REMOVE' | 'MESSAGE' | 'CREDITS' | 'BADGE';
  roleId?: string;
  removeRoleId?: string;
  message?: string;
  credits?: number;
  badgeId?: string;
}

export default function LevelingConfigPage() {
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
  const [guildRoles, setGuildRoles] = useState<any[]>([]);
  const [rewards, setRewards] = useState<LevelReward[]>([]);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<LevelReward | null>(null);

  const [config, setConfig] = useState<LevelingConfig>({
    enabled: true,
    xpPerMessageMin: 15,
    xpPerMessageMax: 25,
    xpCooldown: 60,
    xpMultiplier: 1,
    voiceXpEnabled: false,
    voiceXpPerMinute: 5,
    levelUpEnabled: true,
    levelUpMessage: 'Congratulations {user}! You have reached **Level {level}**!',
    levelUpDM: false,
    defaultCardColor: '#5865F2',
    roleMultipliers: {},
    channelMultipliers: {},
    weekendMultiplier: 1,
    excludedChannels: [],
    excludedRoles: [],
    maxLevel: 100,
    showRankOnCard: true,
    stackMultipliers: false,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchData();
      fetchGuilds();
    }
  }, [user, botId]);

  useEffect(() => {
    if (selectedGuild) {
      fetchGuildData(selectedGuild);
      fetchConfig();
      fetchRewards();
    }
  }, [selectedGuild]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');

      const botRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBot(botRes.data);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load bot data');
    } finally {
      setLoading(false);
    }
  };

  const fetchGuilds = async () => {
    try {
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

      const rolesRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds/${guildId}/roles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGuildRoles(rolesRes.data);
    } catch (error) {
      console.error('Error fetching guild data:', error);
      toast.error('Failed to load server data');
    }
  };

  const fetchConfig = async () => {
    if (!selectedGuild) return;

    try {
      const token = Cookies.get('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/leveling/config?guildId=${selectedGuild}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        setConfig({
          ...config,
          ...response.data,
          roleMultipliers: response.data.roleMultipliers
            ? JSON.parse(response.data.roleMultipliers)
            : {},
          channelMultipliers: response.data.channelMultipliers
            ? JSON.parse(response.data.channelMultipliers)
            : {},
          excludedChannels: response.data.excludedChannels
            ? JSON.parse(response.data.excludedChannels)
            : [],
          excludedRoles: response.data.excludedRoles
            ? JSON.parse(response.data.excludedRoles)
            : [],
        });
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching config:', error);
      }
    }
  };

  const fetchRewards = async () => {
    if (!selectedGuild) return;

    try {
      const token = Cookies.get('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/leveling/rewards?guildId=${selectedGuild}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRewards(response.data || []);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching rewards:', error);
      }
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

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/leveling/config?guildId=${selectedGuild}`,
        {
          ...config,
          roleMultipliers: JSON.stringify(config.roleMultipliers),
          channelMultipliers: JSON.stringify(config.channelMultipliers),
          excludedChannels: JSON.stringify(config.excludedChannels),
          excludedRoles: JSON.stringify(config.excludedRoles),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Configuration saved successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save configuration';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddReward = async (reward: Partial<LevelReward>) => {
    if (!selectedGuild) return;

    try {
      const token = Cookies.get('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/leveling/rewards?guildId=${selectedGuild}`,
        reward,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Reward added successfully');
      fetchRewards();
      setShowRewardModal(false);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to add reward';
      toast.error(message);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm('Are you sure you want to delete this reward?')) return;

    try {
      const token = Cookies.get('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/leveling/rewards/${rewardId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Reward deleted successfully');
      fetchRewards();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete reward';
      toast.error(message);
    }
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
            <div className="text-4xl">📊</div>
            <div>
              <h1 className={designTokens.typography.h2}>Leveling System</h1>
              <p className={designTokens.typography.body + ' text-gray-500'}>
                Configure XP, rewards, and progression
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
            Select the Discord server to configure leveling
          </p>
        </div>
      )}

      {/* Main Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* XP Settings */}
        <ConfigSection
          title="XP Settings"
          description="Configure how users earn experience points"
          icon="⚡"
        >
          <div className="space-y-4">
            <ToggleField
              label="Leveling System Enabled"
              checked={config.enabled}
              onChange={(enabled) => setConfig({ ...config, enabled })}
            />

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Min XP per Message"
                value={config.xpPerMessageMin}
                onChange={(xpPerMessageMin) => setConfig({ ...config, xpPerMessageMin })}
                min={1}
                max={1000}
              />
              <NumberField
                label="Max XP per Message"
                value={config.xpPerMessageMax}
                onChange={(xpPerMessageMax) => setConfig({ ...config, xpPerMessageMax })}
                min={1}
                max={1000}
              />
            </div>

            <NumberField
              label="XP Cooldown (seconds)"
              value={config.xpCooldown}
              onChange={(xpCooldown) => setConfig({ ...config, xpCooldown })}
              min={0}
              max={3600}
              help="Time users must wait between earning XP"
            />

            <NumberField
              label="XP Multiplier"
              value={config.xpMultiplier}
              onChange={(xpMultiplier) => setConfig({ ...config, xpMultiplier })}
              min={0.1}
              max={10}
              step={0.1}
              help="Global XP multiplier"
            />

            <NumberField
              label="Max Level"
              value={config.maxLevel}
              onChange={(maxLevel) => setConfig({ ...config, maxLevel })}
              min={1}
              max={200}
            />
          </div>
        </ConfigSection>

        {/* Voice XP */}
        <ConfigSection
          title="Voice XP"
          description="Configure XP earning in voice channels"
          icon="🎤"
        >
          <div className="space-y-4">
            <ToggleField
              label="Voice XP Enabled"
              checked={config.voiceXpEnabled}
              onChange={(voiceXpEnabled) => setConfig({ ...config, voiceXpEnabled })}
            />

            <NumberField
              label="XP per Minute in Voice"
              value={config.voiceXpPerMinute}
              onChange={(voiceXpPerMinute) => setConfig({ ...config, voiceXpPerMinute })}
              min={0}
              max={100}
              disabled={!config.voiceXpEnabled}
            />
          </div>
        </ConfigSection>

        {/* Level-Up Notifications */}
        <ConfigSection
          title="Level-Up Notifications"
          description="Configure how level-ups are announced"
          icon="🎉"
        >
          <div className="space-y-4">
            <ToggleField
              label="Level-Up Notifications Enabled"
              checked={config.levelUpEnabled}
              onChange={(levelUpEnabled) => setConfig({ ...config, levelUpEnabled })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Channel
              </label>
              <CustomSelect
                options={[
                  { value: '', label: 'Same channel as message', icon: '#' },
                  ...textChannels.map((channel) => ({
                    value: channel.id,
                    label: channel.name,
                    icon: '#',
                  })),
                ]}
                value={config.levelUpChannelId || ''}
                onChange={(levelUpChannelId) =>
                  setConfig({ ...config, levelUpChannelId: levelUpChannelId || undefined })
                }
                disabled={!config.levelUpEnabled}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level-Up Message
              </label>
              <textarea
                value={config.levelUpMessage}
                onChange={(e) => setConfig({ ...config, levelUpMessage: e.target.value })}
                placeholder="Congratulations {user}! You reached Level {level}!"
                rows={3}
                disabled={!config.levelUpEnabled}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                Variables: {'{user}'}, {'{username}'}, {'{level}'}, {'{xp}'}
              </p>
            </div>

            <ToggleField
              label="Send Level-Up DM"
              checked={config.levelUpDM}
              onChange={(levelUpDM) => setConfig({ ...config, levelUpDM })}
              disabled={!config.levelUpEnabled}
            />
          </div>
        </ConfigSection>

        {/* Rank Card Customization */}
        <ConfigSection
          title="Rank Card Customization"
          description="Customize the appearance of rank cards"
          icon="🎨"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={config.defaultCardColor}
                  onChange={(e) => setConfig({ ...config, defaultCardColor: e.target.value })}
                  className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.defaultCardColor}
                  onChange={(e) => setConfig({ ...config, defaultCardColor: e.target.value })}
                  placeholder="#5865F2"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Background URL
              </label>
              <input
                type="text"
                value={config.defaultCardBg || ''}
                onChange={(e) => setConfig({ ...config, defaultCardBg: e.target.value })}
                placeholder="https://example.com/background.png"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty for default gradient background
              </p>
            </div>

            <ToggleField
              label="Show Rank on Card"
              checked={config.showRankOnCard}
              onChange={(showRankOnCard) => setConfig({ ...config, showRankOnCard })}
            />
          </div>
        </ConfigSection>

        {/* Multipliers */}
        <ConfigSection
          title="XP Multipliers"
          description="Boost XP earning for specific roles or channels"
          icon="✨"
        >
          <div className="space-y-4">
            <NumberField
              label="Weekend Multiplier"
              value={config.weekendMultiplier}
              onChange={(weekendMultiplier) => setConfig({ ...config, weekendMultiplier })}
              min={0.1}
              max={10}
              step={0.1}
              help="XP multiplier active on weekends"
            />

            <ToggleField
              label="Stack Multipliers"
              checked={config.stackMultipliers}
              onChange={(stackMultipliers) => setConfig({ ...config, stackMultipliers })}
              help="If enabled, multiple role/channel multipliers will multiply. Otherwise, highest multiplier wins."
            />

            <MultiplierManager
              title="Role Multipliers"
              items={config.roleMultipliers}
              availableItems={guildRoles}
              onChange={(roleMultipliers) => setConfig({ ...config, roleMultipliers })}
              itemType="role"
            />

            <MultiplierManager
              title="Channel Multipliers"
              items={config.channelMultipliers}
              availableItems={textChannels}
              onChange={(channelMultipliers) => setConfig({ ...config, channelMultipliers })}
              itemType="channel"
            />
          </div>
        </ConfigSection>

        {/* Restrictions */}
        <ConfigSection
          title="Restrictions"
          description="Exclude channels and roles from earning XP"
          icon="🚫"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excluded Channels
              </label>
              <CustomMultiSelect
                options={textChannels.map((channel) => ({
                  value: channel.id,
                  label: channel.name,
                  icon: '#',
                }))}
                values={config.excludedChannels}
                onChange={(excludedChannels) => setConfig({ ...config, excludedChannels })}
                placeholder="Select channels to exclude"
              />
              <p className="mt-1 text-xs text-gray-500">
                Users won't earn XP in these channels
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excluded Roles
              </label>
              <CustomMultiSelect
                options={guildRoles.map((role) => ({
                  value: role.id,
                  label: role.name,
                  color: `#${role.color?.toString(16).padStart(6, '0')}`,
                }))}
                values={config.excludedRoles}
                onChange={(excludedRoles) => setConfig({ ...config, excludedRoles })}
                placeholder="Select roles to exclude"
              />
              <p className="mt-1 text-xs text-gray-500">
                Users with these roles won't earn XP
              </p>
            </div>
          </div>
        </ConfigSection>
      </div>

      {/* Level Rewards */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={designTokens.typography.h3}>Level Rewards</h3>
            <p className={designTokens.typography.small + ' text-gray-500'}>
              Configure rewards users receive when reaching certain levels
            </p>
          </div>
          <button
            onClick={() => {
              setEditingReward(null);
              setShowRewardModal(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + Add Reward
          </button>
        </div>

        {rewards.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reward
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rewards
                  .sort((a, b) => a.level - b.level)
                  .map((reward) => (
                    <tr key={reward.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        Level {reward.level}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRewardTypeColor(
                            reward.type
                          )}`}
                        >
                          {getRewardTypeName(reward.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getRewardDescription(reward, guildRoles)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteReward(reward.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎁</div>
            <p className="text-sm">No rewards configured yet</p>
            <p className="text-xs mt-1">Click "Add Reward" to create your first reward</p>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => router.push(`/bots/${botId}/config`)}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !selectedGuild}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Reward Modal */}
      {showRewardModal && (
        <RewardModal
          guildRoles={guildRoles}
          onClose={() => setShowRewardModal(false)}
          onSave={handleAddReward}
        />
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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start space-x-3 mb-4">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <h3 className={designTokens.typography.h3}>{title}</h3>
          <p className={designTokens.typography.small + ' text-gray-500'}>{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  help?: string;
}

function ToggleField({ label, checked, onChange, disabled = false, help }: ToggleFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          {help && <p className="text-xs text-gray-500 mt-0.5">{help}</p>}
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
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  help?: string;
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  help,
}: NumberFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          if (!isNaN(val)) {
            if (min !== undefined && val < min) {
              onChange(min);
            } else if (max !== undefined && val > max) {
              onChange(max);
            } else {
              onChange(val);
            }
          }
        }}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      {help && <p className="mt-1 text-xs text-gray-500">{help}</p>}
      {(min !== undefined || max !== undefined) && (
        <p className="mt-1 text-xs text-gray-500">
          Range: {min ?? '∞'} - {max ?? '∞'}
        </p>
      )}
    </div>
  );
}

interface MultiplierManagerProps {
  title: string;
  items: { [key: string]: number };
  availableItems: any[];
  onChange: (items: { [key: string]: number }) => void;
  itemType: 'role' | 'channel';
}

function MultiplierManager({
  title,
  items,
  availableItems,
  onChange,
  itemType,
}: MultiplierManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [multiplier, setMultiplier] = useState(1.5);

  const handleAdd = () => {
    if (!selectedItem || items[selectedItem]) return;

    onChange({ ...items, [selectedItem]: multiplier });
    setSelectedItem('');
    setMultiplier(1.5);
    setShowAdd(false);
  };

  const handleRemove = (itemId: string) => {
    const newItems = { ...items };
    delete newItems[itemId];
    onChange(newItems);
  };

  const getItemName = (itemId: string) => {
    const item = availableItems.find((i) => i.id === itemId);
    return item?.name || itemId;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">{title}</label>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          + Add
        </button>
      </div>

      {showAdd && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
          <CustomSelect
            options={availableItems
              .filter((item) => !items[item.id])
              .map((item) => ({
                value: item.id,
                label: item.name,
                icon: itemType === 'channel' ? '#' : undefined,
                color:
                  itemType === 'role'
                    ? `#${item.color?.toString(16).padStart(6, '0')}`
                    : undefined,
              }))}
            value={selectedItem}
            onChange={setSelectedItem}
            placeholder={`Select ${itemType}`}
            searchable
          />
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={multiplier}
              onChange={(e) => setMultiplier(parseFloat(e.target.value))}
              min={0.1}
              max={10}
              step={0.1}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Multiplier"
            />
            <button
              onClick={handleAdd}
              disabled={!selectedItem}
              className="px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {Object.entries(items).length === 0 ? (
          <p className="text-xs text-gray-500 italic py-2">No multipliers configured</p>
        ) : (
          Object.entries(items).map(([itemId, mult]) => (
            <div
              key={itemId}
              className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">{getItemName(itemId)}</span>
                <span className="text-xs text-gray-500">×{mult}</span>
              </div>
              <button
                onClick={() => handleRemove(itemId)}
                className="text-red-600 hover:text-red-900 text-xs"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface RewardModalProps {
  guildRoles: any[];
  onClose: () => void;
  onSave: (reward: Partial<LevelReward>) => void;
}

function RewardModal({ guildRoles, onClose, onSave }: RewardModalProps) {
  const [level, setLevel] = useState(5);
  const [type, setType] = useState<LevelReward['type']>('ROLE_ADD');
  const [roleId, setRoleId] = useState('');
  const [message, setMessage] = useState('');
  const [credits, setCredits] = useState(100);

  const handleSubmit = () => {
    const reward: Partial<LevelReward> = { level, type };

    if (type === 'ROLE_ADD') {
      if (!roleId) {
        toast.error('Please select a role');
        return;
      }
      reward.roleId = roleId;
    } else if (type === 'ROLE_REMOVE') {
      if (!roleId) {
        toast.error('Please select a role');
        return;
      }
      reward.removeRoleId = roleId;
    } else if (type === 'MESSAGE') {
      if (!message) {
        toast.error('Please enter a message');
        return;
      }
      reward.message = message;
    } else if (type === 'CREDITS') {
      reward.credits = credits;
    }

    onSave(reward);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={designTokens.typography.h3}>Add Level Reward</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
          <input
            type="number"
            value={level}
            onChange={(e) => setLevel(parseInt(e.target.value))}
            min={1}
            max={200}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Reward Type</label>
          <CustomSelect
            options={[
              { value: 'ROLE_ADD', label: 'Add Role', icon: '🎭' },
              { value: 'ROLE_REMOVE', label: 'Remove Role', icon: '🚫' },
              { value: 'MESSAGE', label: 'Custom Message', icon: '💬' },
              { value: 'CREDITS', label: 'Credits', icon: '💰' },
            ]}
            value={type}
            onChange={(value) => setType(value as LevelReward['type'])}
          />
        </div>

        {(type === 'ROLE_ADD' || type === 'ROLE_REMOVE') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <CustomSelect
              options={guildRoles.map((role) => ({
                value: role.id,
                label: role.name,
                color: `#${role.color?.toString(16).padStart(6, '0')}`,
              }))}
              value={roleId}
              onChange={setRoleId}
              placeholder="Select a role"
              searchable
            />
          </div>
        )}

        {type === 'MESSAGE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter custom message..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        )}

        {type === 'CREDITS' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Credits Amount</label>
            <input
              type="number"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value))}
              min={1}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add Reward
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper Functions

function getRewardTypeName(type: string): string {
  const names: Record<string, string> = {
    ROLE_ADD: 'Add Role',
    ROLE_REMOVE: 'Remove Role',
    MESSAGE: 'Message',
    CREDITS: 'Credits',
    BADGE: 'Badge',
  };
  return names[type] || type;
}

function getRewardTypeColor(type: string): string {
  const colors: Record<string, string> = {
    ROLE_ADD: 'bg-green-100 text-green-800',
    ROLE_REMOVE: 'bg-red-100 text-red-800',
    MESSAGE: 'bg-blue-100 text-blue-800',
    CREDITS: 'bg-yellow-100 text-yellow-800',
    BADGE: 'bg-purple-100 text-purple-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

function getRewardDescription(reward: LevelReward, roles: any[]): string {
  switch (reward.type) {
    case 'ROLE_ADD': {
      const role = roles.find((r) => r.id === reward.roleId);
      return role ? `Add @${role.name}` : 'Add role';
    }
    case 'ROLE_REMOVE': {
      const role = roles.find((r) => r.id === reward.removeRoleId);
      return role ? `Remove @${role.name}` : 'Remove role';
    }
    case 'MESSAGE':
      return reward.message || 'Custom message';
    case 'CREDITS':
      return `${reward.credits} credits`;
    case 'BADGE':
      return 'Badge';
    default:
      return 'Unknown';
  }
}
