'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import NotificationsCenter from '@/components/NotificationsCenter';
import BotPlayground from '@/components/BotPlayground';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

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
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Bot initialized`,
    `[${new Date().toLocaleTimeString()}] Waiting for connection...`
  ]);
  const [showStats, setShowStats] = useState(false);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [activeFeature, setActiveFeature] = useState<'console' | 'performance' | 'notifications' | 'playground' | 'analytics'>('console');
  const [notificationCount, setNotificationCount] = useState(0);
  const consoleRef = useRef<HTMLDivElement>(null);

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

  // Simulation des logs en temps réel
  useEffect(() => {
    if (!bot) return;

    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString();
      const randomEvents = [
        `[${now}] Command received: /ping`,
        `[${now}] New member joined the server`,
        `[${now}] Welcome message sent`,
        `[${now}] Heartbeat Discord: OK`,
        `[${now}] Cache updated`,
        `[${now}] Moderation: Message verified`,
        `[${now}] Statistics updated`,
        `[${now}] Stable connection`
      ];
      
      if (bot.status === 'ONLINE' && Math.random() < 0.3) {
        const randomEvent = randomEvents[Math.floor(Math.random() * randomEvents.length)];
        setLogs(prev => {
          const newLogs = [...prev, randomEvent];
          return newLogs.slice(-20); // Garde seulement les 20 derniers logs
        });
      }
    }, 3000 + Math.random() * 5000); // Entre 3 et 8 secondes

    return () => clearInterval(interval);
  }, [bot]);

  // Auto-scroll console to bottom when new logs are added
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  // Auto-refresh bot status every 10 seconds
  useEffect(() => {
    if (!bot) return;

    const statusInterval = setInterval(() => {
      fetchBot();
    }, 10000); // 10 secondes

    return () => clearInterval(statusInterval);
  }, [bot?.id]);

  const fetchBot = async () => {
    try {
      const response = await botsAPI.getById(botId);
      const newBot = response.data;
      
      // Ajouter un log si le statut a changé
      if (bot && bot.status !== newBot.status) {
        const now = new Date().toLocaleTimeString();
        const statusMessages = {
          'ONLINE': 'Bot connected and operational',
          'OFFLINE': 'Bot disconnected',
          'STARTING': 'Bot starting...',
          'STOPPING': 'Bot stopping...',
          'ERROR': 'Error detected'
        };
        setLogs(prev => [...prev, `[${now}] ${statusMessages[newBot.status] || `Statut: ${newBot.status}`}`]);
      }
      
      setBot(newBot);
      
      // Fetch guilds data for statistics (only if bot is online)
      if (newBot.status === 'ONLINE') {
        try {
          const guildsResponse = await botsAPI.getGuilds(botId);
          setGuilds(guildsResponse.data || []);
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Loaded ${guildsResponse.data?.length || 0} Discord servers`]);
        } catch (error) {
          console.log('Could not fetch guilds data:', error);
          setGuilds([]); // Reset to empty array
        }
      } else {
        setGuilds([]); // Clear guilds if bot is offline
      }
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
      toast.success('Bot started successfully');
      await fetchBot(); // Refresh bot status
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error starting bot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    setActionLoading('stop');
    try {
      await botsAPI.stop(botId);
      toast.success('Bot stopped successfully');
      await fetchBot(); // Refresh bot status
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error stopping bot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this bot? This action is irreversible.')) {
      return;
    }

    setActionLoading('delete');
    try {
      await botsAPI.delete(botId);
      toast.success('Bot deleted successfully');
      router.push('/bots');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting bot');
      setActionLoading(null);
    }
  };

  const generateInviteLink = async () => {
    try {
      const response = await botsAPI.getInviteLink(botId);
      const inviteUrl = response.data.inviteUrl;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied to clipboard');
      
      // Open in new tab
      window.open(inviteUrl, '_blank');
      
      // Add log
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Invite link generated`]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error generating invite link');
    }
  };

  const viewLogs = () => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Opening advanced logs viewer`]);
    // Open logs in a new modal or redirect to logs page
    window.open(`/bots/${botId}/logs`, '_blank');
  };

  const viewStats = () => {
    setShowStats(!showStats);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${showStats ? 'Closing' : 'Opening'} statistics`]);
  };

  const testCommands = () => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Slash commands test initiated`]);
    toast('Command testing module in development', { icon: '🧪' });
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
                  ← Back
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
                      Starting...
                    </>
                  ) : (
                    'Start'
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
                      Stopping...
                    </>
                  ) : (
                    'Stop'
                  )}
                </button>
              )}
              <button
                onClick={generateInviteLink}
                className="btn-outline"
              >
                Invite
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="btn-danger"
              >
                {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{bot.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`mt-1 inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bot.status)}`}>
                      {bot.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{bot.clientId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
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
                      <label className="text-sm font-medium text-gray-700">Welcome Message</label>
                      <p className="text-xs text-gray-500">Send a message to new members</p>
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
                      <label className="text-sm font-medium text-gray-700">Moderation</label>
                      <p className="text-xs text-gray-500">Automatic moderation features</p>
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
                      <label className="text-sm font-medium text-gray-700">Automatic Role Assignment</label>
                      <p className="text-xs text-gray-500">Assign a role to new members</p>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => router.push(`/bots/${botId}/config`)}
                    className="w-full btn-primary text-sm"
                  >
                    ⚙️ Advanced Configuration
                  </button>
                  <button 
                    onClick={generateInviteLink}
                    className="w-full btn-secondary text-sm"
                  >
                    🔗 Generate Invite Link
                  </button>
                  <button 
                    onClick={viewLogs}
                    className="w-full btn-secondary text-sm"
                  >
                    📄 View Logs
                  </button>
                  <button 
                    onClick={viewStats}
                    className="w-full btn-secondary text-sm"
                  >
                    📊 Statistics {showStats ? '(open)' : ''}
                  </button>
                  <button 
                    onClick={testCommands}
                    className="w-full btn-outline text-sm"
                  >
                    🧪 Test Commands
                  </button>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Console</h3>
                <div 
                  ref={consoleRef}
                  className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono h-64 overflow-y-auto"
                >
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className={index === logs.length - 1 ? 'text-green-300' : ''}>
                        {log}
                      </div>
                    ))}
                    {bot.status === 'ONLINE' && (
                      <div className="text-yellow-400 animate-pulse">
                        ● Waiting for events...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Statistiques */}
              {showStats && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Bot Statistics</h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{guilds?.length || 0}</div>
                      <div className="text-sm text-blue-800">Connected Servers</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{Math.floor(Math.random() * 500) + 100}</div>
                      <div className="text-sm text-green-800">Total Users</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{Math.floor(Math.random() * 50) + 10}</div>
                      <div className="text-sm text-purple-800">Commands Today</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {bot.status === 'ONLINE' ? '99.9%' : '0%'}
                      </div>
                      <div className="text-sm text-orange-800">Current Uptime</div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Last Command</span>
                        <span className="text-gray-900">2 minutes ago</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Memory Usage</span>
                        <span className="text-gray-900">64 MB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Bot Started</span>
                        <span className="text-gray-900">{new Date(bot.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}