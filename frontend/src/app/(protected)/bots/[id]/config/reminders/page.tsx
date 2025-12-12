'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { designTokens } from '@/styles/design-tokens';
import axios from 'axios';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import CustomSelect from '@/components/CustomSelect';
import { format, formatDistanceToNow, addDays } from 'date-fns';

interface ReminderConfig {
  enabled: boolean;
  maxRemindersPerUser: number;
  maxReminderDuration: number; // in days
  allowRecurring: boolean;
  defaultTimezone: string;
}

interface Reminder {
  id: string;
  userId: string;
  content: string;
  remindAt: Date;
  channelId?: string;
  isRecurring: boolean;
  interval?: number;
  repeatCount?: number;
  timesTriggered: number;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  createdAt: Date;
  messageUrl?: string;
}

interface ScheduledMessage {
  id: string;
  channelId: string;
  creatorId: string;
  content?: string;
  embedJson?: string;
  sendAt?: Date;
  cronExpression?: string;
  isRecurring: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  runCount: number;
  maxRuns?: number;
  status: 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'FAILED';
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Channel {
  id: string;
  name: string;
  type: number;
}

const REPEAT_OPTIONS = [
  { label: 'Once', value: 'once' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export default function RemindersConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'config' | 'pending' | 'scheduled-messages' | 'create-scheduled'
  >('config');

  // Config state
  const [config, setConfig] = useState<ReminderConfig>({
    enabled: true,
    maxRemindersPerUser: 10,
    maxReminderDuration: 365,
    allowRecurring: true,
    defaultTimezone: 'UTC',
  });

  // Reminders state
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);

  // Scheduled messages state
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);

  // Guild data
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [channels, setChannels] = useState<Channel[]>([]);

