'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { designTokens } from '@/styles/design-tokens';
import axios from 'axios';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import CustomSelect from '@/components/CustomSelect';

interface GiveawayConfig {
  defaultManagerRoles?: string[];
  defaultPingRole?: string;
  embedColor?: string;
  buttonEmoji?: string;
  reactionsEnabled?: boolean;
  reactionEmoji?: string;
  defaultWinnerCount?: number;
}

interface Giveaway {
  id: string;
  prize: string;
  description?: string;
  channelId: string;
  messageId?: string;
  endTime: Date;
  winnerCount: number;
  entries: number;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  requirements?: {
    minLevel?: number;
    requiredRoles?: string[];
    minMessages?: number;
  };
  bonusEntries?: {
    roleId: string;
    entries: number;
  }[];
  winners?: string[];
  createdAt: Date;
}

interface Channel {
  id: string;
  name: string;
  type: number;
}

interface Role {
  id: string;
  name: string;
  color: string;
}

const DURATION_PRESETS = [
  { label: '1 hour', value: 3600000 },
  { label: '6 hours', value: 21600000 },
  { label: '12 hours', value: 43200000 },
  { label: '24 hours', value: 86400000 },
  { label: '3 days', value: 259200000 },
  { label: '7 days', value: 604800000 },
];

export default function GiveawaysConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'active' | 'create' | 'history'>('config');

  // Config state
  const [config, setConfig] = useState<GiveawayConfig>({
    embedColor: '#5865F2',
    buttonEmoji: '🎉',
    reactionsEnabled: true,
    reactionEmoji: '🎉',
    defaultWinnerCount: 1,
  });

  // Giveaways state
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [historyGiveaways, setHistoryGiveaways] = useState<Giveaway[]>([]);

  // Guild data
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // Create giveaway form
  const [newGiveaway, setNewGiveaway] = useState({
    prize: '',
    description: '',
    duration: 86400000, // 24 hours default
    winnerCount: 1,
    channelId: '',
    requirements: {
      minLevel: 0,
      requiredRoles: [] as string[],
      minMessages: 0,
    },
    bonusEntries: [] as { roleId: string; entries: number }[],
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
    }
  }, [selectedGuild]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');

      // Fetch bot details
      const botRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBot(botRes.data);

      // Fetch giveaway config
      try {
        const configRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/giveaway/${botId}/config`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (configRes.data) {
          setConfig(configRes.data);
        }
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error('Error fetching config:', error);
        }
      }

      // Fetch active giveaways
      try {
        const giveawaysRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/giveaway/${botId}/giveaways?status=ACTIVE`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setGiveaways(giveawaysRes.data || []);
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error('Error fetching giveaways:', error);
        }
      }

      // Fetch giveaway history
      try {
        const historyRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/giveaway/${botId}/giveaways?status=ENDED,CANCELLED`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setHistoryGiveaways(historyRes.data || []);
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error('Error fetching history:', error);
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load giveaway data');
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
    }
  };

  const fetchGuildData = async (guildId: string) => {
    try {
      const token = Cookies.get('token');

      const channelsRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds/${guildId}/channels`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChannels(channelsRes.data);

      const rolesRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds/${guildId}/roles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Error fetching guild data:', error);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      const token = Cookies.get('token');

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/giveaway/${botId}/config`,
        config,
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

  const handleCreateGiveaway = async () => {
    try {
      if (!newGiveaway.prize.trim()) {
        toast.error('Please enter a prize');
        return;
      }

      if (!newGiveaway.channelId) {
        toast.error('Please select a channel');
        return;
      }

      setSaving(true);
      const token = Cookies.get('token');

      const endTime = new Date(Date.now() + newGiveaway.duration);

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/giveaway/${botId}/giveaways`,
        {
          ...newGiveaway,
          endTime,
          guildId: selectedGuild,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Giveaway created successfully');
      setNewGiveaway({
        prize: '',
        description: '',
        duration: 86400000,
        winnerCount: 1,
        channelId: '',
        requirements: {
          minLevel: 0,
          requiredRoles: [],
          minMessages: 0,
        },
        bonusEntries: [],
      });
      setActiveTab('active');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create giveaway';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEndGiveaway = async (giveawayId: string) => {
    try {
      const token = Cookies.get('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/giveaway/${botId}/giveaways/${giveawayId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Giveaway ended successfully');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to end giveaway';
      toast.error(message);
    }
  };

  const handleRerollGiveaway = async (giveawayId: string) => {
    try {
      const token = Cookies.get('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/giveaway/${botId}/giveaways/${giveawayId}/reroll`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Giveaway rerolled successfully');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reroll giveaway';
      toast.error(message);
    }
  };

  const handleCancelGiveaway = async (giveawayId: string) => {
    if (!confirm('Are you sure you want to cancel this giveaway?')) return;

    try {
      const token = Cookies.get('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/giveaway/${botId}/giveaways/${giveawayId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Giveaway cancelled successfully');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to cancel giveaway';
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

  const textChannels = channels.filter((ch) => ch.type === 0);

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
            <div className="text-4xl">🎉</div>
            <div>
              <h1 className={designTokens.typography.h2}>Giveaways</h1>
              <p className={designTokens.typography.body + ' text-gray-500'}>
                Manage giveaways and prizes for your community
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
              active={activeTab === 'active'}
              onClick={() => setActiveTab('active')}
              icon="🎁"
              label={`Active (${giveaways.length})`}
            />
            <TabButton
              active={activeTab === 'create'}
              onClick={() => setActiveTab('create')}
              icon="➕"
              label="Create Giveaway"
            />
            <TabButton
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              icon="📜"
              label="History"
            />
          </nav>
        </div>

        <div className="p-6">
          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <ConfigSection
              config={config}
              setConfig={setConfig}
              roles={roles}
              onSave={handleSaveConfig}
              saving={saving}
            />
          )}

          {/* Active Giveaways Tab */}
          {activeTab === 'active' && (
            <ActiveGiveawaysSection
              giveaways={giveaways}
              channels={channels}
              onEnd={handleEndGiveaway}
              onReroll={handleRerollGiveaway}
              onCancel={handleCancelGiveaway}
            />
          )}

          {/* Create Giveaway Tab */}
          {activeTab === 'create' && (
            <CreateGiveawaySection
              newGiveaway={newGiveaway}
              setNewGiveaway={setNewGiveaway}
              channels={textChannels}
              roles={roles}
              onCreate={handleCreateGiveaway}
              saving={saving}
            />
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <HistorySection giveaways={historyGiveaways} channels={channels} />
          )}
        </div>
      </div>
    </div>
  );
}

