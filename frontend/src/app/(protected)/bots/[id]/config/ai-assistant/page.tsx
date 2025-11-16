'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { designTokens } from '@/styles/design-tokens';
import axios from 'axios';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

interface AIConfig {
  id?: string;
  botId: string;
  guildId: string;
  enabled: boolean;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  dmSystemPrompt?: string;
  channelPrompts?: { [channelId: string]: string };
  threadPrompts?: { [threadId: string]: string };
  enableVision: boolean;
  includeUserContext: boolean;
  includeChannelContext: boolean;
  respondToEveryone: boolean;
  everyoneContextDepth: number;
  followReplyChains: boolean;
  detectContextType: boolean;
  responseMode: string;
  replyToMentions: boolean;
  replyToReplies: boolean;
  replyToKeywords: boolean;
  keywords?: string[];
  ignorePrefixes?: string[];
  enabledChannels?: string[];
  temperature: number;
  maxTokens: number;
  conversationHistoryLimit: number;
  rateLimitPerUser: number;
  rateLimitPerChannel: number;
  rateLimitWindow: number;
  monthlyTokenLimit?: number;
  useEmbedding: boolean;
  maxDocumentChunks: number;
}

interface Guild {
  id: string;
  name: string;
  icon?: string;
}

interface Channel {
  id: string;
  name: string;
  type: number;
}

const AI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Legacy)' },
  { value: 'gpt-5-nano', label: 'GPT-5 Nano (Beta)' },
];

const RESPONSE_MODES = [
  { value: 'always', label: 'Always Respond' },
  { value: 'mention', label: 'Only When Mentioned' },
  { value: 'keyword', label: 'Keywords Only' },
  { value: 'smart', label: 'Smart (AI Decides)' },
];