  // Create scheduled message form
  const [newScheduledMessage, setNewScheduledMessage] = useState({
    channelId: '',
    content: '',
    embedJson: '',
    sendAt: '',
    repeatType: 'once',
    maxRuns: 0,
    timezone: 'UTC',
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

      // Fetch reminder config
      if (selectedGuild) {
        try {
          const configRes = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/reminders/${botId}/config?guildId=${selectedGuild}`,
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

        // Fetch pending reminders
        try {
          const remindersRes = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/reminders?guildId=${selectedGuild}&status=PENDING`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setPendingReminders(remindersRes.data || []);
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error('Error fetching reminders:', error);
          }
        }

        // Fetch scheduled messages
        try {
          const scheduledRes = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/reminders/scheduled-messages?guildId=${selectedGuild}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setScheduledMessages(scheduledRes.data || []);
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error('Error fetching scheduled messages:', error);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load reminder data');
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

      // Re-fetch data for the new guild
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/reminders/${botId}/config?guildId=${selectedGuild}`,
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

  const handleCancelReminder = async (reminderId: string, userId: string) => {
    if (!confirm('Are you sure you want to cancel this reminder?')) return;

    try {
      const token = Cookies.get('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/reminders/${reminderId}/cancel?userId=${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Reminder cancelled successfully');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to cancel reminder';
      toast.error(message);
    }
  };

  const handleCreateScheduledMessage = async () => {
    try {
      if (!newScheduledMessage.channelId) {
        toast.error('Please select a channel');
        return;
      }

      if (!newScheduledMessage.content && !newScheduledMessage.embedJson) {
        toast.error('Please provide message content or embed');
        return;
      }

      if (newScheduledMessage.repeatType === 'once' && !newScheduledMessage.sendAt) {
        toast.error('Please select a date and time');
        return;
      }

      setSaving(true);
      const token = Cookies.get('token');

      const payload: any = {
        guildId: selectedGuild,
        channelId: newScheduledMessage.channelId,
        creatorId: user?.discordId,
        content: newScheduledMessage.content || undefined,
        embedJson: newScheduledMessage.embedJson || undefined,
        timezone: newScheduledMessage.timezone,
      };

      if (newScheduledMessage.repeatType === 'once') {
        payload.sendAt = new Date(newScheduledMessage.sendAt).toISOString();
        payload.isRecurring = false;
      } else {
        payload.isRecurring = true;
        payload.cronExpression = getCronExpression(newScheduledMessage.repeatType);
        payload.maxRuns = newScheduledMessage.maxRuns > 0 ? newScheduledMessage.maxRuns : undefined;
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/reminders/scheduled-messages`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Scheduled message created successfully');
      setNewScheduledMessage({
        channelId: '',
        content: '',
        embedJson: '',
        sendAt: '',
        repeatType: 'once',
        maxRuns: 0,
        timezone: 'UTC',
      });
      setActiveTab('scheduled-messages');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create scheduled message';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const getCronExpression = (repeatType: string): string => {
    switch (repeatType) {
      case 'daily':
        return '0 0 * * *'; // Every day at midnight
      case 'weekly':
        return '0 0 * * 0'; // Every Sunday at midnight
      case 'monthly':
        return '0 0 1 * *'; // First day of every month at midnight
      default:
        return '0 0 * * *';
    }
  };

  const handleDeleteScheduledMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled message?')) return;

    try {
      const token = Cookies.get('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/reminders/scheduled-messages/${messageId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Scheduled message deleted successfully');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete scheduled message';
      toast.error(message);
    }
  };

  const handlePauseScheduledMessage = async (messageId: string) => {
    try {
      const token = Cookies.get('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/reminders/scheduled-messages/${messageId}/pause`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Scheduled message paused successfully');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to pause scheduled message';
      toast.error(message);
    }
  };

  const handleResumeScheduledMessage = async (messageId: string) => {
    try {
      const token = Cookies.get('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/reminders/scheduled-messages/${messageId}/resume`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Scheduled message resumed successfully');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to resume scheduled message';
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
            <div className="text-4xl">⏰</div>
            <div>
              <h1 className={designTokens.typography.h2}>Reminders</h1>
              <p className={designTokens.typography.body + ' text-gray-500'}>
                Manage reminders and scheduled messages for your community
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
              active={activeTab === 'pending'}
              onClick={() => setActiveTab('pending')}
              icon="⏳"
              label={`Pending (${pendingReminders.length})`}
            />
            <TabButton
              active={activeTab === 'scheduled-messages'}
              onClick={() => setActiveTab('scheduled-messages')}
              icon="📅"
              label={`Scheduled Messages (${scheduledMessages.length})`}
            />
            <TabButton
              active={activeTab === 'create-scheduled'}
              onClick={() => setActiveTab('create-scheduled')}
              icon="➕"
              label="Create Scheduled"
            />
          </nav>
        </div>

        <div className="p-6">
          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <ConfigSection
              config={config}
              setConfig={setConfig}
              onSave={handleSaveConfig}
              saving={saving}
            />
          )}

          {/* Pending Reminders Tab */}
          {activeTab === 'pending' && (
            <PendingRemindersSection
              reminders={pendingReminders}
              channels={channels}
              onCancel={handleCancelReminder}
            />
          )}

          {/* Scheduled Messages Tab */}
          {activeTab === 'scheduled-messages' && (
            <ScheduledMessagesSection
              messages={scheduledMessages}
              channels={channels}
              onDelete={handleDeleteScheduledMessage}
              onPause={handlePauseScheduledMessage}
              onResume={handleResumeScheduledMessage}
            />
          )}

          {/* Create Scheduled Message Tab */}
          {activeTab === 'create-scheduled' && (
            <CreateScheduledMessageSection
              newMessage={newScheduledMessage}
              setNewMessage={setNewScheduledMessage}
              channels={textChannels}
              onCreate={handleCreateScheduledMessage}
              saving={saving}
            />
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
  onSave,
  saving,
}: {
  config: ReminderConfig;
  setConfig: (config: ReminderConfig) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const updateConfig = (updates: Partial<ReminderConfig>) => {
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
                Enable Reminders Module
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500 ml-7">
              Allow users to create and receive reminders
            </p>
          </div>

          {/* Max Reminders Per User */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Reminders per User
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={config.maxRemindersPerUser}
              onChange={(e) => updateConfig({ maxRemindersPerUser: parseInt(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum number of active reminders per user (1-50)
            </p>
          </div>

          {/* Max Reminder Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Reminder Duration (days)
            </label>
            <input
              type="number"
              min="1"
              max="730"
              value={config.maxReminderDuration}
              onChange={(e) => updateConfig({ maxReminderDuration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum duration for reminders in days (1-730)
            </p>
          </div>

          {/* Default Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Timezone
            </label>
            <select
              value={config.defaultTimezone}
              onChange={(e) => updateConfig({ defaultTimezone: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reminder Behavior */}
      <div className="border-t pt-6">
        <h3 className={designTokens.typography.h3 + ' mb-4'}>Reminder Behavior</h3>
        <div className="space-y-4">
          {/* Allow Recurring */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="allowRecurring"
              checked={config.allowRecurring}
              onChange={(e) => updateConfig({ allowRecurring: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-1"
            />
            <div>
              <label htmlFor="allowRecurring" className="text-sm font-medium text-gray-700">
                Allow Recurring Reminders
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Users can create reminders that repeat at intervals
              </p>
            </div>
          </div>
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

// Pending Reminders Section Component
function PendingRemindersSection({
  reminders,
  channels,
  onCancel,
}: {
  reminders: Reminder[];
  channels: Channel[];
  onCancel: (id: string, userId: string) => void;
}) {
  if (reminders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⏰</div>
        <h3 className={designTokens.typography.h3 + ' mb-2'}>No pending reminders</h3>
        <p className={designTokens.typography.body + ' text-gray-500'}>
          Users can create reminders using the /remind command
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className={designTokens.typography.h3}>
          Pending Reminders ({reminders.length})
        </h3>
        <p className={designTokens.typography.small + ' text-gray-500 mt-1'}>
          View and manage all pending reminders
        </p>
      </div>
      {reminders.map((reminder) => (
        <ReminderCard
          key={reminder.id}
          reminder={reminder}
          channels={channels}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}

// Reminder Card Component
function ReminderCard({
  reminder,
  channels,
  onCancel,
}: {
  reminder: Reminder;
  channels: Channel[];
  onCancel: (id: string, userId: string) => void;
}) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remindTime = new Date(reminder.remindAt).getTime();
      const diff = remindTime - now;

      if (diff <= 0) {
        setTimeRemaining('Overdue');
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
  }, [reminder.remindAt]);

  const channel = channels.find((ch) => ch.id === reminder.channelId);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              User: {reminder.userId.slice(0, 8)}...
            </span>
            {reminder.isRecurring && (
              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                Recurring
              </span>
            )}
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
              {timeRemaining}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-2 break-words">{reminder.content}</p>
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div>
              <span className="font-medium">Due:</span>{' '}
              {format(new Date(reminder.remindAt), 'MMM dd, yyyy HH:mm')}
            </div>
            {channel && (
              <div>
                <span className="font-medium">Channel:</span> #{channel.name}
              </div>
            )}
            {reminder.isRecurring && (
              <div>
                <span className="font-medium">Triggered:</span> {reminder.timesTriggered} times
              </div>
            )}
            <div>
              <span className="font-medium">Created:</span>{' '}
              {formatDistanceToNow(new Date(reminder.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
        <button
          onClick={() => onCancel(reminder.id, reminder.userId)}
          className="ml-4 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Scheduled Messages Section Component
function ScheduledMessagesSection({
  messages,
  channels,
  onDelete,
  onPause,
  onResume,
}: {
  messages: ScheduledMessage[];
  channels: Channel[];
  onDelete: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📅</div>
        <h3 className={designTokens.typography.h3 + ' mb-2'}>No scheduled messages</h3>
        <p className={designTokens.typography.body + ' text-gray-500'}>
          Create scheduled messages to send at specific times
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className={designTokens.typography.h3}>
          Scheduled Messages ({messages.length})
        </h3>
        <p className={designTokens.typography.small + ' text-gray-500 mt-1'}>
          Manage your scheduled and recurring messages
        </p>
      </div>
      {messages.map((message) => (
        <ScheduledMessageCard
          key={message.id}
          message={message}
          channels={channels}
          onDelete={onDelete}
          onPause={onPause}
          onResume={onResume}
        />
      ))}
    </div>
  );
}

// Scheduled Message Card Component
function ScheduledMessageCard({
  message,
  channels,
  onDelete,
  onPause,
  onResume,
}: {
  message: ScheduledMessage;
  channels: Channel[];
  onDelete: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}) {
  const channel = channels.find((ch) => ch.id === message.channelId);
  const statusColor = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    RUNNING: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    FAILED: 'bg-red-100 text-red-800',
  }[message.status];

  const getRepeatType = (cronExpression?: string) => {
    if (!message.isRecurring) return 'Once';
    if (!cronExpression) return 'Custom';
    if (cronExpression === '0 0 * * *') return 'Daily';
    if (cronExpression === '0 0 * * 0') return 'Weekly';
    if (cronExpression === '0 0 1 * *') return 'Monthly';
    return 'Custom';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${statusColor}`}>
              {message.status}
            </span>
            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
              {getRepeatType(message.cronExpression)}
            </span>
          </div>
          {message.content && (
            <p className="text-sm text-gray-700 mb-2 break-words">{message.content}</p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-gray-500">
            <div>
              <span className="font-medium">Channel:</span> #{channel?.name || 'Unknown'}
            </div>
            {message.nextRunAt && (
              <div>
                <span className="font-medium">Next Run:</span>{' '}
                {format(new Date(message.nextRunAt), 'MMM dd, HH:mm')}
              </div>
            )}
            {message.sendAt && !message.isRecurring && (
              <div>
                <span className="font-medium">Send At:</span>{' '}
                {format(new Date(message.sendAt), 'MMM dd, HH:mm')}
              </div>
            )}
            {message.isRecurring && (
              <div>
                <span className="font-medium">Run Count:</span> {message.runCount}
                {message.maxRuns && ` / ${message.maxRuns}`}
              </div>
            )}
            <div>
              <span className="font-medium">Timezone:</span> {message.timezone}
            </div>
            {message.lastRunAt && (
              <div>
                <span className="font-medium">Last Run:</span>{' '}
                {formatDistanceToNow(new Date(message.lastRunAt), { addSuffix: true })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-3 border-t">
        {message.status === 'SCHEDULED' && (
          <button
            onClick={() => onPause(message.id)}
            className="px-3 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Pause
          </button>
        )}
        {message.status === 'PAUSED' && (
          <button
            onClick={() => onResume(message.id)}
            className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Resume
          </button>
        )}
        <button
          onClick={() => onDelete(message.id)}
          className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// Create Scheduled Message Section Component
function CreateScheduledMessageSection({
  newMessage,
  setNewMessage,
  channels,
  onCreate,
  saving,
}: {
  newMessage: any;
  setNewMessage: (message: any) => void;
  channels: Channel[];
  onCreate: () => void;
  saving: boolean;
}) {
  const updateMessage = (updates: any) => {
    setNewMessage({ ...newMessage, ...updates });
  };

  // Set minimum date to current date/time
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className={designTokens.typography.h3 + ' mb-2'}>Create Scheduled Message</h3>
        <p className={designTokens.typography.small + ' text-gray-500'}>
          Schedule a message to be sent at a specific time or on a recurring schedule
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            value={newMessage.channelId}
            onChange={(value) => updateMessage({ channelId: value })}
            placeholder="Select a channel"
            searchable={channels.length > 10}
          />
        </div>

        {/* Message Content */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Content <span className="text-red-500">*</span>
          </label>
          <textarea
            value={newMessage.content}
            onChange={(e) => updateMessage({ content: e.target.value })}
            placeholder="Enter your message..."
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            {newMessage.content.length} / 2000 characters
          </p>
        </div>

        {/* Repeat Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Repeat <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REPEAT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updateMessage({ repeatType: option.value })}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  newMessage.repeatType === option.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date/Time for One-time Messages */}
        {newMessage.repeatType === 'once' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send At <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={newMessage.sendAt}
              onChange={(e) => updateMessage({ sendAt: e.target.value })}
              min={getMinDateTime()}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Select the date and time to send</p>
          </div>
        )}

        {/* Max Runs for Recurring Messages */}
        {newMessage.repeatType !== 'once' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Runs (Optional)
            </label>
            <input
              type="number"
              min="0"
              value={newMessage.maxRuns}
              onChange={(e) => updateMessage({ maxRuns: parseInt(e.target.value) || 0 })}
              placeholder="0 for unlimited"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave 0 for unlimited or set a maximum number of times to send
            </p>
          </div>
        )}

        {/* Timezone */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
          <select
            value={newMessage.timezone}
            onChange={(e) => updateMessage({ timezone: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Australia/Sydney">Sydney (AEST)</option>
          </select>
        </div>

        {/* Embed JSON (Advanced) */}
        <div className="lg:col-span-2">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2 list-none flex items-center">
              <span className="mr-2 transition-transform group-open:rotate-90">▶</span>
              Advanced: Embed JSON (Optional)
            </summary>
            <textarea
              value={newMessage.embedJson}
              onChange={(e) => updateMessage({ embedJson: e.target.value })}
              placeholder='{"title": "Example", "description": "Your embed description", "color": 3447003}'
              rows={4}
              className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              Provide Discord embed JSON for rich formatting
            </p>
          </details>
        </div>
      </div>

      {/* Info Box */}
      {newMessage.repeatType !== 'once' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">ℹ️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">Recurring Schedule Info</p>
              <p className="text-xs text-blue-700">
                {newMessage.repeatType === 'daily' &&
                  'This message will be sent every day at midnight (00:00) in the selected timezone.'}
                {newMessage.repeatType === 'weekly' &&
                  'This message will be sent every Sunday at midnight (00:00) in the selected timezone.'}
                {newMessage.repeatType === 'monthly' &&
                  'This message will be sent on the first day of every month at midnight (00:00) in the selected timezone.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={onCreate}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating...' : 'Create Scheduled Message'}
        </button>
      </div>
    </div>
  );
}