// Tab Button Component
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

// Configuration Section Component
function ConfigSection({
  config,
  setConfig,
  roles,
  onSave,
  saving,
}: {
  config: GiveawayConfig;
  setConfig: (config: GiveawayConfig) => void;
  roles: Role[];
  onSave: () => void;
  saving: boolean;
}) {
  const updateConfig = (updates: Partial<GiveawayConfig>) => {
    setConfig({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Default Manager Roles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Manager Roles
          </label>
          <CustomSelect
            options={roles.map((role) => ({
              value: role.id,
              label: role.name,
              color: role.color,
            }))}
            value={config.defaultManagerRoles?.[0] || ''}
            onChange={(value) => updateConfig({ defaultManagerRoles: [value] })}
            placeholder="Select manager roles"
            searchable={roles.length > 10}
          />
          <p className="mt-1 text-xs text-gray-500">
            Users with these roles can manage giveaways
          </p>
        </div>

        {/* Default Ping Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Ping Role
          </label>
          <CustomSelect
            options={roles.map((role) => ({
              value: role.id,
              label: role.name,
              color: role.color,
            }))}
            value={config.defaultPingRole || ''}
            onChange={(value) => updateConfig({ defaultPingRole: value })}
            placeholder="Select ping role (optional)"
            searchable={roles.length > 10}
          />
          <p className="mt-1 text-xs text-gray-500">
            This role will be mentioned when giveaways start
          </p>
        </div>

        {/* Embed Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Embed Color</label>
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={config.embedColor || '#5865F2'}
              onChange={(e) => updateConfig({ embedColor: e.target.value })}
              className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={config.embedColor || '#5865F2'}
              onChange={(e) => updateConfig({ embedColor: e.target.value })}
              placeholder="#5865F2"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Button Emoji */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Button Emoji</label>
          <input
            type="text"
            value={config.buttonEmoji || '🎉'}
            onChange={(e) => updateConfig({ buttonEmoji: e.target.value })}
            placeholder="🎉"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Reactions Enabled */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="reactionsEnabled"
            checked={config.reactionsEnabled || false}
            onChange={(e) => updateConfig({ reactionsEnabled: e.target.checked })}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="reactionsEnabled" className="text-sm font-medium text-gray-700">
            Enable reaction entries
          </label>
        </div>

        {/* Reaction Emoji */}
        {config.reactionsEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reaction Emoji
            </label>
            <input
              type="text"
              value={config.reactionEmoji || '🎉'}
              onChange={(e) => updateConfig({ reactionEmoji: e.target.value })}
              placeholder="🎉"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Default Winner Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Winner Count
          </label>
          <input
            type="number"
            min="1"
            value={config.defaultWinnerCount || 1}
            onChange={(e) => updateConfig({ defaultWinnerCount: parseInt(e.target.value) })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

// Active Giveaways Section Component
function ActiveGiveawaysSection({
  giveaways,
  channels,
  onEnd,
  onReroll,
  onCancel,
}: {
  giveaways: Giveaway[];
  channels: Channel[];
  onEnd: (id: string) => void;
  onReroll: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  if (giveaways.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎁</div>
        <h3 className={designTokens.typography.h3 + ' mb-2'}>No active giveaways</h3>
        <p className={designTokens.typography.body + ' text-gray-500'}>
          Create your first giveaway to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {giveaways.map((giveaway) => (
        <GiveawayCard
          key={giveaway.id}
          giveaway={giveaway}
          channels={channels}
          onEnd={onEnd}
          onReroll={onReroll}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}

// Giveaway Card Component
function GiveawayCard({
  giveaway,
  channels,
  onEnd,
  onReroll,
  onCancel,
}: {
  giveaway: Giveaway;
  channels: Channel[];
  onEnd: (id: string) => void;
  onReroll: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(giveaway.endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [giveaway.endTime]);

  const channel = channels.find((ch) => ch.id === giveaway.channelId);
  const statusColor = giveaway.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className={designTokens.typography.h4}>{giveaway.prize}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded ${statusColor}`}>
              {giveaway.status}
            </span>
          </div>
          {giveaway.description && (
            <p className={designTokens.typography.small + ' text-gray-500 mb-3'}>
              {giveaway.description}
            </p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Channel:</span>
              <p className="font-medium">#{channel?.name || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-gray-500">Entries:</span>
              <p className="font-medium">{giveaway.entries || 0}</p>
            </div>
            <div>
              <span className="text-gray-500">Winners:</span>
              <p className="font-medium">{giveaway.winnerCount}</p>
            </div>
            <div>
              <span className="text-gray-500">Time Remaining:</span>
              <p className="font-medium">{timeRemaining}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-4 border-t">
        <button
          onClick={() => onEnd(giveaway.id)}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          End Early
        </button>
        <button
          onClick={() => onReroll(giveaway.id)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reroll
        </button>
        <button
          onClick={() => onCancel(giveaway.id)}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Create Giveaway Section Component
function CreateGiveawaySection({
  newGiveaway,
  setNewGiveaway,
  channels,
  roles,
  onCreate,
  saving,
}: {
  newGiveaway: any;
  setNewGiveaway: (giveaway: any) => void;
  channels: Channel[];
  roles: Role[];
  onCreate: () => void;
  saving: boolean;
}) {
  const updateGiveaway = (updates: any) => {
    setNewGiveaway({ ...newGiveaway, ...updates });
  };

  const updateRequirements = (updates: any) => {
    setNewGiveaway({
      ...newGiveaway,
      requirements: { ...newGiveaway.requirements, ...updates },
    });
  };

  const addBonusEntry = () => {
    setNewGiveaway({
      ...newGiveaway,
      bonusEntries: [...newGiveaway.bonusEntries, { roleId: '', entries: 1 }],
    });
  };

  const updateBonusEntry = (index: number, updates: any) => {
    const bonusEntries = [...newGiveaway.bonusEntries];
    bonusEntries[index] = { ...bonusEntries[index], ...updates };
    setNewGiveaway({ ...newGiveaway, bonusEntries });
  };

  const removeBonusEntry = (index: number) => {
    const bonusEntries = newGiveaway.bonusEntries.filter((_: any, i: number) => i !== index);
    setNewGiveaway({ ...newGiveaway, bonusEntries });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prize */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prize <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={newGiveaway.prize}
            onChange={(e) => updateGiveaway({ prize: e.target.value })}
            placeholder="e.g., Discord Nitro, Steam Gift Card, etc."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={newGiveaway.description}
            onChange={(e) => updateGiveaway({ description: e.target.value })}
            placeholder="Optional description for the giveaway"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => updateGiveaway({ duration: preset.value })}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  newGiveaway.duration === preset.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={Math.floor(newGiveaway.duration / 1000 / 60)}
            onChange={(e) => updateGiveaway({ duration: parseInt(e.target.value) * 60 * 1000 })}
            placeholder="Custom minutes"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">Or enter custom duration in minutes</p>
        </div>

        {/* Winner Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Winner Count</label>
          <input
            type="number"
            min="1"
            value={newGiveaway.winnerCount}
            onChange={(e) => updateGiveaway({ winnerCount: parseInt(e.target.value) })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Channel */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Channel <span className="text-red-500">*</span>
          </label>
          <CustomSelect
            options={channels.map((channel) => ({
              value: channel.id,
              label: channel.name,
              icon: '#',
            }))}
            value={newGiveaway.channelId}
            onChange={(value) => updateGiveaway({ channelId: value })}
            placeholder="Select a channel"
            searchable={channels.length > 10}
          />
        </div>
      </div>

      {/* Requirements Section */}
      <div className="border-t pt-6">
        <h3 className={designTokens.typography.h4 + ' mb-4'}>Entry Requirements (Optional)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Min Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Level
            </label>
            <input
              type="number"
              min="0"
              value={newGiveaway.requirements.minLevel}
              onChange={(e) => updateRequirements({ minLevel: parseInt(e.target.value) })}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Min Messages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Messages
            </label>
            <input
              type="number"
              min="0"
              value={newGiveaway.requirements.minMessages}
              onChange={(e) => updateRequirements({ minMessages: parseInt(e.target.value) })}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Required Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Roles
            </label>
            <CustomSelect
              options={roles.map((role) => ({
                value: role.id,
                label: role.name,
                color: role.color,
              }))}
              value={newGiveaway.requirements.requiredRoles[0] || ''}
              onChange={(value) => updateRequirements({ requiredRoles: [value] })}
              placeholder="Select role (optional)"
              searchable={roles.length > 10}
            />
          </div>
        </div>
      </div>

      {/* Bonus Entries Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className={designTokens.typography.h4}>Bonus Entries (Optional)</h3>
          <button
            onClick={addBonusEntry}
            className="px-4 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            + Add Bonus
          </button>
        </div>
        <div className="space-y-3">
          {newGiveaway.bonusEntries.map((bonus: any, index: number) => (
            <div
              key={index}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-1">
                <CustomSelect
                  options={roles.map((role) => ({
                    value: role.id,
                    label: role.name,
                    color: role.color,
                  }))}
                  value={bonus.roleId}
                  onChange={(value) => updateBonusEntry(index, { roleId: value })}
                  placeholder="Select role"
                  searchable={roles.length > 10}
                />
              </div>
              <div className="w-32">
                <input
                  type="number"
                  min="1"
                  value={bonus.entries}
                  onChange={(e) =>
                    updateBonusEntry(index, { entries: parseInt(e.target.value) })
                  }
                  placeholder="Entries"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => removeBonusEntry(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={onCreate}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating...' : 'Create Giveaway'}
        </button>
      </div>
    </div>
  );
}

// History Section Component
function HistorySection({
  giveaways,
  channels,
}: {
  giveaways: Giveaway[];
  channels: Channel[];
}) {
  if (giveaways.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📜</div>
        <h3 className={designTokens.typography.h3 + ' mb-2'}>No giveaway history</h3>
        <p className={designTokens.typography.body + ' text-gray-500'}>
          Past giveaways will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {giveaways.map((giveaway) => (
        <HistoryCard key={giveaway.id} giveaway={giveaway} channels={channels} />
      ))}
    </div>
  );
}

// History Card Component
function HistoryCard({ giveaway, channels }: { giveaway: Giveaway; channels: Channel[] }) {
  const channel = channels.find((ch) => ch.id === giveaway.channelId);
  const statusColor =
    giveaway.status === 'ENDED'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className={designTokens.typography.h4}>{giveaway.prize}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded ${statusColor}`}>
              {giveaway.status}
            </span>
          </div>
          {giveaway.description && (
            <p className={designTokens.typography.small + ' text-gray-500 mb-3'}>
              {giveaway.description}
            </p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Channel:</span>
              <p className="font-medium">#{channel?.name || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-gray-500">Entries:</span>
              <p className="font-medium">{giveaway.entries || 0}</p>
            </div>
            <div>
              <span className="text-gray-500">Winners:</span>
              <p className="font-medium">{giveaway.winnerCount}</p>
            </div>
            <div>
              <span className="text-gray-500">Ended:</span>
              <p className="font-medium">
                {new Date(giveaway.endTime).toLocaleDateString()}
              </p>
            </div>
          </div>
          {giveaway.winners && giveaway.winners.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900 mb-2">Winners:</p>
              <div className="flex flex-wrap gap-2">
                {giveaway.winners.map((winner, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
                  >
                    {winner}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
