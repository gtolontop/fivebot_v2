'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import PerformanceCard from '@/components/PerformanceCard';
import PlaygroundCard from '@/components/PlaygroundCard';
import StatsCard from '@/components/StatsCard';
import ConsoleCard from '@/components/ConsoleCard';
import QuickActionsCard from '@/components/QuickActionsCard';
import NotificationsCenter from '@/components/NotificationsCenter';

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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/bots')}
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span>←</span>
                <span className="font-medium">Back to Bots</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{bot.name}</h1>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bot.status)}`}>
                    <div className="w-1.5 h-1.5 bg-current rounded-full mr-1.5"></div>
                    {bot.status}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {bot.id.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              >
                <span className="text-lg">🔔</span>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {notificationCount}
                  </span>
                )}
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                title="Delete Bot"
              >
                <span className="text-lg">🗑️</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Overlay */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowNotifications(false)}></div>
          <div className="absolute right-4 top-20 w-96 max-h-[80vh] overflow-hidden">
            <NotificationsCenter 
              botId={botId} 
              botStatus={bot.status}
              onNotificationUpdate={setNotificationCount}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Quick Actions */}
          <div className="lg:col-span-1">
            <QuickActionsCard
              botId={botId}
              botStatus={bot.status}
              onStart={handleStart}
              onStop={handleStop}
              onGenerateInvite={generateInviteLink}
              actionLoading={actionLoading}
            />
          </div>

          {/* Main Dashboard */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Top Row - Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatsCard 
                botStatus={bot.status}
                guilds={guilds}
                isOnline={bot.status === 'ONLINE'}
              />
              <PerformanceCard 
                botStatus={bot.status}
                isOnline={bot.status === 'ONLINE'}
              />
            </div>

            {/* Middle Row - Interactive Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PlaygroundCard 
                botId={botId}
                botStatus={bot.status}
                isOnline={bot.status === 'ONLINE'}
              />
              <ConsoleCard 
                logs={logs}
                botStatus={bot.status}
                isOnline={bot.status === 'ONLINE'}
              />
            </div>

            {/* Bottom Row - Configuration Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Configuration Overview</h3>
                <button 
                  onClick={() => router.push(`/bots/${botId}/config`)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <span>⚙️</span>
                  <span>Manage Configuration</span>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                  <div>
                    <h4 className="font-medium text-blue-900">Welcome Messages</h4>
                    <p className="text-sm text-blue-700">Greet new members</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    bot.config?.welcomeEnabled ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    <span className="text-white text-sm">
                      {bot.config?.welcomeEnabled ? '✓' : '○'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                  <div>
                    <h4 className="font-medium text-purple-900">Moderation</h4>
                    <p className="text-sm text-purple-700">Auto-moderation tools</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    bot.config?.moderationEnabled ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    <span className="text-white text-sm">
                      {bot.config?.moderationEnabled ? '✓' : '○'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                  <div>
                    <h4 className="font-medium text-green-900">Auto Role</h4>
                    <p className="text-sm text-green-700">Assign roles automatically</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    bot.config?.autoRoleEnabled ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    <span className="text-white text-sm">
                      {bot.config?.autoRoleEnabled ? '✓' : '○'}
                    </span>
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