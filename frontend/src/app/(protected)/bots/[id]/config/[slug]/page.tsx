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

interface Module {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription?: string;
  category: string;
  icon: string;
  isCore: boolean;
  configSchema?: string;
  features?: string;
}

interface BotModule {
  id: string;
  moduleId: string;
  enabled: boolean;
  config: string;
  module: Module;
}

export default function ModuleConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;
  const moduleSlug = params?.slug as string;

  const [bot, setBot] = useState<any>(null);
  const [botModule, setBotModule] = useState<BotModule | null>(null);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [guildRoles, setGuildRoles] = useState<any[]>([]);
  const [guildChannels, setGuildChannels] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [botHighestRole, setBotHighestRole] = useState<number>(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && botId && moduleSlug) {
      fetchData();
      fetchGuilds();
    }
  }, [user, botId, moduleSlug]);

  useEffect(() => {
    if (selectedGuild) {
      fetchGuildData(selectedGuild);
    }
  }, [selectedGuild]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');

      // Fetch bot
      const botRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBot(botRes.data);

      // Fetch bot modules
      const modulesRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/modules/bots/${botId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Find the specific module
      const module = modulesRes.data.find((m: BotModule) => m.module.slug === moduleSlug);

      if (!module) {
        toast.error('Module not found or not installed');
        router.push(`/bots/${botId}/config`);
        return;
      }

      setBotModule(module);

      // Parse existing config
      if (module.config) {
        try {
          setConfig(JSON.parse(module.config));
        } catch (e) {
          setConfig({});
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load module configuration');
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

      // Fetch roles
      const rolesRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds/${guildId}/roles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Find bot's highest role position
      const botRole = rolesRes.data.find((r: any) => r.tags?.bot_id === bot?.clientId);
      if (botRole) {
        setBotHighestRole(botRole.position);
      }

      setGuildRoles(rolesRes.data);

      // Fetch channels
      const channelsRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds/${guildId}/channels`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGuildChannels(channelsRes.data);
    } catch (error) {
      console.error('Error fetching guild data:', error);
    }
  };

  const getAllRolesWithStatus = () => {
    return guildRoles
      .filter((role) => role.name !== '@everyone') // Toujours exclure @everyone
      .map((role) => {
        const isManaged = role.managed;
        const isTooHigh = botHighestRole > 0 && role.position >= botHighestRole;
        const isAssignable = !isManaged && !isTooHigh;

        return {
          ...role,
          isAssignable,
          disabledReason: !isAssignable
            ? (isManaged ? 'Managed role (bot/integration/booster)' : 'Role is above bot\'s highest role')
            : undefined,
        };
      })
      .sort((a, b) => b.position - a.position); // Trier par position
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/modules/bots/${botId}/${botModule?.moduleId}/config`,
        { config },
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

  if (!botModule) {
    return null;
  }

  const configSchema = botModule.module.configSchema
    ? JSON.parse(botModule.module.configSchema)
    : {};
  const features = botModule.module.features ? JSON.parse(botModule.module.features) : [];

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
            <div className="text-4xl">{botModule.module.icon}</div>
            <div>
              <h1 className={designTokens.typography.h2}>{botModule.module.name}</h1>
              <p className={designTokens.typography.body + ' text-gray-500'}>
                {botModule.module.description}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`px-3 py-1 text-sm font-medium rounded ${
              botModule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {botModule.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Module Info */}
      {botModule.module.longDescription && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div
            className="prose prose-sm max-w-none text-blue-900"
            dangerouslySetInnerHTML={{ __html: botModule.module.longDescription.replace(/\n/g, '<br/>') }}
          />
        </div>
      )}

      {/* Features */}
      {features.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className={designTokens.typography.h4 + ' mb-4'}>Features</h3>
          <ul className="space-y-2">
            {features.map((feature: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="text-green-500 mt-1">✓</span>
                <span className={designTokens.typography.body}>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Guild Selector */}
      {guilds.length > 0 && Object.keys(configSchema).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-blue-900 mb-2">
            Select Server
          </label>
          <CustomSelect
            options={guilds.map(guild => ({
              value: guild.id,
              label: guild.name,
              icon: '🌐'
            }))}
            value={selectedGuild}
            onChange={setSelectedGuild}
            placeholder="Select a server"
            searchable={guilds.length > 5}
          />
          <p className="mt-2 text-xs text-blue-700">
            Select the Discord server to configure roles and channels for this module
          </p>
        </div>
      )}

      {/* Configuration Form */}
      {Object.keys(configSchema).length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className={designTokens.typography.h4 + ' mb-6'}>Configuration</h3>
          <div className="space-y-6">
            {Object.entries(configSchema).map(([key, schema]: [string, any]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {schema.label}
                  {schema.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {schema.type === 'boolean' && (
                  <div className="flex items-center space-x-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config[key] ?? schema.default ?? false}
                        onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                    <span className={`text-sm font-medium ${config[key] ?? schema.default ? 'text-primary-600' : 'text-gray-500'}`}>
                      {config[key] ?? schema.default ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                )}

                {schema.type === 'string' && !key.toLowerCase().includes('url') && (
                  <input
                    type="text"
                    value={config[key] ?? schema.default ?? ''}
                    onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                    placeholder={schema.default}
                    maxLength={schema.maxLength}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}

                {schema.type === 'string' && key.toLowerCase().includes('url') && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={config[key] ?? schema.default ?? ''}
                        onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                        placeholder="https://example.com/image.png or upload below"
                        maxLength={schema.maxLength}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <label className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors cursor-pointer">
                        {uploading ? 'Uploading...' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, key);
                          }}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    </div>
                    {config[key] && (
                      <div className="relative w-32 h-32 border border-gray-300 rounded-lg overflow-hidden">
                        <img
                          src={config[key]}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3EInvalid%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {schema.type === 'text' && (
                  <textarea
                    value={config[key] ?? schema.default ?? ''}
                    onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                    placeholder={schema.default}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}

                {schema.type === 'number' && (
                  <input
                    type="number"
                    value={config[key] ?? schema.default ?? 0}
                    onChange={(e) => setConfig({ ...config, [key]: parseInt(e.target.value) })}
                    min={schema.min}
                    max={schema.max}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}

                {schema.type === 'color' && (
                  <input
                    type="color"
                    value={config[key] ?? schema.default ?? '#5865F2'}
                    onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                    className="w-20 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                )}

                {schema.type === 'channel' && (
                  <CustomSelect
                    options={guildChannels
                      .filter((ch) => !schema.channelType || ch.type === (schema.channelType === 'category' ? 4 : 0))
                      .map((channel) => ({
                        value: channel.id,
                        label: channel.name,
                        icon: channel.type === 4 ? '📁' : channel.type === 0 ? '#' : '🔊'
                      }))}
                    value={config[key] ?? ''}
                    onChange={(value) => setConfig({ ...config, [key]: value })}
                    placeholder="Select a channel"
                    searchable={guildChannels.length > 10}
                  />
                )}

                {schema.type === 'select' && (
                  <CustomSelect
                    options={schema.options?.map((option: string) => ({
                      value: option,
                      label: option
                    })) || []}
                    value={config[key] ?? schema.default ?? ''}
                    onChange={(value) => setConfig({ ...config, [key]: value })}
                    placeholder="Select an option"
                  />
                )}

                {schema.type === 'roles' && !schema.multiple && (
                  <div className="space-y-2">
                    <CustomSelect
                      options={getAllRolesWithStatus().map((role) => ({
                        value: role.id,
                        label: role.name,
                        color: `#${role.color?.toString(16).padStart(6, '0') || '99aab5'}`,
                        description: role.disabledReason,
                        disabled: !role.isAssignable,
                      }))}
                      value={config[key] ?? ''}
                      onChange={(value) => setConfig({ ...config, [key]: value })}
                      placeholder="Select a role"
                      searchable={guildRoles.length > 10}
                    />
                    <p className="text-xs text-gray-500">
                      ℹ️ Grayed roles cannot be assigned (managed roles, integrations, or above bot)
                    </p>
                  </div>
                )}

                {schema.type === 'roles' && schema.multiple && (
                  <div className="space-y-2">
                    <CustomMultiSelect
                      options={getAllRolesWithStatus().map((role) => ({
                        value: role.id,
                        label: role.name,
                        color: `#${role.color?.toString(16).padStart(6, '0') || '99aab5'}`,
                        description: role.disabledReason,
                        disabled: !role.isAssignable,
                      }))}
                      values={config[key] || []}
                      onChange={(values) => setConfig({ ...config, [key]: values })}
                      placeholder="Select roles"
                    />
                    <p className="text-xs text-gray-500">
                      ℹ️ Grayed roles cannot be assigned (managed roles, integrations, or above bot)
                    </p>
                  </div>
                )}

                {schema.type === 'array' && (
                  <div className="space-y-3">
                    {(config[key] || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1 space-y-3">
                          {schema.itemSchema && Object.entries(schema.itemSchema).map(([itemKey, itemSchema]: [string, any]) => (
                            <div key={itemKey}>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                {itemKey}
                              </label>
                              {itemSchema.type === 'select' ? (
                                <select
                                  value={item[itemKey] ?? itemSchema.options?.[0] ?? ''}
                                  onChange={(e) => {
                                    const newArray = [...(config[key] || [])];
                                    newArray[idx] = { ...newArray[idx], [itemKey]: e.target.value };
                                    setConfig({ ...config, [key]: newArray });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                  {itemSchema.options?.map((option: string) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={item[itemKey] ?? ''}
                                  onChange={(e) => {
                                    const newArray = [...(config[key] || [])];
                                    newArray[idx] = { ...newArray[idx], [itemKey]: e.target.value };
                                    setConfig({ ...config, [key]: newArray });
                                  }}
                                  maxLength={itemSchema.maxLength}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            const newArray = [...(config[key] || [])];
                            newArray.splice(idx, 1);
                            setConfig({ ...config, [key]: newArray });
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newItem: any = {};
                        if (schema.itemSchema) {
                          Object.entries(schema.itemSchema).forEach(([itemKey, itemSchema]: [string, any]) => {
                            newItem[itemKey] = itemSchema.options?.[0] ?? '';
                          });
                        }
                        setConfig({ ...config, [key]: [...(config[key] || []), newItem] });
                      }}
                      className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
                    >
                      + Add {schema.label || 'Item'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">⚙️</div>
          <h3 className={designTokens.typography.h4 + ' mb-2'}>No Configuration Required</h3>
          <p className={designTokens.typography.body + ' text-gray-500'}>
            This module works automatically once enabled. No additional configuration is needed.
          </p>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-xl">💡</div>
          <div>
            <h4 className="font-medium text-yellow-900 mb-1">Need Help?</h4>
            <p className="text-sm text-yellow-800">
              Make sure to enable the module in the{' '}
              <button
                onClick={() => router.push(`/bots/${botId}/config/modules`)}
                className="underline hover:text-yellow-900"
              >
                Modules page
              </button>{' '}
              for changes to take effect.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
