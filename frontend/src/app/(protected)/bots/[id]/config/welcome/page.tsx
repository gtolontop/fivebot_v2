'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { designTokens } from '@/styles/design-tokens';
import axios from 'axios';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import CustomSelect from '@/components/CustomSelect';

interface BotConfig {
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: any;
  welcomeLogoUrl?: string;
  goodbyeEnabled: boolean;
  goodbyeChannelId?: string;
  autoRoleEnabled: boolean;
  autoRoleIds?: string;
  loggingChannelId?: string;
}

export default function WelcomeConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<any>(null);
  const [config, setConfig] = useState<BotConfig>({
    welcomeEnabled: false,
    goodbyeEnabled: false,
    autoRoleEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [guildChannels, setGuildChannels] = useState<any[]>([]);
  const [guildRoles, setGuildRoles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [botHighestRole, setBotHighestRole] = useState<number>(0);

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
        setConfig({
          welcomeEnabled: configRes.data.welcomeEnabled || false,
          welcomeChannelId: configRes.data.welcomeChannelId,
          welcomeEmbedJson: configRes.data.welcomeEmbedJson,
          welcomeLogoUrl: configRes.data.welcomeLogoUrl,
          goodbyeEnabled: configRes.data.goodbyeEnabled || false,
          goodbyeChannelId: configRes.data.goodbyeChannelId,
          autoRoleEnabled: configRes.data.autoRoleEnabled || false,
          autoRoleIds: configRes.data.autoRoleIds,
          loggingChannelId: configRes.data.loggingChannelId,
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

      const rolesRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds/${guildId}/roles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const botRole = rolesRes.data.find((r: any) => r.tags?.bot_id === bot?.clientId);
      if (botRole) {
        setBotHighestRole(botRole.position);
      }

      setGuildRoles(rolesRes.data);

      const channelsRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds/${guildId}/channels`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGuildChannels(channelsRes.data);
    } catch (error) {
      console.error('Error fetching guild data:', error);
    }
  };

  const getAssignableRoles = () => {
    return guildRoles
      .filter((role) => {
        if (role.name === '@everyone') return false;
        if (role.managed) return false;
        if (botHighestRole > 0 && role.position >= botHighestRole) return false;
        return true;
      })
      .sort((a, b) => b.position - a.position);
  };

  const handleImageUpload = async (file: File, fieldKey: string) => {
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

      setConfig({ ...config, [fieldKey]: response.data.url });
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to upload image';
      toast.error(message);
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

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const textChannels = guildChannels.filter((ch) => ch.type === 0);
  const selectedRoleIds = config.autoRoleIds ? JSON.parse(config.autoRoleIds) : [];

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
              <h1 className={designTokens.typography.h2}>Welcome System</h1>
              <p className={designTokens.typography.body + ' text-gray-500'}>
                Configure welcome/goodbye messages and auto-roles
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
            Select the Discord server to configure channels and roles
          </p>
        </div>
      )}

      {/* Welcome Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className={designTokens.typography.h3 + ' mb-6 flex items-center space-x-2'}>
          <span>👋</span>
          <span>Welcome Messages</span>
        </h3>

        <div className="space-y-6">
          {/* Welcome Enabled */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enable Welcome Messages
                </label>
                <p className="text-xs text-gray-500">
                  Send a welcome message when someone joins the server
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.welcomeEnabled}
                  onChange={(e) => setConfig({ ...config, welcomeEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {/* Welcome Channel */}
          {config.welcomeEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Channel
                </label>
                <CustomSelect
                  options={textChannels.map((channel) => ({
                    value: channel.id,
                    label: channel.name,
                    icon: '#',
                  }))}
                  value={config.welcomeChannelId || ''}
                  onChange={(value) => setConfig({ ...config, welcomeChannelId: value })}
                  placeholder="Select a channel (optional)"
                  searchable={textChannels.length > 10}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to use the system channel or general
                </p>
              </div>

              {/* Welcome Logo URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Logo URL
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={config.welcomeLogoUrl || ''}
                      onChange={(e) => setConfig({ ...config, welcomeLogoUrl: e.target.value })}
                      placeholder="https://example.com/logo.png or upload below"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <label className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors cursor-pointer">
                      {uploading ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'welcomeLogoUrl');
                        }}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  {config.welcomeLogoUrl && (
                    <div className="relative w-32 h-32 border border-gray-300 rounded-lg overflow-hidden">
                      <img
                        src={config.welcomeLogoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Goodbye Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className={designTokens.typography.h3 + ' mb-6 flex items-center space-x-2'}>
          <span>👋</span>
          <span>Goodbye Messages</span>
        </h3>

        <div className="space-y-6">
          {/* Goodbye Enabled */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enable Goodbye Messages
                </label>
                <p className="text-xs text-gray-500">
                  Send a goodbye message when someone leaves the server
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.goodbyeEnabled}
                  onChange={(e) => setConfig({ ...config, goodbyeEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {/* Goodbye Channel */}
          {config.goodbyeEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Goodbye Channel
              </label>
              <CustomSelect
                options={textChannels.map((channel) => ({
                  value: channel.id,
                  label: channel.name,
                  icon: '#',
                }))}
                value={config.goodbyeChannelId || ''}
                onChange={(value) => setConfig({ ...config, goodbyeChannelId: value })}
                placeholder="Select a channel (optional)"
                searchable={textChannels.length > 10}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to use the welcome channel or system channel
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Role Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className={designTokens.typography.h3 + ' mb-6 flex items-center space-x-2'}>
          <span>🎭</span>
          <span>Auto-Roles</span>
        </h3>

        <div className="space-y-6">
          {/* Auto-Role Enabled */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enable Auto-Roles
                </label>
                <p className="text-xs text-gray-500">
                  Automatically assign roles when someone joins the server
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoRoleEnabled}
                  onChange={(e) => setConfig({ ...config, autoRoleEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {/* Auto-Roles Selection */}
          {config.autoRoleEnabled && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Roles to Assign
              </label>
              <div className="space-y-2">
                {getAssignableRoles().map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={(e) => {
                        let newRoleIds = [...selectedRoleIds];
                        if (e.target.checked) {
                          newRoleIds.push(role.id);
                        } else {
                          newRoleIds = newRoleIds.filter((id) => id !== role.id);
                        }
                        setConfig({ ...config, autoRoleIds: JSON.stringify(newRoleIds) });
                      }}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: `#${role.color?.toString(16).padStart(6, '0') || '99aab5'}`,
                      }}
                    />
                    <span className="text-sm font-medium text-gray-700">{role.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ℹ️ Only assignable roles shown (excluding @everyone, managed roles, and roles above bot)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Logging Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className={designTokens.typography.h3 + ' mb-6 flex items-center space-x-2'}>
          <span>📋</span>
          <span>Logging</span>
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Logging Channel</label>
          <CustomSelect
            options={textChannels.map((channel) => ({
              value: channel.id,
              label: channel.name,
              icon: '#',
            }))}
            value={config.loggingChannelId || ''}
            onChange={(value) => setConfig({ ...config, loggingChannelId: value })}
            placeholder="Select a channel (optional)"
            searchable={textChannels.length > 10}
          />
          <p className="mt-1 text-xs text-gray-500">
            Log member join/leave events to this channel
          </p>
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
