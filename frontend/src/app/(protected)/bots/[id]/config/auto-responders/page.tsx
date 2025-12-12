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

// Interfaces
interface AutoResponderConfig {
  enabled: boolean;
  maxResponders: number;
  allowRegex: boolean;
  logActions: boolean;
}

interface AutoResponder {
  id: string;
  guildId: string;
  trigger: string;
  response: string;
  matchType: 'EXACT' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX';
  caseSensitive: boolean;
  channelIds: string[];
  deleteTrigger: boolean;
  cooldown: number;
  responseType: 'TEXT' | 'EMBED' | 'REACTION';
  embedData?: {
    title?: string;
    description?: string;
    color?: string;
    thumbnail?: string;
    image?: string;
    footer?: string;
  };
  reactionEmoji?: string;
  enabled: boolean;
  uses: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TagConfig {
  enabled: boolean;
  prefix: string;
  allowedRoleIds: string[];
  requireApproval: boolean;
  maxTags: number;
}

interface Tag {
  id: string;
  guildId: string;
  name: string;
  content: string;
  embedData?: {
    title?: string;
    description?: string;
    color?: string;
    thumbnail?: string;
    image?: string;
    footer?: string;
  };
  creatorId: string;
  creatorName: string;
  uses: number;
  isEmbed: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
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

const MATCH_TYPES = [
  { value: 'EXACT', label: 'Exact Match', icon: '🎯', description: 'Trigger must match exactly' },
  { value: 'CONTAINS', label: 'Contains', icon: '🔍', description: 'Message contains trigger' },
  { value: 'STARTS_WITH', label: 'Starts With', icon: '▶️', description: 'Message starts with trigger' },
  { value: 'ENDS_WITH', label: 'Ends With', icon: '⏹️', description: 'Message ends with trigger' },
  { value: 'REGEX', label: 'Regular Expression', icon: '🔧', description: 'Advanced regex matching' },
];

const RESPONSE_TYPES = [
  { value: 'TEXT', label: 'Text Message', icon: '💬' },
  { value: 'EMBED', label: 'Embed Message', icon: '📋' },
  { value: 'REACTION', label: 'Reaction Only', icon: '👍' },
];

export default function AutoRespondersConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'auto-responders' | 'tags'>('auto-responders');

  // Guild data
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // Auto Responders state
  const [responderConfig, setResponderConfig] = useState<AutoResponderConfig>({
    enabled: true,
    maxResponders: 50,
    allowRegex: true,
    logActions: false,
  });
  const [autoResponders, setAutoResponders] = useState<AutoResponder[]>([]);
  const [showResponderModal, setShowResponderModal] = useState(false);
  const [editingResponder, setEditingResponder] = useState<AutoResponder | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);

