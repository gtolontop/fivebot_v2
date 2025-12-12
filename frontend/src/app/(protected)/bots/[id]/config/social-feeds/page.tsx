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

// Types
type PlatformType = 'YOUTUBE' | 'TWITCH' | 'TWITTER' | 'RSS';
type VideoType = 'ALL' | 'LIVESTREAMS' | 'SHORTS' | 'VIDEOS';

interface SocialFeed {
  id?: string;
  guildId: string;
  botId: string;
  platform: PlatformType;
  enabled: boolean;
  channelId: string;

  // Platform-specific identifiers
  youtubeChannelId?: string;
  twitchUsername?: string;
  twitterUsername?: string;
  rssUrl?: string;

  // YouTube specific
  videoTypes?: VideoType[];
  embedEnabled?: boolean;

  // Twitch specific
  liveNotification?: boolean;
  offlineNotification?: boolean;

  // Twitter specific
  includeRetweets?: boolean;
  includeReplies?: boolean;

  // RSS specific
  customTitle?: string;

  // Common settings
  customMessage?: string;
  pingRoleIds?: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

interface Channel {
  id: string;
  name: string;
  type: number;
}

interface Role {
  id: string;
  name: string;
  color: number;
}

const PLATFORM_ICONS: Record<PlatformType, string> = {
  YOUTUBE: '🎥',
  TWITCH: '💜',
  TWITTER: '🐦',
  RSS: '📡',
};

const PLATFORM_NAMES: Record<PlatformType, string> = {
  YOUTUBE: 'YouTube',
  TWITCH: 'Twitch',
  TWITTER: 'Twitter',
  RSS: 'RSS',
};

const VIDEO_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Videos', description: 'Include all video types' },
  { value: 'LIVESTREAMS', label: 'Livestreams Only', description: 'Only notify about live streams' },
  { value: 'SHORTS', label: 'Shorts Only', description: 'Only notify about YouTube Shorts' },
  { value: 'VIDEOS', label: 'Videos Only', description: 'Only notify about regular videos' },
];