export default function AIAssistantConfig() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<any>(null);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchData();
    }
  }, [user, botId]);

  useEffect(() => {
    if (selectedGuild) {
      fetchChannels(selectedGuild);
    }
  }, [selectedGuild]);

  // Initialize config when no config exists but we have a selected guild
  useEffect(() => {
    if (!loading && !config && selectedGuild && guilds.length > 0) {
      setConfig({
        botId,
        guildId: selectedGuild,
        enabled: false,
        apiKey: '',
        model: 'gpt-5-nano',
        enableVision: false,
        includeUserContext: true,
        includeChannelContext: true,
        respondToEveryone: false,
        everyoneContextDepth: 10,
        followReplyChains: true,
        detectContextType: true,
        responseMode: 'mention',
        replyToMentions: true,
        replyToReplies: true,
        replyToKeywords: false,
        temperature: 0.7,
        maxTokens: 2000,
        conversationHistoryLimit: 10,
        rateLimitPerUser: 999,
        rateLimitPerChannel: 9999,
        rateLimitWindow: 60,
        useEmbedding: false,
        maxDocumentChunks: 5,
      });
    }
  }, [loading, config, selectedGuild, guilds, botId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');

      // Fetch bot
      const botRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBot(botRes.data);

      // Fetch guilds where bot is installed
      const guildsRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/discord/bots/${botId}/guilds`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGuilds(guildsRes.data);

      // Try to fetch existing AI config
      try {
        const configRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/ai/config`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Check if we got actual config data
        if (configRes.data && configRes.data.id) {
          setConfig(configRes.data);
          setSelectedGuild(configRes.data.guildId);
        } else {
          // No config exists (empty response or 204)
          setConfig(null);
          if (guildsRes.data.length > 0) {
            setSelectedGuild(guildsRes.data[0].id);
          }
        }
      } catch (error: any) {
        if (error.response?.status === 404 || error.response?.status === 204) {
          // No config yet
          setConfig(null);
          if (guildsRes.data.length > 0) {
            setSelectedGuild(guildsRes.data[0].id);
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load AI configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async (guildId: string) => {
    try {
      const token = Cookies.get('token');
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/discord/guilds/${guildId}/channels`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChannels(res.data.filter((c: Channel) => c.type === 0)); // Text channels only
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const token = Cookies.get('token');

      const payload = {
        ...config,
        guildId: selectedGuild,
      };

      if (config.id) {
        // Update
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/ai/config`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('AI configuration updated successfully');
      } else {
        // Create
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/ai/config`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setConfig(res.data);
        toast.success('AI configuration created successfully');
      }

      await fetchData();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: string, value: any) => {
    setConfig((prev) => ({
      ...prev!,
      [field]: value,
    }));
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={designTokens.typography.h2}>AI Assistant Configuration</h1>
          <p className={designTokens.typography.body + ' text-gray-500 mt-1'}>
            Configure your AI assistant with advanced contextual understanding
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Guild Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className={designTokens.typography.label}>Select Server</label>
        <select
          value={selectedGuild}
          onChange={(e) => setSelectedGuild(e.target.value)}
          className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {guilds.map((guild) => (
            <option key={guild.id} value={guild.id}>
              {guild.name}
            </option>
          ))}
        </select>
      </div>

      {/* Basic Settings */}
      <Section title="Basic Settings" icon="⚙️">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Toggle
            label="Enable AI Assistant"
            checked={config.enabled}
            onChange={(val) => updateConfig('enabled', val)}
            description="Enable or disable the AI assistant"
          />

          <Field label="OpenAI API Key" required>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => updateConfig('apiKey', e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </Field>

          <Field label="AI Model">
            <select
              value={config.model}
              onChange={(e) => updateConfig('model', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {AI_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Response Mode">
            <select
              value={config.responseMode}
              onChange={(e) => updateConfig('responseMode', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {RESPONSE_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Response Behavior */}
      <Section title="Response Behavior" icon="💬">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Toggle
            label="Reply to Mentions"
            checked={config.replyToMentions}
            onChange={(val) => updateConfig('replyToMentions', val)}
            description="Respond when the bot is mentioned"
          />

          <Toggle
            label="Reply to Replies"
            checked={config.replyToReplies}
            onChange={(val) => updateConfig('replyToReplies', val)}
            description="Respond when someone replies to the bot"
          />

          <Toggle
            label="Reply to Keywords"
            checked={config.replyToKeywords}
            onChange={(val) => updateConfig('replyToKeywords', val)}
            description="Respond to specific keywords"
          />
        </div>

        {config.replyToKeywords && (
          <div className="mt-4">
            <Field label="Keywords (comma-separated)">
              <input
                type="text"
                value={config.keywords?.join(', ') || ''}
                onChange={(e) =>
                  updateConfig(
                    'keywords',
                    e.target.value.split(',').map((k) => k.trim()).filter(Boolean)
                  )
                }
                placeholder="help, support, question"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </Field>
          </div>
        )}

        <div className="mt-4">
          <Field label="Ignore Prefixes (comma-separated)">
            <input
              type="text"
              value={config.ignorePrefixes?.join(', ') || ''}
              onChange={(e) =>
                updateConfig(
                  'ignorePrefixes',
                  e.target.value.split(',').map((p) => p.trim()).filter(Boolean)
                )
              }
              placeholder="!, /, ."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Messages starting with these will be ignored</p>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Enabled Channels (leave empty for all)">
            <select
              multiple
              value={config.enabledChannels || []}
              onChange={(e) =>
                updateConfig(
                  'enabledChannels',
                  Array.from(e.target.selectedOptions, (option) => option.value)
                )
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              size={5}
            >
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple channels</p>
          </Field>
        </div>
      </Section>

      {/* Contextual Prompts */}
      <Section title="Contextual System Prompts" icon="🎯">
        <div className="space-y-4">
          <Field label="Default System Prompt">
            <textarea
              value={config.systemPrompt || ''}
              onChange={(e) => updateConfig('systemPrompt', e.target.value)}
              placeholder="You are a helpful AI assistant..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Used in channels and threads (unless overridden)</p>
          </Field>

          <Field label="DM System Prompt">
            <textarea
              value={config.dmSystemPrompt || ''}
              onChange={(e) => updateConfig('dmSystemPrompt', e.target.value)}
              placeholder="You are a friendly assistant in a private conversation..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Used specifically for DMs with users</p>
          </Field>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Coming Soon:</strong> Per-channel and per-thread custom prompts will be available in the dashboard.
              For now, you can set these via the API.
            </p>
          </div>
        </div>
      </Section>

      {/* Vision & Context */}
      <Section title="Vision & Context Understanding" icon="👁️">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Toggle
            label="Enable Vision"
            checked={config.enableVision}
            onChange={(val) => updateConfig('enableVision', val)}
            description="Allow AI to read and analyze images (requires GPT-4o)"
          />

          <Toggle
            label="Include User Context"
            checked={config.includeUserContext}
            onChange={(val) => updateConfig('includeUserContext', val)}
            description="Include username, display name, and roles in prompts"
          />

          <Toggle
            label="Include Channel Context"
            checked={config.includeChannelContext}
            onChange={(val) => updateConfig('includeChannelContext', val)}
            description="Include server name, channel name, and thread info"
          />

          <Field label="Conversation History Limit">
            <input
              type="number"
              value={config.conversationHistoryLimit}
              onChange={(e) => updateConfig('conversationHistoryLimit', parseInt(e.target.value))}
              min={1}
              max={50}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Number of previous messages to include</p>
          </Field>
        </div>
      </Section>

      {/* @everyone Settings */}
      <Section title="@everyone Context Analysis" icon="📢">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Toggle
            label="Respond to @everyone"
            checked={config.respondToEveryone}
            onChange={(val) => updateConfig('respondToEveryone', val)}
            description="Respond when @everyone is mentioned (analyzes context)"
          />

          <Field label="Context Depth">
            <input
              type="number"
              value={config.everyoneContextDepth}
              onChange={(e) => updateConfig('everyoneContextDepth', parseInt(e.target.value))}
              min={1}
              max={50}
              disabled={!config.respondToEveryone}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
            />
            <p className="text-sm text-gray-500 mt-1">Messages to analyze before @everyone ping</p>
          </Field>

          <Toggle
            label="Follow Reply Chains"
            checked={config.followReplyChains}
            onChange={(val) => updateConfig('followReplyChains', val)}
            description="Follow conversation threads when analyzing context"
            disabled={!config.respondToEveryone}
          />

          <Toggle
            label="Detect Context Type"
            checked={config.detectContextType}
            onChange={(val) => updateConfig('detectContextType', val)}
            description="Identify if it's an announcement, giveaway, question, etc."
            disabled={!config.respondToEveryone}
          />
        </div>

        {config.respondToEveryone && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> The AI will analyze messages BEFORE the @everyone ping to understand the full context
              (announcements, giveaways, welcomes, questions, etc.) and respond appropriately.
            </p>
          </div>
        )}
      </Section>

      {/* Rate Limiting */}
      <Section title="Rate Limiting" icon="⏱️">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Rate Limit Per User">
            <input
              type="number"
              value={config.rateLimitPerUser}
              onChange={(e) => updateConfig('rateLimitPerUser', parseInt(e.target.value))}
              min={1}
              max={9999}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Messages per user per window (0 = unlimited)</p>
          </Field>

          <Field label="Rate Limit Per Channel">
            <input
              type="number"
              value={config.rateLimitPerChannel}
              onChange={(e) => updateConfig('rateLimitPerChannel', parseInt(e.target.value))}
              min={1}
              max={9999}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Messages per channel per window (0 = unlimited)</p>
          </Field>

          <Field label="Rate Limit Window (seconds)">
            <input
              type="number"
              value={config.rateLimitWindow}
              onChange={(e) => updateConfig('rateLimitWindow', parseInt(e.target.value))}
              min={1}
              max={3600}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Time window for rate limits</p>
          </Field>

          <Field label="Monthly Token Limit (optional)">
            <input
              type="number"
              value={config.monthlyTokenLimit || ''}
              onChange={(e) =>
                updateConfig('monthlyTokenLimit', e.target.value ? parseInt(e.target.value) : null)
              }
              placeholder="Leave empty for unlimited"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Max tokens per user per month (cost control)</p>
          </Field>
        </div>
      </Section>

      {/* Advanced Settings */}
      <div className="bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🔧</span>
            <h3 className={designTokens.typography.h3}>Advanced Settings</h3>
          </div>
          <svg
            className={`w-5 h-5 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="p-6 border-t border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Temperature">
                <input
                  type="number"
                  value={config.temperature}
                  onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">0 = focused, 2 = creative (default: 0.7)</p>
              </Field>

              <Field label="Max Tokens">
                <input
                  type="number"
                  value={config.maxTokens}
                  onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
                  min={100}
                  max={4000}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">Maximum response length</p>
              </Field>

              <Toggle
                label="Use Embeddings"
                checked={config.useEmbedding}
                onChange={(val) => updateConfig('useEmbedding', val)}
                description="Enable document search with embeddings"
              />

              <Field label="Max Document Chunks">
                <input
                  type="number"
                  value={config.maxDocumentChunks}
                  onChange={(e) => updateConfig('maxDocumentChunks', parseInt(e.target.value))}
                  min={1}
                  max={20}
                  disabled={!config.useEmbedding}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                />
                <p className="text-sm text-gray-500 mt-1">Document chunks to include in context</p>
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* Save Button (bottom) */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

// Helper Components

interface SectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <span className="text-2xl">{icon}</span>
        <h3 className={designTokens.typography.h3}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, required, children }: FieldProps) {
  return (
    <div>
      <label className={designTokens.typography.label}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  description?: string;
  disabled?: boolean;
}

function Toggle({ label, checked, onChange, description, disabled }: ToggleProps) {
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="flex items-center space-x-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            checked ? 'bg-primary-600' : 'bg-gray-200'
          } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              checked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <div>
          <label className={designTokens.typography.label + ' cursor-pointer'} onClick={() => !disabled && onChange(!checked)}>
            {label}
          </label>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      </div>
    </div>
  );
}
