'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';

interface Bot {
  id: string;
  name: string;
  status: string;
  clientId?: string;
  config?: BotConfig;
}

interface BotConfig {
  id?: string;
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: {
    title?: string;
    description?: string;
    color?: string;
    thumbnail?: { url?: string };
    footer?: { text?: string };
  };
  welcomeLogoUrl?: string;
  moderationEnabled: boolean;
  autoRoleEnabled: boolean;
  autoRoleId?: string;
  loggingChannelId?: string;
  customCommands?: any;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  channels: DiscordChannel[];
  roles: DiscordRole[];
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
}

export default function BotConfigPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<Bot | null>(null);
  const [botLoading, setBotLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [guildsLoading, setGuildsLoading] = useState(false);
  
  // Bot configuration state
  const [config, setConfig] = useState<BotConfig>({
    welcomeEnabled: false,
    moderationEnabled: false,
    autoRoleEnabled: false,
    customCommands: {},
  });

  // Discord data state
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [guildChannels, setGuildChannels] = useState<Record<string, DiscordChannel[]>>({});
  const [guildRoles, setGuildRoles] = useState<Record<string, DiscordRole[]>>({});

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchBot();
      fetchDiscordGuilds();
    }
  }, [user, botId]);

  const fetchBot = async () => {
    try {
      const response = await botsAPI.getById(botId);
      setBot(response.data);
      if (response.data.config) {
        setConfig(response.data.config);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du bot:', error);
      toast.error('Impossible de charger les informations du bot');
      router.push('/bots');
    } finally {
      setBotLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await botsAPI.updateConfig(botId, config);
      toast.success('Configuration sauvegardée avec succès');
      await fetchBot(); // Refresh data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<BotConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateWelcomeEmbed = (updates: Partial<BotConfig['welcomeEmbedJson']>) => {
    setConfig(prev => ({
      ...prev,
      welcomeEmbedJson: { ...prev.welcomeEmbedJson, ...updates }
    }));
  };

  if (loading || botLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="discord-spinner w-8 h-8 border-4 border-discord-200 border-t-discord-500 rounded-full"></div>
      </div>
    );
  }

  if (!user || !bot) {
    return null;
  }

  const tabs = [
    { id: 'general', name: 'Général', icon: '⚙️' },
    { id: 'welcome', name: 'Bienvenue', icon: '👋' },
    { id: 'moderation', name: 'Modération', icon: '🛡️' },
    { id: 'roles', name: 'Rôles', icon: '🎭' },
    { id: 'channels', name: 'Canaux', icon: '📺' },
    { id: 'advanced', name: 'Avancé', icon: '🔧' },
  ];

  const textChannels = guilds.flatMap(guild => 
    guild.channels.filter(channel => channel.type === 0).map(channel => ({
      ...channel,
      guildName: guild.name
    }))
  );

  const allRoles = guilds.flatMap(guild => 
    guild.roles.filter(role => role.name !== '@everyone').map(role => ({
      ...role,
      guildName: guild.name
    }))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/bots/${botId}`)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Retour
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuration - {bot.name}</h1>
                <p className="text-gray-600">Personnalisez votre bot Discord</p>
              </div>
            </div>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <div className="discord-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Sauvegarde...
                </>
              ) : (
                'Sauvegarder'
              )}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar avec onglets */}
            <div className="lg:w-64">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-discord-100 text-discord-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Contenu principal */}
            <div className="flex-1">
              <div className="card p-6">
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations générales</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Serveurs Discord
                          </label>
                          <div className="space-y-2">
                            {guilds.map((guild) => (
                              <div key={guild.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <p className="font-medium">{guild.name}</p>
                                  <p className="text-sm text-gray-500">ID: {guild.id}</p>
                                </div>
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  Connecté
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'welcome' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Messages de bienvenue</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.welcomeEnabled}
                            onChange={(e) => updateConfig({ welcomeEnabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-discord-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-600"></div>
                        </label>
                      </div>

                      {config.welcomeEnabled && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Canal de bienvenue
                            </label>
                            <select
                              value={config.welcomeChannelId || ''}
                              onChange={(e) => updateConfig({ welcomeChannelId: e.target.value })}
                              className="input-field"
                            >
                              <option value="">Sélectionner un canal</option>
                              {textChannels.map((channel) => (
                                <option key={channel.id} value={channel.id}>
                                  #{channel.name} ({channel.guildName})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Titre du message
                            </label>
                            <input
                              type="text"
                              value={config.welcomeEmbedJson?.title || ''}
                              onChange={(e) => updateWelcomeEmbed({ title: e.target.value })}
                              placeholder="👋 Bienvenue!"
                              className="input-field"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description
                            </label>
                            <textarea
                              value={config.welcomeEmbedJson?.description || ''}
                              onChange={(e) => updateWelcomeEmbed({ description: e.target.value })}
                              placeholder="Bienvenue sur notre serveur {user}! Nous sommes ravis de vous accueillir."
                              rows={3}
                              className="input-field"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Utilisez {'{user}'} pour mentionner l'utilisateur, {'{username}'} pour le nom, {'{guild}'} pour le serveur
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Couleur (hex)
                            </label>
                            <input
                              type="text"
                              value={config.welcomeEmbedJson?.color || '#5865F2'}
                              onChange={(e) => updateWelcomeEmbed({ color: e.target.value })}
                              placeholder="#5865F2"
                              className="input-field"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              URL du logo (optionnel)
                            </label>
                            <input
                              type="url"
                              value={config.welcomeLogoUrl || ''}
                              onChange={(e) => updateConfig({ welcomeLogoUrl: e.target.value })}
                              placeholder="https://example.com/logo.png"
                              className="input-field"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'moderation' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Modération automatique</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.moderationEnabled}
                            onChange={(e) => updateConfig({ moderationEnabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-discord-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-600"></div>
                        </label>
                      </div>

                      {config.moderationEnabled && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Canal de logs
                            </label>
                            <select
                              value={config.loggingChannelId || ''}
                              onChange={(e) => updateConfig({ loggingChannelId: e.target.value })}
                              className="input-field"
                            >
                              <option value="">Sélectionner un canal</option>
                              {textChannels.map((channel) => (
                                <option key={channel.id} value={channel.id}>
                                  #{channel.name} ({channel.guildName})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">Fonctionnalités de modération</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                              <li>• Anti-spam automatique</li>
                              <li>• Détection de liens suspects</li>
                              <li>• Filtrage de contenu inapproprié</li>
                              <li>• Logs d'actions de modération</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'roles' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Attribution automatique de rôles</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.autoRoleEnabled}
                            onChange={(e) => updateConfig({ autoRoleEnabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-discord-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-600"></div>
                        </label>
                      </div>

                      {config.autoRoleEnabled && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Rôle à attribuer automatiquement
                            </label>
                            <select
                              value={config.autoRoleId || ''}
                              onChange={(e) => updateConfig({ autoRoleId: e.target.value })}
                              className="input-field"
                            >
                              <option value="">Sélectionner un rôle</option>
                              {allRoles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  @{role.name} ({role.guildName})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <p className="text-sm text-green-800">
                              Ce rôle sera automatiquement attribué à tous les nouveaux membres qui rejoignent le serveur.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'channels' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Canaux Discord</h3>
                    
                    {guilds.map((guild) => (
                      <div key={guild.id} className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">{guild.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Canaux texte</h5>
                            <div className="space-y-1">
                              {guild.channels.filter(c => c.type === 0).map((channel) => (
                                <div key={channel.id} className="text-sm text-gray-600">
                                  # {channel.name}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Canaux vocaux</h5>
                            <div className="space-y-1">
                              {guild.channels.filter(c => c.type === 2).map((channel) => (
                                <div key={channel.id} className="text-sm text-gray-600">
                                  🔊 {channel.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'advanced' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Configuration avancée</h3>
                    
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ Zone dangereuse</h4>
                        <p className="text-sm text-yellow-800">
                          Ces paramètres peuvent affecter le fonctionnement de votre bot. Modifiez-les uniquement si vous savez ce que vous faites.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Commandes personnalisées (JSON)
                        </label>
                        <textarea
                          value={JSON.stringify(config.customCommands || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              updateConfig({ customCommands: parsed });
                            } catch (error) {
                              // Invalid JSON, don't update
                            }
                          }}
                          rows={6}
                          className="input-field font-mono"
                          placeholder='{"ping": {"response": "Pong!", "description": "Test de connexion"}}'
                        />
                      </div>

                      <div className="flex space-x-3">
                        <button className="btn-secondary">
                          Exporter la configuration
                        </button>
                        <button className="btn-secondary">
                          Importer la configuration
                        </button>
                        <button className="btn-danger">
                          Réinitialiser la configuration
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}