export default function SocialFeedsConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<PlatformType>('YOUTUBE');

  // Guild data
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // Feeds data
  const [feeds, setFeeds] = useState<SocialFeed[]>([]);
  const [editingFeed, setEditingFeed] = useState<SocialFeed | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New feed form
  const [newFeed, setNewFeed] = useState<Partial<SocialFeed>>({
    enabled: true,
    platform: 'YOUTUBE',
    videoTypes: ['ALL'],
    embedEnabled: true,
    liveNotification: true,
    offlineNotification: false,
    includeRetweets: false,
    includeReplies: false,
    customMessage: '',
    pingRoleIds: [],
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
      fetchFeeds(selectedGuild);
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

      const [channelsRes, rolesRes] = await Promise.all([
        axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds/${guildId}/channels`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds/${guildId}/roles`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);

      setChannels(channelsRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Error fetching guild data:', error);
      toast.error('Failed to load server data');
    }
  };

  const fetchFeeds = async (guildId: string) => {
    try {
      const token = Cookies.get('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/social-feeds/${botId}/feeds?guildId=${guildId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeeds(response.data || []);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching feeds:', error);
        toast.error('Failed to load feeds');
      }
      setFeeds([]);
    }
  };

  const handleCreateFeed = async () => {
    if (!selectedGuild) {
      toast.error('Please select a server');
      return;
    }

    // Validation
    if (!newFeed.channelId) {
      toast.error('Please select a notification channel');
      return;
    }

    if (newFeed.platform === 'YOUTUBE' && !newFeed.youtubeChannelId) {
      toast.error('Please enter a YouTube channel URL or ID');
      return;
    }

    if (newFeed.platform === 'TWITCH' && !newFeed.twitchUsername) {
      toast.error('Please enter a Twitch username');
      return;
    }

    if (newFeed.platform === 'TWITTER' && !newFeed.twitterUsername) {
      toast.error('Please enter a Twitter username');
      return;
    }

    if (newFeed.platform === 'RSS' && !newFeed.rssUrl) {
      toast.error('Please enter an RSS feed URL');
      return;
    }

    try {
      setSaving(true);
      const token = Cookies.get('token');

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/social-feeds/${botId}/feeds`,
        {
          ...newFeed,
          guildId: selectedGuild,
          botId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Feed created successfully');
      setShowAddModal(false);
      resetNewFeed();
      await fetchFeeds(selectedGuild);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create feed';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFeed = async (feedId: string, updates: Partial<SocialFeed>) => {
    try {
      const token = Cookies.get('token');

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/social-feeds/${botId}/feeds/${feedId}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Feed updated successfully');
      await fetchFeeds(selectedGuild);
      setEditingFeed(null);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update feed';
      toast.error(message);
    }
  };

  const handleDeleteFeed = async (feedId: string) => {
    if (!confirm('Are you sure you want to delete this feed?')) return;

    try {
      const token = Cookies.get('token');

      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/social-feeds/${botId}/feeds/${feedId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Feed deleted successfully');
      await fetchFeeds(selectedGuild);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete feed';
      toast.error(message);
    }
  };

  const handleTestFeed = async (feedId: string) => {
    try {
      const token = Cookies.get('token');

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/social-feeds/${botId}/feeds/${feedId}/test`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Test notification sent! Check your Discord channel.');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send test notification';
      toast.error(message);
    }
  };

  const handleToggleEnabled = async (feedId: string, enabled: boolean) => {
    await handleUpdateFeed(feedId, { enabled });
  };

  const resetNewFeed = () => {
    setNewFeed({
      enabled: true,
      platform: activeTab,
      videoTypes: ['ALL'],
      embedEnabled: true,
      liveNotification: true,
      offlineNotification: false,
      includeRetweets: false,
      includeReplies: false,
      customMessage: '',
      pingRoleIds: [],
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const textChannels = channels.filter((ch) => ch.type === 0);
  const roleOptions = roles.filter((role) => role.name !== '@everyone');
  const platformFeeds = feeds.filter((feed) => feed.platform === activeTab);

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
            <div className="text-4xl">📡</div>
            <div>
              <h1 className={designTokens.typography.h2}>Social Feeds</h1>
              <p className={designTokens.typography.body + ' text-gray-500'}>
                Monitor and post updates from YouTube, Twitch, Twitter, and RSS feeds
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
            Select the Discord server to configure social feeds
          </p>
        </div>
      )}

      {/* Platform Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['YOUTUBE', 'TWITCH', 'TWITTER', 'RSS'] as PlatformType[]).map((platform) => (
              <TabButton
                key={platform}
                active={activeTab === platform}
                onClick={() => {
                  setActiveTab(platform);
                  setNewFeed({ ...newFeed, platform });
                }}
                icon={PLATFORM_ICONS[platform]}
                label={PLATFORM_NAMES[platform]}
                count={feeds.filter((f) => f.platform === platform).length}
              />
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Add Feed Button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={designTokens.typography.h3}>
                {PLATFORM_NAMES[activeTab]} Feeds
              </h3>
              <p className={designTokens.typography.small + ' text-gray-500 mt-1'}>
                {getPlatformDescription(activeTab)}
              </p>
            </div>
            <button
              onClick={() => {
                resetNewFeed();
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
            >
              <span>+</span>
              <span>Add Feed</span>
            </button>
          </div>

          {/* Feeds List */}
          {platformFeeds.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-6xl mb-4">{PLATFORM_ICONS[activeTab]}</div>
              <h3 className={designTokens.typography.h3 + ' mb-2'}>
                No {PLATFORM_NAMES[activeTab]} feeds configured
              </h3>
              <p className={designTokens.typography.body + ' text-gray-500 mb-4'}>
                Add your first {PLATFORM_NAMES[activeTab]} feed to start monitoring
              </p>
              <button
                onClick={() => {
                  resetNewFeed();
                  setShowAddModal(true);
                }}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add {PLATFORM_NAMES[activeTab]} Feed
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {platformFeeds.map((feed) => (
                <FeedCard
                  key={feed.id}
                  feed={feed}
                  channels={textChannels}
                  roles={roleOptions}
                  onToggleEnabled={handleToggleEnabled}
                  onEdit={setEditingFeed}
                  onDelete={handleDeleteFeed}
                  onTest={handleTestFeed}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Feed Modal */}
      {showAddModal && (
        <FeedModal
          feed={newFeed}
          setFeed={setNewFeed}
          platform={activeTab}
          channels={textChannels}
          roles={roleOptions}
          onSave={handleCreateFeed}
          onClose={() => {
            setShowAddModal(false);
            resetNewFeed();
          }}
          saving={saving}
          isEditing={false}
        />
      )}

      {editingFeed && (
        <FeedModal
          feed={editingFeed}
          setFeed={setEditingFeed}
          platform={editingFeed.platform}
          channels={textChannels}
          roles={roleOptions}
          onSave={() => handleUpdateFeed(editingFeed.id!, editingFeed)}
          onClose={() => setEditingFeed(null)}
          saving={saving}
          isEditing={true}
        />
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count: number;
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
        <span className="text-lg">{icon}</span>
        <span>{label}</span>
        {count > 0 && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
            {count}
          </span>
        )}
      </span>
    </button>
  );
}

// Feed Card Component
function FeedCard({
  feed,
  channels,
  roles,
  onToggleEnabled,
  onEdit,
  onDelete,
  onTest,
}: {
  feed: SocialFeed;
  channels: Channel[];
  roles: Role[];
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onEdit: (feed: SocialFeed) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
}) {
  const channel = channels.find((ch) => ch.id === feed.channelId);
  const feedRoles = roles.filter((role) => feed.pingRoleIds?.includes(role.id));

  const getFeedIdentifier = () => {
    switch (feed.platform) {
      case 'YOUTUBE':
        return feed.youtubeChannelId || 'Unknown';
      case 'TWITCH':
        return `@${feed.twitchUsername}`;
      case 'TWITTER':
        return `@${feed.twitterUsername}`;
      case 'RSS':
        return feed.customTitle || feed.rssUrl || 'Unknown';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-2xl">{PLATFORM_ICONS[feed.platform]}</span>
            <h3 className={designTokens.typography.h4}>{getFeedIdentifier()}</h3>
            <ToggleSwitch
              checked={feed.enabled}
              onChange={(enabled) => onToggleEnabled(feed.id!, enabled)}
              label=""
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mt-4">
            <div>
              <span className="text-gray-500">Channel:</span>
              <p className="font-medium">#{channel?.name || 'Unknown'}</p>
            </div>

            {feed.pingRoleIds && feed.pingRoleIds.length > 0 && (
              <div>
                <span className="text-gray-500">Ping Roles:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {feedRoles.map((role) => (
                    <span
                      key={role.id}
                      className="px-2 py-0.5 text-xs rounded"
                      style={{
                        backgroundColor: role.color
                          ? `#${role.color.toString(16).padStart(6, '0')}33`
                          : '#e5e7eb',
                        color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#374151',
                      }}
                    >
                      @{role.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {feed.platform === 'YOUTUBE' && feed.videoTypes && (
              <div>
                <span className="text-gray-500">Video Types:</span>
                <p className="font-medium">{feed.videoTypes.join(', ')}</p>
              </div>
            )}

            {feed.platform === 'TWITCH' && (
              <div>
                <span className="text-gray-500">Notifications:</span>
                <p className="font-medium">
                  {feed.liveNotification ? '🔴 Live' : ''}
                  {feed.liveNotification && feed.offlineNotification ? ', ' : ''}
                  {feed.offlineNotification ? '⚫ Offline' : ''}
                </p>
              </div>
            )}

            {feed.platform === 'TWITTER' && (
              <div>
                <span className="text-gray-500">Include:</span>
                <p className="font-medium">
                  {feed.includeRetweets ? '🔄 Retweets' : ''}
                  {feed.includeRetweets && feed.includeReplies ? ', ' : ''}
                  {feed.includeReplies ? '💬 Replies' : ''}
                  {!feed.includeRetweets && !feed.includeReplies ? 'Tweets only' : ''}
                </p>
              </div>
            )}
          </div>

          {feed.customMessage && (
            <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
              <span className="text-xs text-gray-500">Custom Message:</span>
              <p className="text-sm text-gray-700 mt-1">{feed.customMessage}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
        <button
          onClick={() => onEdit(feed)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onTest(feed.id!)}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Test
        </button>
        <button
          onClick={() => onDelete(feed.id!)}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// Feed Modal Component
function FeedModal({
  feed,
  setFeed,
  platform,
  channels,
  roles,
  onSave,
  onClose,
  saving,
  isEditing,
}: {
  feed: Partial<SocialFeed>;
  setFeed: (feed: any) => void;
  platform: PlatformType;
  channels: Channel[];
  roles: Role[];
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  isEditing: boolean;
}) {
  const updateFeed = (updates: Partial<SocialFeed>) => {
    setFeed({ ...feed, ...updates });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className={designTokens.typography.h3}>
            {isEditing ? 'Edit' : 'Add'} {PLATFORM_NAMES[platform]} Feed
          </h2>
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

        <div className="p-6 space-y-6">
          {/* Platform-Specific Input */}
          {platform === 'YOUTUBE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube Channel URL or ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={feed.youtubeChannelId || ''}
                onChange={(e) => updateFeed({ youtubeChannelId: e.target.value })}
                placeholder="https://youtube.com/@channel or UC..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the full channel URL or just the channel ID
              </p>
            </div>
          )}

          {platform === 'TWITCH' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twitch Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={feed.twitchUsername || ''}
                onChange={(e) => updateFeed({ twitchUsername: e.target.value })}
                placeholder="username"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the Twitch username (without @)
              </p>
            </div>
          )}

          {platform === 'TWITTER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twitter Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={feed.twitterUsername || ''}
                onChange={(e) => updateFeed({ twitterUsername: e.target.value })}
                placeholder="username"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the Twitter username (without @)
              </p>
            </div>
          )}

          {platform === 'RSS' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RSS Feed URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={feed.rssUrl || ''}
                  onChange={(e) => updateFeed({ rssUrl: e.target.value })}
                  placeholder="https://example.com/feed.xml"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Title (Optional)
                </label>
                <input
                  type="text"
                  value={feed.customTitle || ''}
                  onChange={(e) => updateFeed({ customTitle: e.target.value })}
                  placeholder="My Blog Updates"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Display name for this feed (optional)
                </p>
              </div>
            </>
          )}

          {/* Notification Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Channel <span className="text-red-500">*</span>
            </label>
            <CustomSelect
              options={channels.map((channel) => ({
                value: channel.id,
                label: channel.name,
                icon: '#',
              }))}
              value={feed.channelId || ''}
              onChange={(value) => updateFeed({ channelId: value })}
              placeholder="Select a channel"
              searchable={channels.length > 10}
            />
          </div>

          {/* Ping Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ping Roles (Optional)
            </label>
            <CustomMultiSelect
              options={roles.map((role) => ({
                value: role.id,
                label: role.name,
                color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined,
              }))}
              values={feed.pingRoleIds || []}
              onChange={(values) => updateFeed({ pingRoleIds: values })}
              placeholder="Select roles to ping"
              searchable={roles.length > 10}
            />
            <p className="mt-1 text-xs text-gray-500">
              These roles will be mentioned in notifications
            </p>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Message Template (Optional)
            </label>
            <textarea
              value={feed.customMessage || ''}
              onChange={(e) => updateFeed({ customMessage: e.target.value })}
              placeholder={getMessagePlaceholder(platform)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Available variables: {getAvailableVariables(platform)}
            </p>
          </div>

          {/* Platform-Specific Settings */}
          {platform === 'YOUTUBE' && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900">YouTube Settings</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Types
                </label>
                <div className="space-y-2">
                  {VIDEO_TYPE_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feed.videoTypes?.includes(option.value as VideoType)}
                        onChange={(e) => {
                          const current = feed.videoTypes || [];
                          if (e.target.checked) {
                            updateFeed({ videoTypes: [...current, option.value as VideoType] });
                          } else {
                            updateFeed({
                              videoTypes: current.filter((t) => t !== option.value),
                            });
                          }
                        }}
                        className="w-4 h-4 mt-0.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{option.label}</div>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <ToggleSwitch
                label="Enable Video Embeds"
                checked={feed.embedEnabled ?? true}
                onChange={(checked) => updateFeed({ embedEnabled: checked })}
                description="Show video preview in Discord"
              />
            </div>
          )}

          {platform === 'TWITCH' && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900">Twitch Settings</h4>

              <ToggleSwitch
                label="Live Notifications"
                checked={feed.liveNotification ?? true}
                onChange={(checked) => updateFeed({ liveNotification: checked })}
                description="Notify when streamer goes live"
              />

              <ToggleSwitch
                label="Offline Notifications"
                checked={feed.offlineNotification ?? false}
                onChange={(checked) => updateFeed({ offlineNotification: checked })}
                description="Notify when stream ends"
              />
            </div>
          )}

          {platform === 'TWITTER' && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900">Twitter Settings</h4>

              <ToggleSwitch
                label="Include Retweets"
                checked={feed.includeRetweets ?? false}
                onChange={(checked) => updateFeed({ includeRetweets: checked })}
                description="Post retweets from this user"
              />

              <ToggleSwitch
                label="Include Replies"
                checked={feed.includeReplies ?? false}
                onChange={(checked) => updateFeed({ includeReplies: checked })}
                description="Post replies from this user"
              />
            </div>
          )}

          {/* Enable Toggle */}
          <div className="border-t pt-4">
            <ToggleSwitch
              label="Enable Feed"
              checked={feed.enabled ?? true}
              onChange={(checked) => updateFeed({ enabled: checked })}
              description="Enable or disable this feed"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Feed'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Toggle Switch Component
function ToggleSwitch({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-200'
        }`}
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

// Helper Functions
function getPlatformDescription(platform: PlatformType): string {
  switch (platform) {
    case 'YOUTUBE':
      return 'Monitor YouTube channels for new videos, shorts, and livestreams';
    case 'TWITCH':
      return 'Get notified when Twitch streamers go live or offline';
    case 'TWITTER':
      return 'Post tweets from specific Twitter accounts to your Discord';
    case 'RSS':
      return 'Monitor any RSS feed for new posts and articles';
    default:
      return '';
  }
}

function getMessagePlaceholder(platform: PlatformType): string {
  switch (platform) {
    case 'YOUTUBE':
      return 'New video from {channel}: {title}\n{url}';
    case 'TWITCH':
      return '{streamer} is now live! {title}\n{url}';
    case 'TWITTER':
      return 'New tweet from @{username}:\n{content}\n{url}';
    case 'RSS':
      return 'New post: {title}\n{description}\n{url}';
    default:
      return '';
  }
}

function getAvailableVariables(platform: PlatformType): string {
  switch (platform) {
    case 'YOUTUBE':
      return '{channel}, {title}, {url}, {description}, {thumbnail}';
    case 'TWITCH':
      return '{streamer}, {title}, {game}, {url}, {viewers}, {thumbnail}';
    case 'TWITTER':
      return '{username}, {displayname}, {content}, {url}, {media}';
    case 'RSS':
      return '{title}, {description}, {url}, {author}, {date}';
    default:
      return '';
  }
}