  // Tags state
  const [tagConfig, setTagConfig] = useState<TagConfig>({
    enabled: true,
    prefix: '!',
    allowedRoleIds: [],
    requireApproval: false,
    maxTags: 100,
  });
  const [tags, setTags] = useState<Tag[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

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
      fetchAutoResponders();
      fetchTags();
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
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
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
    }
  };

  const fetchAutoResponders = async () => {
    try {
      const token = Cookies.get('token');

      // Fetch config
      try {
        const configRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auto-responders/${botId}/config?guildId=${selectedGuild}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (configRes.data.responderConfig) {
          setResponderConfig(configRes.data.responderConfig);
        }
        if (configRes.data.tagConfig) {
          setTagConfig(configRes.data.tagConfig);
        }
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error('Error fetching config:', error);
        }
      }

      // Fetch auto responders
      try {
        const respondersRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auto-responders/${botId}/responders?guildId=${selectedGuild}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAutoResponders(respondersRes.data || []);
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error('Error fetching responders:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching auto responders:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const token = Cookies.get('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auto-responders/${botId}/tags?guildId=${selectedGuild}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTags(response.data || []);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching tags:', error);
      }
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/auto-responders/${botId}/config?guildId=${selectedGuild}`,
        {
          responderConfig,
          tagConfig,
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

  const handleSaveResponder = async (responder: Partial<AutoResponder>) => {
    try {
      const token = Cookies.get('token');

      if (editingResponder?.id) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auto-responders/${botId}/responders/${editingResponder.id}`,
          responder,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Auto responder updated');
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auto-responders/${botId}/responders?guildId=${selectedGuild}`,
          responder,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Auto responder created');
      }

      setShowResponderModal(false);
      setEditingResponder(null);
      fetchAutoResponders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save auto responder');
    }
  };

  const handleDeleteResponder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this auto responder?')) return;

    try {
      const token = Cookies.get('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auto-responders/${botId}/responders/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Auto responder deleted');
      fetchAutoResponders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete auto responder');
    }
  };

  const handleTestResponders = () => {
    if (!testMessage.trim()) {
      toast.error('Please enter a test message');
      return;
    }

    const matches = autoResponders.filter((responder) => {
      if (!responder.enabled) return false;

      const trigger = responder.trigger;
      const message = responder.caseSensitive ? testMessage : testMessage.toLowerCase();
      const compareTrigger = responder.caseSensitive ? trigger : trigger.toLowerCase();

      switch (responder.matchType) {
        case 'EXACT':
          return message === compareTrigger;
        case 'CONTAINS':
          return message.includes(compareTrigger);
        case 'STARTS_WITH':
          return message.startsWith(compareTrigger);
        case 'ENDS_WITH':
          return message.endsWith(compareTrigger);
        case 'REGEX':
          try {
            const regex = new RegExp(trigger, responder.caseSensitive ? '' : 'i');
            return regex.test(testMessage);
          } catch {
            return false;
          }
        default:
          return false;
      }
    });

    setTestResults(matches);
    if (matches.length === 0) {
      toast.info('No auto responders match this message');
    } else {
      toast.success(`Found ${matches.length} matching responder(s)`);
    }
  };

  const handleSaveTag = async (tag: Partial<Tag>) => {
    try {
      const token = Cookies.get('token');

      if (editingTag?.id) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auto-responders/${botId}/tags/${editingTag.id}`,
          tag,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Tag updated');
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auto-responders/${botId}/tags?guildId=${selectedGuild}`,
          tag,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Tag created');
      }

      setShowTagModal(false);
      setEditingTag(null);
      fetchTags();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save tag');
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      const token = Cookies.get('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auto-responders/${botId}/tags/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Tag deleted');
      fetchTags();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete tag');
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
            <div className="text-4xl">🤖</div>
            <div>
              <h1 className={designTokens.typography.h2}>Auto Responders & Tags</h1>
              <p className={designTokens.typography.body + ' text-gray-500'}>
                Configure automated responses and custom tags
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
              active={activeTab === 'auto-responders'}
              onClick={() => setActiveTab('auto-responders')}
              icon="🤖"
              label={`Auto Responders (${autoResponders.length})`}
            />
            <TabButton
              active={activeTab === 'tags'}
              onClick={() => setActiveTab('tags')}
              icon="🏷️"
              label={`Tags (${tags.length})`}
            />
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'auto-responders' ? (
            <AutoRespondersTab
              config={responderConfig}
              setConfig={setResponderConfig}
              responders={autoResponders}
              channels={textChannels}
              onSave={handleSaveConfig}
              onEdit={(responder) => {
                setEditingResponder(responder);
                setShowResponderModal(true);
              }}
              onDelete={handleDeleteResponder}
              onCreate={() => {
                setEditingResponder(null);
                setShowResponderModal(true);
              }}
              testMessage={testMessage}
              setTestMessage={setTestMessage}
              onTest={handleTestResponders}
              testResults={testResults}
              saving={saving}
            />
          ) : (
            <TagsTab
              config={tagConfig}
              setConfig={setTagConfig}
              tags={tags}
              roles={roles}
              onSave={handleSaveConfig}
              onEdit={(tag) => {
                setEditingTag(tag);
                setShowTagModal(true);
              }}
              onDelete={handleDeleteTag}
              onCreate={() => {
                setEditingTag(null);
                setShowTagModal(true);
              }}
              saving={saving}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showResponderModal && (
        <ResponderModal
          responder={editingResponder}
          channels={textChannels}
          onSave={handleSaveResponder}
          onClose={() => {
            setShowResponderModal(false);
            setEditingResponder(null);
          }}
          allowRegex={responderConfig.allowRegex}
        />
      )}

      {showTagModal && (
        <TagModal
          tag={editingTag}
          prefix={tagConfig.prefix}
          onSave={handleSaveTag}
          onClose={() => {
            setShowTagModal(false);
            setEditingTag(null);
          }}
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

// Auto Responders Tab Component
function AutoRespondersTab({
  config,
  setConfig,
  responders,
  channels,
  onSave,
  onEdit,
  onDelete,
  onCreate,
  testMessage,
  setTestMessage,
  onTest,
  testResults,
  saving,
}: {
  config: AutoResponderConfig;
  setConfig: (config: AutoResponderConfig) => void;
  responders: AutoResponder[];
  channels: Channel[];
  onSave: () => void;
  onEdit: (responder: AutoResponder) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  testMessage: string;
  setTestMessage: (message: string) => void;
  onTest: () => void;
  testResults: any[];
  saving: boolean;
}) {
  const updateConfig = (updates: Partial<AutoResponderConfig>) => {
    setConfig({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
        <h3 className={designTokens.typography.h3 + ' mb-4'}>Auto Responder Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="ar-enabled"
              checked={config.enabled}
              onChange={(e) => updateConfig({ enabled: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="ar-enabled" className="text-sm font-medium text-gray-700">
              Enable Auto Responders
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Responders
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={config.maxResponders}
                onChange={(e) => updateConfig({ maxResponders: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="ar-regex"
                checked={config.allowRegex}
                onChange={(e) => updateConfig({ allowRegex: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="ar-regex" className="text-sm font-medium text-gray-700">
                Allow Regex Matching
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="ar-log"
                checked={config.logActions}
                onChange={(e) => updateConfig({ logActions: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="ar-log" className="text-sm font-medium text-gray-700">
                Log Actions
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>

      {/* Test Section */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h3 className={designTokens.typography.h3 + ' mb-4'}>Test Auto Responders</h3>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onTest()}
              placeholder="Type a message to test..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={onTest}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Test
            </button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-purple-900">
                Matching Responders ({testResults.length}):
              </p>
              {testResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-white p-3 rounded-lg border border-purple-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{result.trigger}</p>
                      <p className="text-xs text-gray-500">
                        {result.matchType} • {result.responseType}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      Match
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Responders List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className={designTokens.typography.h3}>Auto Responders</h3>
          <button
            onClick={onCreate}
            disabled={responders.length >= config.maxResponders}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Responder
          </button>
        </div>

        {responders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-6xl mb-4">🤖</div>
            <h4 className={designTokens.typography.h4 + ' mb-2'}>No auto responders</h4>
            <p className={designTokens.typography.body + ' text-gray-500 mb-4'}>
              Create automated responses to specific triggers
            </p>
            <button
              onClick={onCreate}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Create First Responder
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {responders.map((responder) => (
              <ResponderCard
                key={responder.id}
                responder={responder}
                channels={channels}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tags Tab Component
function TagsTab({
  config,
  setConfig,
  tags,
  roles,
  onSave,
  onEdit,
  onDelete,
  onCreate,
  saving,
}: {
  config: TagConfig;
  setConfig: (config: TagConfig) => void;
  tags: Tag[];
  roles: Role[];
  onSave: () => void;
  onEdit: (tag: Tag) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  saving: boolean;
}) {
  const updateConfig = (updates: Partial<TagConfig>) => {
    setConfig({ ...config, ...updates });
  };

  const filteredRoles = roles.filter((role) => role.name !== '@everyone');

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
        <h3 className={designTokens.typography.h3 + ' mb-4'}>Tag Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="tag-enabled"
              checked={config.enabled}
              onChange={(e) => updateConfig({ enabled: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="tag-enabled" className="text-sm font-medium text-gray-700">
              Enable Tags System
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tag Prefix
              </label>
              <input
                type="text"
                value={config.prefix}
                onChange={(e) => updateConfig({ prefix: e.target.value })}
                placeholder="!"
                maxLength={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Example: {config.prefix}tag
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Tags
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={config.maxTags}
                onChange={(e) => updateConfig({ maxTags: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="tag-approval"
                checked={config.requireApproval}
                onChange={(e) => updateConfig({ requireApproval: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="tag-approval" className="text-sm font-medium text-gray-700">
                Require Approval
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed Creation Roles
            </label>
            <CustomMultiSelect
              options={filteredRoles.map((role) => ({
                value: role.id,
                label: role.name,
                color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined,
              }))}
              values={config.allowedRoleIds}
              onChange={(values) => updateConfig({ allowedRoleIds: values })}
              placeholder="All roles can create tags"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to allow everyone. Select roles to restrict tag creation.
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>

      {/* Tags List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className={designTokens.typography.h3}>Custom Tags</h3>
          <button
            onClick={onCreate}
            disabled={tags.length >= config.maxTags}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Tag
          </button>
        </div>

        {tags.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-6xl mb-4">🏷️</div>
            <h4 className={designTokens.typography.h4 + ' mb-2'}>No tags</h4>
            <p className={designTokens.typography.body + ' text-gray-500 mb-4'}>
              Create custom tags with reusable content
            </p>
            <button
              onClick={onCreate}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Create First Tag
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content Preview
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creator
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uses
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-medium text-primary-600">
                          {config.prefix}{tag.name}
                        </span>
                        {!tag.enabled && (
                          <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                            Disabled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-600 truncate max-w-xs">
                        {tag.isEmbed ? tag.embedData?.description || 'Embed' : tag.content}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        tag.isEmbed ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {tag.isEmbed ? 'Embed' : 'Text'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{tag.creatorName}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-900">{tag.uses}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onEdit(tag)}
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(tag.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Responder Card Component
function ResponderCard({
  responder,
  channels,
  onEdit,
  onDelete,
}: {
  responder: AutoResponder;
  channels: Channel[];
  onEdit: (responder: AutoResponder) => void;
  onDelete: (id: string) => void;
}) {
  const matchType = MATCH_TYPES.find((t) => t.value === responder.matchType);
  const responseType = RESPONSE_TYPES.find((t) => t.value === responder.responseType);

  const getChannelNames = () => {
    if (responder.channelIds.length === 0) return 'All channels';
    return responder.channelIds
      .map((id) => channels.find((ch) => ch.id === id)?.name || 'Unknown')
      .join(', ');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-mono text-sm font-medium text-primary-600">
              {responder.trigger}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
              {matchType?.icon} {matchType?.label}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
              {responseType?.icon} {responseType?.label}
            </span>
            {!responder.enabled && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600">
                Disabled
              </span>
            )}
            {responder.caseSensitive && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-orange-100 text-orange-800">
                Case Sensitive
              </span>
            )}
            {responder.deleteTrigger && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                Delete Trigger
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Response:</span>
              <p className="text-gray-900 truncate">
                {responder.responseType === 'REACTION'
                  ? responder.reactionEmoji
                  : responder.responseType === 'EMBED'
                  ? responder.embedData?.title || 'Embed'
                  : responder.response}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Channels:</span>
              <p className="text-gray-900 truncate">{getChannelNames()}</p>
            </div>
            <div>
              <span className="text-gray-500">Cooldown:</span>
              <p className="text-gray-900">{responder.cooldown}s</p>
            </div>
            <div>
              <span className="text-gray-500">Uses:</span>
              <p className="text-gray-900">{responder.uses}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onEdit(responder)}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(responder.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Responder Modal Component
function ResponderModal({
  responder,
  channels,
  onSave,
  onClose,
  allowRegex,
}: {
  responder: AutoResponder | null;
  channels: Channel[];
  onSave: (responder: Partial<AutoResponder>) => void;
  onClose: () => void;
  allowRegex: boolean;
}) {
  const [formData, setFormData] = useState<Partial<AutoResponder>>(
    responder || {
      trigger: '',
      response: '',
      matchType: 'CONTAINS',
      caseSensitive: false,
      channelIds: [],
      deleteTrigger: false,
      cooldown: 0,
      responseType: 'TEXT',
      embedData: {
        title: '',
        description: '',
        color: '#5865F2',
      },
      reactionEmoji: '',
      enabled: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trigger || (!formData.response && formData.responseType !== 'REACTION')) {
      toast.error('Please fill in required fields');
      return;
    }
    if (formData.matchType === 'REGEX' && !allowRegex) {
      toast.error('Regex matching is not allowed');
      return;
    }
    onSave(formData);
  };

  const updateFormData = (updates: Partial<AutoResponder>) => {
    setFormData({ ...formData, ...updates });
  };

  const matchTypes = allowRegex ? MATCH_TYPES : MATCH_TYPES.filter((t) => t.value !== 'REGEX');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className={designTokens.typography.h3}>
            {responder ? 'Edit Auto Responder' : 'Create Auto Responder'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Trigger Settings */}
          <div className="space-y-4">
            <h4 className={designTokens.typography.h4}>Trigger Settings</h4>

            <div>
              <label className={designTokens.typography.label + ' mb-2 block'}>
                Trigger Text <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.trigger}
                onChange={(e) => updateFormData({ trigger: e.target.value })}
                placeholder="hello"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Match Type
                </label>
                <CustomSelect
                  options={matchTypes}
                  value={formData.matchType || 'CONTAINS'}
                  onChange={(value) => updateFormData({ matchType: value as any })}
                  placeholder="Select match type"
                />
              </div>

              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Cooldown (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.cooldown}
                  onChange={(e) => updateFormData({ cooldown: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="case-sensitive"
                  checked={formData.caseSensitive}
                  onChange={(e) => updateFormData({ caseSensitive: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="case-sensitive" className="text-sm font-medium text-gray-700">
                  Case Sensitive
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="delete-trigger"
                  checked={formData.deleteTrigger}
                  onChange={(e) => updateFormData({ deleteTrigger: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="delete-trigger" className="text-sm font-medium text-gray-700">
                  Delete Trigger Message
                </label>
              </div>
            </div>

            <div>
              <label className={designTokens.typography.label + ' mb-2 block'}>
                Restrict to Channels (Optional)
              </label>
              <CustomMultiSelect
                options={channels.map((ch) => ({
                  value: ch.id,
                  label: ch.name,
                  icon: '#',
                }))}
                values={formData.channelIds || []}
                onChange={(values) => updateFormData({ channelIds: values })}
                placeholder="All channels"
              />
            </div>
          </div>

          {/* Response Settings */}
          <div className="space-y-4 border-t pt-6">
            <h4 className={designTokens.typography.h4}>Response Settings</h4>

            <div>
              <label className={designTokens.typography.label + ' mb-2 block'}>
                Response Type
              </label>
              <CustomSelect
                options={RESPONSE_TYPES}
                value={formData.responseType || 'TEXT'}
                onChange={(value) => updateFormData({ responseType: value as any })}
                placeholder="Select response type"
              />
            </div>

            {formData.responseType === 'TEXT' && (
              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Response Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.response}
                  onChange={(e) => updateFormData({ response: e.target.value })}
                  placeholder="Hello! How can I help you?"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            {formData.responseType === 'EMBED' && (
              <div className="space-y-4">
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Embed Title
                  </label>
                  <input
                    type="text"
                    value={formData.embedData?.title || ''}
                    onChange={(e) =>
                      updateFormData({
                        embedData: { ...formData.embedData, title: e.target.value },
                      })
                    }
                    placeholder="Embed Title"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Embed Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.embedData?.description || ''}
                    onChange={(e) =>
                      updateFormData({
                        embedData: { ...formData.embedData, description: e.target.value },
                      })
                    }
                    placeholder="Embed description"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={designTokens.typography.label + ' mb-2 block'}>
                      Embed Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.embedData?.color || '#5865F2'}
                        onChange={(e) =>
                          updateFormData({
                            embedData: { ...formData.embedData, color: e.target.value },
                          })
                        }
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.embedData?.color || '#5865F2'}
                        onChange={(e) =>
                          updateFormData({
                            embedData: { ...formData.embedData, color: e.target.value },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={designTokens.typography.label + ' mb-2 block'}>
                      Footer Text
                    </label>
                    <input
                      type="text"
                      value={formData.embedData?.footer || ''}
                      onChange={(e) =>
                        updateFormData({
                          embedData: { ...formData.embedData, footer: e.target.value },
                        })
                      }
                      placeholder="Footer text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={designTokens.typography.label + ' mb-2 block'}>
                      Thumbnail URL
                    </label>
                    <input
                      type="url"
                      value={formData.embedData?.thumbnail || ''}
                      onChange={(e) =>
                        updateFormData({
                          embedData: { ...formData.embedData, thumbnail: e.target.value },
                        })
                      }
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className={designTokens.typography.label + ' mb-2 block'}>
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.embedData?.image || ''}
                      onChange={(e) =>
                        updateFormData({
                          embedData: { ...formData.embedData, image: e.target.value },
                        })
                      }
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.responseType === 'REACTION' && (
              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Reaction Emoji <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.reactionEmoji || ''}
                  onChange={(e) => updateFormData({ reactionEmoji: e.target.value })}
                  placeholder="👍"
                  maxLength={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Unicode emoji or custom emoji ID
                </p>
              </div>
            )}
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center space-x-3 pt-4 border-t">
            <input
              type="checkbox"
              id="responder-enabled"
              checked={formData.enabled}
              onChange={(e) => updateFormData({ enabled: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="responder-enabled" className="text-sm font-medium text-gray-700">
              Enable this auto responder
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {responder ? 'Update Responder' : 'Create Responder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Tag Modal Component
function TagModal({
  tag,
  prefix,
  onSave,
  onClose,
}: {
  tag: Tag | null;
  prefix: string;
  onSave: (tag: Partial<Tag>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Tag>>(
    tag || {
      name: '',
      content: '',
      isEmbed: false,
      embedData: {
        title: '',
        description: '',
        color: '#5865F2',
      },
      enabled: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || (!formData.content && !formData.isEmbed)) {
      toast.error('Please fill in required fields');
      return;
    }
    if (formData.isEmbed && !formData.embedData?.description) {
      toast.error('Embed description is required');
      return;
    }
    onSave(formData);
  };

  const updateFormData = (updates: Partial<Tag>) => {
    setFormData({ ...formData, ...updates });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className={designTokens.typography.h3}>
            {tag ? 'Edit Tag' : 'Create Tag'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className={designTokens.typography.label + ' mb-2 block'}>
                Tag Name <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500 font-mono">{prefix}</span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="mytag"
                  pattern="[a-z0-9-]+"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="tag-embed"
                checked={formData.isEmbed}
                onChange={(e) => updateFormData({ isEmbed: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="tag-embed" className="text-sm font-medium text-gray-700">
                Use Embed Format
              </label>
            </div>
          </div>

          {/* Content */}
          {!formData.isEmbed ? (
            <div>
              <label className={designTokens.typography.label + ' mb-2 block'}>
                Tag Content <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => updateFormData({ content: e.target.value })}
                placeholder="This is the content that will be sent when the tag is used"
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Embed Title
                </label>
                <input
                  type="text"
                  value={formData.embedData?.title || ''}
                  onChange={(e) =>
                    updateFormData({
                      embedData: { ...formData.embedData, title: e.target.value },
                    })
                  }
                  placeholder="Embed Title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Embed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.embedData?.description || ''}
                  onChange={(e) =>
                    updateFormData({
                      embedData: { ...formData.embedData, description: e.target.value },
                    })
                  }
                  placeholder="Embed description"
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Embed Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.embedData?.color || '#5865F2'}
                      onChange={(e) =>
                        updateFormData({
                          embedData: { ...formData.embedData, color: e.target.value },
                        })
                      }
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.embedData?.color || '#5865F2'}
                      onChange={(e) =>
                        updateFormData({
                          embedData: { ...formData.embedData, color: e.target.value },
                        })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Footer Text
                  </label>
                  <input
                    type="text"
                    value={formData.embedData?.footer || ''}
                    onChange={(e) =>
                      updateFormData({
                        embedData: { ...formData.embedData, footer: e.target.value },
                      })
                    }
                    placeholder="Footer text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Thumbnail URL
                  </label>
                  <input
                    type="url"
                    value={formData.embedData?.thumbnail || ''}
                    onChange={(e) =>
                      updateFormData({
                        embedData: { ...formData.embedData, thumbnail: e.target.value },
                      })
                    }
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.embedData?.image || ''}
                    onChange={(e) =>
                      updateFormData({
                        embedData: { ...formData.embedData, image: e.target.value },
                      })
                    }
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Enable Toggle */}
          <div className="flex items-center space-x-3 pt-4 border-t">
            <input
              type="checkbox"
              id="tag-enabled"
              checked={formData.enabled}
              onChange={(e) => updateFormData({ enabled: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="tag-enabled" className="text-sm font-medium text-gray-700">
              Enable this tag
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {tag ? 'Update Tag' : 'Create Tag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
