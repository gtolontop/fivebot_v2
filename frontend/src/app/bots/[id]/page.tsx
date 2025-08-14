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
  isActive: boolean;
  createdAt: string;
  clientId?: string;
  prefix: string;
  config?: {
    welcomeEnabled: boolean;
    welcomeChannelId?: string;
    moderationEnabled: boolean;
    autoRoleEnabled: boolean;
    autoRoleId?: string;
    loggingChannelId?: string;
  };
}

export default function BotDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<Bot | null>(null);
  const [botLoading, setBotLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchBot();
    }
  }, [user, botId]);

  const fetchBot = async () => {
    try {
      const response = await botsAPI.getById(botId);
      setBot(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement du bot:', error);
      toast.error('Impossible de charger les informations du bot');
      router.push('/bots');
    } finally {
      setBotLoading(false);
    }
  };

  const handleStart = async () => {
    setActionLoading('start');
    try {
      await botsAPI.start(botId);
      toast.success('Bot démarré avec succès');
      await fetchBot(); // Refresh bot status
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du démarrage');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    setActionLoading('stop');
    try {
      await botsAPI.stop(botId);
      toast.success('Bot arrêté avec succès');
      await fetchBot(); // Refresh bot status
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'arrêt');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce bot ? Cette action est irréversible.')) {
      return;
    }

    setActionLoading('delete');
    try {
      await botsAPI.delete(botId);
      toast.success('Bot supprimé avec succès');
      router.push('/bots');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
      setActionLoading(null);
    }
  };

  const generateInviteLink = async () => {
    try {
      const response = await botsAPI.getInviteLink(botId);
      const inviteUrl = response.data.inviteUrl;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Lien d\'invitation copié dans le presse-papiers');
      
      // Open in new tab
      window.open(inviteUrl, '_blank');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la génération du lien');
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-100 text-green-800';
      case 'OFFLINE': return 'bg-gray-100 text-gray-800';
      case 'STARTING': return 'bg-yellow-100 text-yellow-800';
      case 'ERROR': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/bots')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ← Retour
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{bot.name}</h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bot.status)}`}>
                      {bot.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      ID: {bot.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              {bot.status === 'OFFLINE' ? (
                <button
                  onClick={handleStart}
                  disabled={actionLoading === 'start'}
                  className="btn-primary"
                >
                  {actionLoading === 'start' ? (
                    <>
                      <div className="discord-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Démarrage...
                    </>
                  ) : (
                    'Démarrer'
                  )}
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  disabled={actionLoading === 'stop'}
                  className="btn-secondary"
                >
                  {actionLoading === 'stop' ? (
                    <>
                      <div className="discord-spinner w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full mr-2"></div>
                      Arrêt...
                    </>
                  ) : (
                    'Arrêter'
                  )}
                </button>
              )}
              <button
                onClick={generateInviteLink}
                className="btn-outline"
              >
                Inviter
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="btn-danger"
              >
                {actionLoading === 'delete' ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations principales */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom</label>
                    <p className="mt-1 text-sm text-gray-900">{bot.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Statut</label>
                    <span className={`mt-1 inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bot.status)}`}>
                      {bot.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{bot.clientId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Créé le</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(bot.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Configuration */}
              <div className="card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>
                  <button 
                    onClick={() => router.push(`/bots/${botId}/config`)}
                    className="btn-secondary text-sm"
                  >
                    ⚙️ Configuration
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Message de bienvenue</label>
                      <p className="text-xs text-gray-500">Envoie un message aux nouveaux membres</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bot.config?.welcomeEnabled || false}
                        className="sr-only peer"
                        readOnly
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-discord-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Modération</label>
                      <p className="text-xs text-gray-500">Fonctionnalités de modération automatique</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bot.config?.moderationEnabled || false}
                        className="sr-only peer"
                        readOnly
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-discord-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Attribution automatique de rôle</label>
                      <p className="text-xs text-gray-500">Attribue un rôle aux nouveaux membres</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bot.config?.autoRoleEnabled || false}
                        className="sr-only peer"
                        readOnly
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-discord-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Console/Actions */}
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => router.push(`/bots/${botId}/config`)}
                    className="w-full btn-primary text-sm"
                  >
                    ⚙️ Configuration avancée
                  </button>
                  <button 
                    onClick={generateInviteLink}
                    className="w-full btn-secondary text-sm"
                  >
                    Générer lien d'invitation
                  </button>
                  <button className="w-full btn-secondary text-sm">
                    Voir les logs
                  </button>
                  <button className="w-full btn-secondary text-sm">
                    Statistiques
                  </button>
                  <button className="w-full btn-outline text-sm">
                    Tester les commandes
                  </button>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Console</h3>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono h-64 overflow-y-auto">
                  <div className="space-y-1">
                    <div>[{new Date().toLocaleTimeString()}] Bot {bot.status.toLowerCase()}</div>
                    <div>[{new Date().toLocaleTimeString()}] Serving {Math.floor(Math.random() * 10) + 1} guilds</div>
                    <div>[{new Date().toLocaleTimeString()}] Ready to receive commands</div>
                    <div className="text-gray-500">--- Logs en temps réel ---</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}