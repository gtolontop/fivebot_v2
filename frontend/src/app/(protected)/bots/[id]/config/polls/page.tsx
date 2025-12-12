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

interface PollConfig {
  enabled: boolean;
  defaultDuration: number;
  maxOptions: number;
  allowMultipleVotes: boolean;
  showVotersList: boolean;
  createRoleIds: string[];
  maxActivePollsPerUser: number;
  embedColor: string;
}

interface Poll {
  id: string;
  question: string;
  description?: string;
  channelId: string;
  messageId?: string;
  options: string[];
  allowMultipleVotes: boolean;
  anonymous: boolean;
  showResultsLive: boolean;
  totalVotes: number;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  creatorId: string;
  createdAt: Date;
  endAt?: Date;
  results?: {
    index: number;
    option: string;
    votes: number;
    percentage: number;
  }[];
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
  { label: '1 hour', value: 3600 },
  { label: '6 hours', value: 21600 },
  { label: '12 hours', value: 43200 },
  { label: '1 day', value: 86400 },
  { label: '3 days', value: 259200 },
  { label: '7 days', value: 604800 },
];

export default function PollsConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'active' | 'create' | 'history'>('config');

  // Config state
  const [config, setConfig] = useState<PollConfig>({
    enabled: true,
    defaultDuration: 86400,
    maxOptions: 10,
    allowMultipleVotes: false,
    showVotersList: false,
    createRoleIds: [],
    maxActivePollsPerUser: 3,
    embedColor: '#5865F2',
  });

  // Polls state
  const [activePolls, setActivePolls] = useState<Poll[]>([]);
  const [historyPolls, setHistoryPolls] = useState<Poll[]>([]);

  // Guild data
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // Create poll form
  const [newPoll, setNewPoll] = useState({
    question: '',
    description: '',
    options: ['', ''],
    duration: 86400,
    channelId: '',
    allowMultipleVotes: false,
    anonymous: false,
    showResultsLive: true,
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

      // Fetch poll config
      if (selectedGuild) {
        try {
          const configRes = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/polls/${botId}/config?guildId=${selectedGuild}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (configRes.data) {
            setConfig({
              ...configRes.data,
              createRoleIds: configRes.data.createRoleIds
                ? JSON.parse(configRes.data.createRoleIds)
                : [],
            });
          }
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error('Error fetching config:', error);
          }
        }

        // Fetch active polls
        try {
          const pollsRes = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/polls/${botId}/polls?guildId=${selectedGuild}&status=ACTIVE`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setActivePolls(pollsRes.data || []);
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error('Error fetching polls:', error);
          }
        }

        // Fetch poll history
        try {
          const historyRes = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/polls/${botId}/polls?guildId=${selectedGuild}&status=ENDED,CANCELLED`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setHistoryPolls(historyRes.data || []);
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error('Error fetching history:', error);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load poll data');
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

      // Re-fetch polls for the new guild
      fetchData();
    } catch (error) {
      console.error('Error fetching guild data:', error);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedGuild) {
      toast.error('Please select a server');
      return;
    }

    try {
      setSaving(true);
      const token = Cookies.get('token');

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/polls/${botId}/config?guildId=${selectedGuild}`,
        {
          ...config,
          createRoleIds: JSON.stringify(config.createRoleIds),
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

  const handleCreatePoll = async () => {
    try {
      if (!newPoll.question.trim()) {
        toast.error('Please enter a poll question');
        return;
      }

      const validOptions = newPoll.options.filter((opt) => opt.trim());
      if (validOptions.length < 2) {
        toast.error('Please provide at least 2 options');
        return;
      }

      if (validOptions.length > config.maxOptions) {
        toast.error(`Maximum ${config.maxOptions} options allowed`);
        return;
      }

      if (!newPoll.channelId) {
        toast.error('Please select a channel');
        return;
      }

      setSaving(true);
      const token = Cookies.get('token');

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/polls/${botId}/polls`,
        {
          ...newPoll,
          options: validOptions,
          guildId: selectedGuild,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Poll created successfully');
      setNewPoll({
        question: '',
        description: '',
        options: ['', ''],
        duration: 86400,
        channelId: '',
        allowMultipleVotes: false,
        anonymous: false,
        showResultsLive: true,
      });
      setActiveTab('active');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create poll';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEndPoll = async (pollId: string) => {
    try {
      const token = Cookies.get('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/polls/${botId}/polls/${pollId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Poll ended successfully');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to end poll';
      toast.error(message);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll?')) return;

    try {
      const token = Cookies.get('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/polls/${botId}/polls/${pollId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Poll deleted successfully');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete poll';
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
            <div className="text-4xl">📊</div>
            <div>
              <h1 className={designTokens.typography.h2}>Polls</h1>
              <p className={designTokens.typography.body + ' text-gray-500'}>
                Create and manage polls for your community
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
              icon="📊"
              label={`Active (${activePolls.length})`}
            />
            <TabButton
              active={activeTab === 'create'}
              onClick={() => setActiveTab('create')}
              icon="➕"
              label="Create Poll"
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
              channels={textChannels}
              onSave={handleSaveConfig}
              saving={saving}
            />
          )}

          {/* Active Polls Tab */}
          {activeTab === 'active' && (
            <ActivePollsSection
              polls={activePolls}
              channels={channels}
              onEnd={handleEndPoll}
              onDelete={handleDeletePoll}
            />
          )}

          {/* Create Poll Tab */}
          {activeTab === 'create' && (
            <CreatePollSection
              newPoll={newPoll}
              setNewPoll={setNewPoll}
              channels={textChannels}
              maxOptions={config.maxOptions}
              onCreate={handleCreatePoll}
              saving={saving}
            />
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <HistorySection polls={historyPolls} channels={channels} />
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
  channels,
  onSave,
  saving,
}: {
  config: PollConfig;
  setConfig: (config: PollConfig) => void;
  roles: Role[];
  channels: Channel[];
  onSave: () => void;
  saving: boolean;
}) {
  const updateConfig = (updates: Partial<PollConfig>) => {
    setConfig({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div>
        <h3 className={designTokens.typography.h3 + ' mb-4'}>General Settings</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enable/Disable */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="enabled"
                checked={config.enabled}
                onChange={(e) => updateConfig({ enabled: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                Enable Polls Module
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500 ml-7">
              Allow users to create and participate in polls
            </p>
          </div>

          {/* Max Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Options per Poll
            </label>
            <input
              type="number"
              min="2"
              max="25"
              value={config.maxOptions}
              onChange={(e) => updateConfig({ maxOptions: parseInt(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Between 2 and 25 options</p>
          </div>

          {/* Default Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Poll Duration (hours)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={Math.floor(config.defaultDuration / 3600)}
              onChange={(e) => updateConfig({ defaultDuration: parseInt(e.target.value) * 3600 })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Default duration for new polls (max 168 hours)</p>
          </div>

          {/* Max Active Polls Per User */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Active Polls per User
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.maxActivePollsPerUser}
              onChange={(e) => updateConfig({ maxActivePollsPerUser: parseInt(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Maximum concurrent active polls per user</p>
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
        </div>
      </div>

      {/* Poll Behavior */}
      <div className="border-t pt-6">
        <h3 className={designTokens.typography.h3 + ' mb-4'}>Poll Behavior</h3>
        <div className="space-y-4">
          {/* Allow Multiple Votes */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="allowMultipleVotes"
              checked={config.allowMultipleVotes}
              onChange={(e) => updateConfig({ allowMultipleVotes: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-1"
            />
            <div>
              <label htmlFor="allowMultipleVotes" className="text-sm font-medium text-gray-700">
                Allow Multiple Votes (Default)
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Users can vote for multiple options by default
              </p>
            </div>
          </div>

          {/* Show Voters List */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="showVotersList"
              checked={config.showVotersList}
              onChange={(e) => updateConfig({ showVotersList: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-1"
            />
            <div>
              <label htmlFor="showVotersList" className="text-sm font-medium text-gray-700">
                Show Voters List
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Display who voted for each option (not applicable for anonymous polls)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="border-t pt-6">
        <h3 className={designTokens.typography.h3 + ' mb-4'}>Permissions</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allowed Create Roles
          </label>
          <CustomMultiSelect
            options={roles.map((role) => ({
              value: role.id,
              label: role.name,
              color: role.color,
            }))}
            value={config.createRoleIds}
            onChange={(values) => updateConfig({ createRoleIds: values })}
            placeholder="All roles can create polls"
            searchable={roles.length > 10}
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty to allow everyone. Select roles to restrict poll creation.
          </p>
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

// Active Polls Section Component
function ActivePollsSection({
  polls,
  channels,
  onEnd,
  onDelete,
}: {
  polls: Poll[];
  channels: Channel[];
  onEnd: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (polls.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className={designTokens.typography.h3 + ' mb-2'}>No active polls</h3>
        <p className={designTokens.typography.body + ' text-gray-500'}>
          Create your first poll to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          channels={channels}
          onEnd={onEnd}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

// Poll Card Component
function PollCard({
  poll,
  channels,
  onEnd,
  onDelete,
}: {
  poll: Poll;
  channels: Channel[];
  onEnd: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    if (!poll.endAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(poll.endAt!).getTime();
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
  }, [poll.endAt]);

  const fetchResults = async () => {
    setLoadingResults(true);
    try {
      const token = Cookies.get('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/polls/${poll.id}/results`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to load poll results');
    } finally {
      setLoadingResults(false);
    }
  };

  const channel = channels.find((ch) => ch.id === poll.channelId);
  const statusColor = poll.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className={designTokens.typography.h4}>{poll.question}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded ${statusColor}`}>
              {poll.status}
            </span>
            {poll.allowMultipleVotes && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                Multiple Choice
              </span>
            )}
            {poll.anonymous && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                Anonymous
              </span>
            )}
          </div>
          {poll.description && (
            <p className={designTokens.typography.small + ' text-gray-500 mb-3'}>
              {poll.description}
            </p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500">Channel:</span>
              <p className="font-medium">#{channel?.name || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Votes:</span>
              <p className="font-medium">{poll.totalVotes || 0}</p>
            </div>
            <div>
              <span className="text-gray-500">Options:</span>
              <p className="font-medium">{poll.options.length}</p>
            </div>
            <div>
              <span className="text-gray-500">Time Remaining:</span>
              <p className="font-medium">{poll.endAt ? timeRemaining : 'No limit'}</p>
            </div>
          </div>

          {/* Poll Options Preview */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <p className="text-xs font-medium text-gray-700 mb-2">Options:</p>
            <div className="grid grid-cols-2 gap-2">
              {poll.options.map((option, index) => (
                <div key={index} className="text-xs text-gray-600 truncate">
                  {index + 1}. {option}
                </div>
              ))}
            </div>
          </div>

          {/* Results Section */}
          {showResults && results && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-blue-900">Current Results</p>
                <button
                  onClick={() => setShowResults(false)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Hide
                </button>
              </div>
              <div className="space-y-2">
                {results.results?.map((result: any) => (
                  <div key={result.index} className="bg-white rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {result.option}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {result.votes} ({result.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${result.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-4 border-t">
        {!showResults && (
          <button
            onClick={fetchResults}
            disabled={loadingResults}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loadingResults ? 'Loading...' : 'View Results'}
          </button>
        )}
        <button
          onClick={() => onEnd(poll.id)}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          End Poll
        </button>
        <button
          onClick={() => onDelete(poll.id)}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// Create Poll Section Component
function CreatePollSection({
  newPoll,
  setNewPoll,
  channels,
  maxOptions,
  onCreate,
  saving,
}: {
  newPoll: any;
  setNewPoll: (poll: any) => void;
  channels: Channel[];
  maxOptions: number;
  onCreate: () => void;
  saving: boolean;
}) {
  const updatePoll = (updates: any) => {
    setNewPoll({ ...newPoll, ...updates });
  };

  const addOption = () => {
    if (newPoll.options.length >= maxOptions) {
      toast.error(`Maximum ${maxOptions} options allowed`);
      return;
    }
    setNewPoll({ ...newPoll, options: [...newPoll.options, ''] });
  };

  const updateOption = (index: number, value: string) => {
    const options = [...newPoll.options];
    options[index] = value;
    setNewPoll({ ...newPoll, options });
  };

  const removeOption = (index: number) => {
    if (newPoll.options.length <= 2) {
      toast.error('At least 2 options are required');
      return;
    }
    const options = newPoll.options.filter((_: any, i: number) => i !== index);
    setNewPoll({ ...newPoll, options });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Poll Question <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={newPoll.question}
            onChange={(e) => updatePoll({ question: e.target.value })}
            placeholder="e.g., What should we do next?"
            maxLength={256}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={newPoll.description}
            onChange={(e) => updatePoll({ description: e.target.value })}
            placeholder="Additional context for the poll"
            rows={2}
            maxLength={512}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Channel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Channel <span className="text-red-500">*</span>
          </label>
          <CustomSelect
            options={channels.map((channel) => ({
              value: channel.id,
              label: channel.name,
              icon: '#',
            }))}
            value={newPoll.channelId}
            onChange={(value) => updatePoll({ channelId: value })}
            placeholder="Select a channel"
            searchable={channels.length > 10}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => updatePoll({ duration: preset.value })}
                className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                  newPoll.duration === preset.value
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
            value={Math.floor(newPoll.duration / 3600)}
            onChange={(e) => updatePoll({ duration: parseInt(e.target.value) * 3600 })}
            placeholder="Custom hours"
            min="1"
            max="168"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">Or enter custom duration in hours</p>
        </div>
      </div>

      {/* Poll Options */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className={designTokens.typography.h4}>Poll Options</h3>
          <button
            onClick={addOption}
            disabled={newPoll.options.length >= maxOptions}
            className="px-4 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Option
          </button>
        </div>
        <div className="space-y-3">
          {newPoll.options.map((option: string, index: number) => (
            <div
              key={index}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span className="text-sm font-medium text-gray-500 w-8">#{index + 1}</span>
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                maxLength={100}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {newPoll.options.length > 2 && (
                <button
                  onClick={() => removeOption(index)}
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
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {newPoll.options.length} / {maxOptions} options
        </p>
      </div>

      {/* Poll Settings */}
      <div className="border-t pt-6">
        <h3 className={designTokens.typography.h4 + ' mb-4'}>Poll Settings</h3>
        <div className="space-y-3">
          {/* Allow Multiple Votes */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="newPollMultipleVotes"
              checked={newPoll.allowMultipleVotes}
              onChange={(e) => updatePoll({ allowMultipleVotes: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-1"
            />
            <div>
              <label htmlFor="newPollMultipleVotes" className="text-sm font-medium text-gray-700">
                Allow Multiple Votes
              </label>
              <p className="text-xs text-gray-500">Users can select multiple options</p>
            </div>
          </div>

          {/* Anonymous Voting */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="newPollAnonymous"
              checked={newPoll.anonymous}
              onChange={(e) => updatePoll({ anonymous: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-1"
            />
            <div>
              <label htmlFor="newPollAnonymous" className="text-sm font-medium text-gray-700">
                Anonymous Voting
              </label>
              <p className="text-xs text-gray-500">Hide voter identities from results</p>
            </div>
          </div>

          {/* Show Results Live */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="newPollShowResults"
              checked={newPoll.showResultsLive}
              onChange={(e) => updatePoll({ showResultsLive: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-1"
            />
            <div>
              <label htmlFor="newPollShowResults" className="text-sm font-medium text-gray-700">
                Show Results Live
              </label>
              <p className="text-xs text-gray-500">
                Display results while voting is active (otherwise show only after poll ends)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={onCreate}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating...' : 'Create Poll'}
        </button>
      </div>
    </div>
  );
}

// History Section Component
function HistorySection({ polls, channels }: { polls: Poll[]; channels: Channel[] }) {
  if (polls.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📜</div>
        <h3 className={designTokens.typography.h3 + ' mb-2'}>No poll history</h3>
        <p className={designTokens.typography.body + ' text-gray-500'}>
          Past polls will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <HistoryCard key={poll.id} poll={poll} channels={channels} />
      ))}
    </div>
  );
}

// History Card Component
function HistoryCard({ poll, channels }: { poll: Poll; channels: Channel[] }) {
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const fetchResults = async () => {
    setLoadingResults(true);
    try {
      const token = Cookies.get('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/polls/${poll.id}/results`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to load poll results');
    } finally {
      setLoadingResults(false);
    }
  };

  const channel = channels.find((ch) => ch.id === poll.channelId);
  const statusColor =
    poll.status === 'ENDED'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className={designTokens.typography.h4}>{poll.question}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded ${statusColor}`}>
              {poll.status}
            </span>
          </div>
          {poll.description && (
            <p className={designTokens.typography.small + ' text-gray-500 mb-3'}>
              {poll.description}
            </p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-3">
            <div>
              <span className="text-gray-500">Channel:</span>
              <p className="font-medium">#{channel?.name || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Votes:</span>
              <p className="font-medium">{poll.totalVotes || 0}</p>
            </div>
            <div>
              <span className="text-gray-500">Options:</span>
              <p className="font-medium">{poll.options.length}</p>
            </div>
            <div>
              <span className="text-gray-500">Ended:</span>
              <p className="font-medium">
                {poll.endAt ? new Date(poll.endAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Results Section */}
          {showResults && results ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-blue-900">Final Results</p>
                <button
                  onClick={() => setShowResults(false)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Hide
                </button>
              </div>
              <div className="space-y-2">
                {results.results?.map((result: any) => (
                  <div key={result.index} className="bg-white rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {result.option}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {result.votes} ({result.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${result.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={fetchResults}
              disabled={loadingResults}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loadingResults ? 'Loading...' : 'View Results'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
