'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { designTokens } from '@/styles/design-tokens';
import axios from 'axios';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import CustomSelect from '@/components/CustomSelect';

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface EmbedData {
  title?: string;
  description?: string;
  color?: string;
  footer?: {
    text?: string;
    iconURL?: string;
  };
  thumbnail?: {
    url?: string;
  };
  image?: {
    url?: string;
  };
  author?: {
    name?: string;
    iconURL?: string;
  };
  fields?: EmbedField[];
  timestamp?: boolean;
}

interface WelcomeConfig {
  enabled: boolean;
  channelId?: string;
  messageType: 'text' | 'embed';
  textMessage?: string;
  embedData?: EmbedData;
}

interface GoodbyeConfig {
  enabled: boolean;
  channelId?: string;
  messageType: 'text' | 'embed';
  textMessage?: string;
  embedData?: EmbedData;
}

interface BotConfig {
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: any;
  welcomeLogoUrl?: string;
  goodbyeEnabled: boolean;
  goodbyeChannelId?: string;
}

type TabType = 'welcome' | 'goodbye';

export default function WelcomeConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('welcome');
  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [guildChannels, setGuildChannels] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const [welcomeConfig, setWelcomeConfig] = useState<WelcomeConfig>({
    enabled: false,
    messageType: 'embed',
    embedData: {
      title: 'Welcome!',
      description: 'Welcome to the server {user}!',
      color: '#5865F2',
      timestamp: true,
    },
  });

  const [goodbyeConfig, setGoodbyeConfig] = useState<GoodbyeConfig>({
    enabled: false,
    messageType: 'embed',
    embedData: {
      title: 'Goodbye!',
      description: '{user} has left the server.',
      color: '#ED4245',
      timestamp: true,
    },
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

      const botRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBot(botRes.data);

      const configRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/config`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (configRes.data) {
        // Parse welcome config
        setWelcomeConfig({
          enabled: configRes.data.welcomeEnabled || false,
          channelId: configRes.data.welcomeChannelId,
          messageType: 'embed',
          embedData: configRes.data.welcomeEmbedJson
            ? JSON.parse(configRes.data.welcomeEmbedJson)
            : welcomeConfig.embedData,
        });

        // Parse goodbye config
        setGoodbyeConfig({
          enabled: configRes.data.goodbyeEnabled || false,
          channelId: configRes.data.goodbyeChannelId,
          messageType: 'embed',
          embedData: {
            title: 'Goodbye!',
            description: '{user} has left the server.',
            color: '#ED4245',
            timestamp: true,
          },
        });
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load configuration');
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
      setGuildChannels(channelsRes.data);
    } catch (error) {
      console.error('Error fetching guild data:', error);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const token = Cookies.get('token');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      toast.success('Image uploaded successfully');
      return response.data.url;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to upload image';
      toast.error(message);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = Cookies.get('token');

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/config`,
        {
          welcomeEnabled: welcomeConfig.enabled,
          welcomeChannelId: welcomeConfig.channelId,
          welcomeEmbedJson: JSON.stringify(welcomeConfig.embedData),
          goodbyeEnabled: goodbyeConfig.enabled,
          goodbyeChannelId: goodbyeConfig.channelId,
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

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const textChannels = guildChannels.filter((ch) => ch.type === 0);
  const currentConfig = activeTab === 'welcome' ? welcomeConfig : goodbyeConfig;
  const setCurrentConfig = activeTab === 'welcome' ? setWelcomeConfig : setGoodbyeConfig;

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
            <div className="text-4xl">👋</div>
            <div>
              <h1 className={designTokens.typography.h2}>Welcome & Goodbye</h1>
              <p className={designTokens.typography.body + ' text-gray-500'}>
                Configure welcome and goodbye messages
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
            Select the Discord server to configure channels
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('welcome')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'welcome'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>👋</span>
                <span>Welcome</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('goodbye')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'goodbye'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>👋</span>
                <span>Goodbye</span>
              </span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          <EmbedEditor
            config={currentConfig}
            setConfig={setCurrentConfig}
            textChannels={textChannels}
            onImageUpload={handleImageUpload}
            uploading={uploading}
            tabType={activeTab}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

interface EmbedEditorProps {
  config: WelcomeConfig | GoodbyeConfig;
  setConfig: (config: any) => void;
  textChannels: any[];
  onImageUpload: (file: File) => Promise<string>;
  uploading: boolean;
  tabType: TabType;
}

function EmbedEditor({
  config,
  setConfig,
  textChannels,
  onImageUpload,
  uploading,
  tabType,
}: EmbedEditorProps) {
  const embedData = config.embedData || {};

  const updateEmbed = (updates: Partial<EmbedData>) => {
    setConfig({
      ...config,
      embedData: { ...embedData, ...updates },
    });
  };

  const addField = () => {
    const fields = embedData.fields || [];
    updateEmbed({
      fields: [...fields, { name: 'Field Name', value: 'Field Value', inline: false }],
    });
  };

  const updateField = (index: number, updates: Partial<EmbedField>) => {
    const fields = [...(embedData.fields || [])];
    fields[index] = { ...fields[index], ...updates };
    updateEmbed({ fields });
  };

  const removeField = (index: number) => {
    const fields = embedData.fields?.filter((_, i) => i !== index) || [];
    updateEmbed({ fields });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configuration Panel */}
      <div className="space-y-6">
        {/* Channel Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
          <CustomSelect
            options={textChannels.map((channel) => ({
              value: channel.id,
              label: channel.name,
              icon: '#',
            }))}
            value={config.channelId || ''}
            onChange={(value) => setConfig({ ...config, channelId: value })}
            placeholder="Select a channel (optional)"
            searchable={textChannels.length > 10}
          />
          <p className="mt-1 text-xs text-gray-500">Leave empty to use system channel</p>
        </div>

        {/* Embed Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Embed Configuration</h3>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
              <CustomSelect
                options={textChannels.map((channel) => ({
                  value: channel.id,
                  label: channel.name,
                  icon: '#',
                }))}
                value={config.channelId || ''}
                onChange={(value) => setConfig({ ...config, channelId: value })}
                placeholder="Select a channel (optional)"
                searchable={textChannels.length > 10}
              />
              <p className="mt-1 text-xs text-gray-500">Leave empty to use system channel</p>
            </div>

            {/* Embed Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Embed Configuration</h3>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={embedData.title || ''}
                  onChange={(e) => updateEmbed({ title: e.target.value })}
                  placeholder="Embed title"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={embedData.description || ''}
                  onChange={(e) => updateEmbed({ description: e.target.value })}
                  placeholder="Embed description. Use {user}, {username}, {guild}, {memberCount}"
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Variables: {'{user}'}, {'{username}'}, {'{guild}'}, {'{memberCount}'}
                </p>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={embedData.color || '#5865F2'}
                    onChange={(e) => updateEmbed({ color: e.target.value })}
                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={embedData.color || '#5865F2'}
                    onChange={(e) => updateEmbed({ color: e.target.value })}
                    placeholder="#5865F2"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Author */}
              <div className="border-t pt-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">Author</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={embedData.author?.name || ''}
                    onChange={(e) =>
                      updateEmbed({ author: { ...embedData.author, name: e.target.value } })
                    }
                    placeholder="Author name"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={embedData.author?.iconURL || ''}
                    onChange={(e) =>
                      updateEmbed({ author: { ...embedData.author, iconURL: e.target.value } })
                    }
                    placeholder="Author icon URL"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Thumbnail</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={embedData.thumbnail?.url || ''}
                    onChange={(e) => updateEmbed({ thumbnail: { url: e.target.value } })}
                    placeholder="Thumbnail URL or upload"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <label className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer whitespace-nowrap">
                    {uploading ? 'Uploading...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await onImageUpload(file);
                          updateEmbed({ thumbnail: { url } });
                        }
                      }}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              {/* Image */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Image</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={embedData.image?.url || ''}
                    onChange={(e) => updateEmbed({ image: { url: e.target.value } })}
                    placeholder="Image URL or upload"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <label className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer whitespace-nowrap">
                    {uploading ? 'Uploading...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await onImageUpload(file);
                          updateEmbed({ image: { url } });
                        }
                      }}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t pt-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">Footer</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={embedData.footer?.text || ''}
                    onChange={(e) =>
                      updateEmbed({ footer: { ...embedData.footer, text: e.target.value } })
                    }
                    placeholder="Footer text"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={embedData.footer?.iconURL || ''}
                    onChange={(e) =>
                      updateEmbed({ footer: { ...embedData.footer, iconURL: e.target.value } })
                    }
                    placeholder="Footer icon URL"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="timestamp"
                  checked={embedData.timestamp || false}
                  onChange={(e) => updateEmbed({ timestamp: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="timestamp" className="text-sm text-gray-700">
                  Show timestamp
                </label>
              </div>

              {/* Fields */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-700">Fields</label>
                  <button
                    onClick={addField}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    + Add Field
                  </button>
                </div>
                <div className="space-y-3">
                  {embedData.fields?.map((field, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">
                          Field {index + 1}
                        </span>
                        <button
                          onClick={() => removeField(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateField(index, { name: e.target.value })}
                        placeholder="Field name"
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <textarea
                        value={field.value}
                        onChange={(e) => updateField(index, { value: e.target.value })}
                        placeholder="Field value"
                        rows={2}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={field.inline || false}
                          onChange={(e) => updateField(index, { inline: e.target.checked })}
                          className="w-3 h-3 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-xs text-gray-600">Inline</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Preview Panel */}
      <div className="lg:sticky lg:top-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
              B
            </div>
            <div>
              <div className="text-white font-medium text-sm">Your Bot</div>
              <div className="text-gray-400 text-xs">Today at {new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          {config.enabled ? (
            <EmbedPreview embedData={embedData} />
          ) : (
            <div className="text-center py-12 text-gray-500 text-sm">
              Enable {tabType === 'welcome' ? 'welcome' : 'goodbye'} messages to see preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmbedPreview({ embedData }: { embedData: EmbedData }) {
  const color = embedData.color || '#5865F2';

  return (
    <div
      className="bg-gray-700 rounded overflow-hidden"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="p-4 space-y-2">
        {/* Author */}
        {embedData.author?.name && (
          <div className="flex items-center space-x-2 mb-2">
            {embedData.author.iconURL && (
              <img
                src={embedData.author.iconURL}
                alt="Author"
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-white text-sm font-medium">{embedData.author.name}</span>
          </div>
        )}

        {/* Title */}
        {embedData.title && (
          <div className="text-white font-semibold text-base">{embedData.title}</div>
        )}

        {/* Description */}
        {embedData.description && (
          <div className="text-gray-300 text-sm whitespace-pre-wrap">
            {embedData.description}
          </div>
        )}

        {/* Fields */}
        {embedData.fields && embedData.fields.length > 0 && (
          <div className="grid grid-cols-1 gap-2 mt-2">
            {embedData.fields.map((field, index) => (
              <div
                key={index}
                className={field.inline ? 'inline-block w-1/2' : 'block'}
              >
                <div className="text-white text-xs font-semibold mb-1">{field.name}</div>
                <div className="text-gray-300 text-xs">{field.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Image */}
        {embedData.image?.url && (
          <img
            src={embedData.image.url}
            alt="Embed"
            className="rounded mt-3 max-w-full"
            style={{ maxHeight: '300px' }}
          />
        )}

        {/* Thumbnail */}
        {embedData.thumbnail?.url && (
          <div className="float-right ml-4">
            <img
              src={embedData.thumbnail.url}
              alt="Thumbnail"
              className="rounded"
              style={{ maxWidth: '80px', maxHeight: '80px' }}
            />
          </div>
        )}

        {/* Footer */}
        {(embedData.footer?.text || embedData.timestamp) && (
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
            {embedData.footer?.iconURL && (
              <img
                src={embedData.footer.iconURL}
                alt="Footer"
                className="w-5 h-5 rounded-full"
              />
            )}
            <span>
              {embedData.footer?.text}
              {embedData.footer?.text && embedData.timestamp && ' • '}
              {embedData.timestamp && new Date().toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
