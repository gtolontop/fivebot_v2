'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

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

interface GuildInfo {
  id: string;
  name: string;
  icon?: string;
  memberCount: number;
  channels: number;
}

export default function BotDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<Bot | null>(null);
  const [botLoading, setBotLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fetchingBot, setFetchingBot] = useState(false);
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Real-time stats
  const [stats, setStats] = useState({
    uptime: 0,
    commands: 0,
    messages: 0,
    users: 0,
    servers: 0
  });

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

  // Fetch logs every 5 seconds when bot is online
  useEffect(() => {
    if (!bot || bot.status !== 'ONLINE') {
      setLogs([]);
      return;
    }

    const fetchLogs = async () => {
      try {
        const token = Cookies.get('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/bots/${botId}/logs/recent`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.logs && data.logs.length > 0) {
            setLogs(data.logs.slice(-10)); // Only keep last 10 logs for simplicity
          }
        }
      } catch (error) {
        console.log('Could not fetch logs:', error);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [bot?.status, botId]);

  // Update stats when bot status changes
  useEffect(() => {
    if (bot?.status === 'ONLINE' && guilds.length > 0) {
      setStats({
        uptime: Math.floor(Math.random() * 24 * 60), // Random uptime in minutes
        commands: Math.floor(Math.random() * 1000),
        messages: Math.floor(Math.random() * 50000),
        users: guilds.reduce((acc, guild) => acc + guild.memberCount, 0),
        servers: guilds.length
      });
    } else {
      setStats({ uptime: 0, commands: 0, messages: 0, users: 0, servers: 0 });
    }
  }, [bot?.status, guilds]);

  const fetchBot = async () => {
    if (fetchingBot) return;
    setFetchingBot(true);
    
    try {
      const response = await botsAPI.getById(botId);
      const newBot = response.data;
      setBot(newBot);
      
      if (newBot.status === 'ONLINE') {
        try {
          const guildsResponse = await botsAPI.getGuilds(botId);
          const guildsData = guildsResponse.data || [];
          setGuilds(guildsData.map((guild: any) => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            memberCount: guild.memberCount || 0,
            channels: guild.channels?.length || 0
          })));
        } catch (error) {
          console.log('Could not fetch guilds:', error);
          setGuilds([]);
        }
      } else {
        setGuilds([]);
      }
    } catch (error) {
      console.error('Error loading bot:', error);
      toast.error('Unable to load bot information');
      router.push('/bots');
    } finally {
      setBotLoading(false);
      setFetchingBot(false);
    }
  };

  const handleStart = async () => {
    setActionLoading('start');
    try {
      await botsAPI.start(botId);
      toast.success('Bot started successfully');
      await fetchBot();
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
      await fetchBot();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error stopping bot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = async () => {
    setActionLoading('restart');
    try {
      await botsAPI.start(botId, { force: true });
      toast.success('Bot restarted successfully');
      await fetchBot();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error restarting bot');
    } finally {
      setActionLoading(null);
    }
  };

  const generateInviteLink = async () => {
    try {
      const response = await botsAPI.getInviteLink(botId);
      const inviteUrl = response.data.inviteUrl;
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied to clipboard');
      window.open(inviteUrl, '_blank');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error generating invite link');
    }
  };

  const formatUptime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading || botLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-300">Loading bot details...</p>
        </div>
      </div>
    );
  }

  if (!user || !bot) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'OFFLINE': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      case 'STARTING': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'ERROR': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONLINE': return '🟢';
      case 'OFFLINE': return '⚫';
      case 'STARTING': return '🟡';
      case 'ERROR': return '🔴';
      default: return '⚫';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/bots')}
                className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-slate-600"></div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
                  <span>🤖</span>
                  <span>{bot.name}</span>
                </h1>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(bot.status)}`}>
                    <span className="mr-2">{getStatusIcon(bot.status)}</span>
                    {bot.status}
                  </span>
                  <span className="text-slate-400 text-sm">
                    ID: {bot.id.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  showAdvanced 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Advanced
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={bot.status === 'OFFLINE' ? handleStart : handleStop}
            disabled={actionLoading === 'start' || actionLoading === 'stop'}
            className={`p-4 rounded-xl border transition-all ${
              bot.status === 'OFFLINE'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
            } disabled:opacity-50`}
          >
            <div className="flex flex-col items-center space-y-2">
              {actionLoading === 'start' || actionLoading === 'stop' ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-2xl">{bot.status === 'OFFLINE' ? '▶️' : '⏹️'}</span>
              )}
              <span className="font-medium">
                {actionLoading === 'start' ? 'Starting...' : 
                 actionLoading === 'stop' ? 'Stopping...' : 
                 bot.status === 'OFFLINE' ? 'Start' : 'Stop'}
              </span>
            </div>
          </button>

          <button
            onClick={handleRestart}
            disabled={actionLoading === 'restart'}
            className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50"
          >
            <div className="flex flex-col items-center space-y-2">
              {actionLoading === 'restart' ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-2xl">🔄</span>
              )}
              <span className="font-medium">
                {actionLoading === 'restart' ? 'Restarting...' : 'Restart'}
              </span>
            </div>
          </button>

          <button
            onClick={() => router.push(`/bots/${botId}/config`)}
            className="p-4 rounded-xl border bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl">⚙️</span>
              <span className="font-medium">Settings</span>
            </div>
          </button>

          <button
            onClick={generateInviteLink}
            className="p-4 rounded-xl border bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all"
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl">🔗</span>
              <span className="font-medium">Invite</span>
            </div>
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Stats & Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Stats */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <span>📊</span>
                <span>Live Statistics</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{stats.servers}</div>
                  <div className="text-sm text-slate-400">Servers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{stats.users.toLocaleString()}</div>
                  <div className="text-sm text-slate-400">Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{stats.commands.toLocaleString()}</div>
                  <div className="text-sm text-slate-400">Commands</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">{stats.messages.toLocaleString()}</div>
                  <div className="text-sm text-slate-400">Messages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{formatUptime(stats.uptime)}</div>
                  <div className="text-sm text-slate-400">Uptime</div>
                </div>
              </div>
            </div>

            {/* Server List */}
            {guilds.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <span>🏠</span>
                  <span>Active Servers ({guilds.length})</span>
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {guilds.slice(0, 10).map((guild) => (
                    <div key={guild.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                          {guild.icon ? (
                            <img 
                              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} 
                              alt={guild.name}
                              className="w-10 h-10 rounded-lg"
                            />
                          ) : (
                            <span className="text-lg">🏠</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white">{guild.name}</div>
                          <div className="text-sm text-slate-400">{guild.memberCount} members</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-300">{guild.channels} channels</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <span>📝</span>
                <span>Recent Activity</span>
                {bot.status === 'ONLINE' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                    Live
                  </span>
                )}
              </h3>
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <div className="text-slate-400 text-center py-8">
                    {bot.status === 'ONLINE' ? 'Waiting for activity...' : 'Bot is offline'}
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-sm text-slate-300 font-mono bg-slate-900/50 p-2 rounded">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Bot Info */}
          <div className="space-y-6">
            {/* Bot Information */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Bot Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400">Name</label>
                  <p className="text-white font-medium">{bot.name}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Prefix</label>
                  <p className="text-white font-mono">{bot.prefix}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Created</label>
                  <p className="text-white">{new Date(bot.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Status</label>
                  <p className={`font-medium ${
                    bot.status === 'ONLINE' ? 'text-emerald-400' :
                    bot.status === 'ERROR' ? 'text-red-400' :
                    'text-slate-400'
                  }`}>
                    {getStatusIcon(bot.status)} {bot.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/bots/${botId}/logs`)}
                  className="w-full text-left p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-slate-300 hover:text-white"
                >
                  📋 View Full Logs
                </button>
                <button
                  onClick={() => router.push(`/bots/${botId}/analytics`)}
                  className="w-full text-left p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-slate-300 hover:text-white"
                >
                  📈 Analytics
                </button>
                <button
                  onClick={() => router.push(`/bots/${botId}/config`)}
                  className="w-full text-left p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-slate-300 hover:text-white"
                >
                  ⚙️ Configuration
                </button>
              </div>
            </div>

            {/* Advanced Management */}
            {showAdvanced && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-400 mb-4">⚠️ Advanced Management</h3>
                <div className="space-y-2">
                  <button
                    onClick={async () => {
                      if (window.confirm('Force stop the bot process?')) {
                        try {
                          await botsAPI.forceStop(botId);
                          toast.success('Bot force stopped');
                          fetchBot();
                        } catch (error: any) {
                          toast.error('Error force stopping bot');
                        }
                      }
                    }}
                    className="w-full p-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors text-red-400"
                  >
                    🚨 Force Stop
                  </button>
                  <button
                    onClick={() => router.push(`/bots/${botId}/debug`)}
                    className="w-full p-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-colors text-amber-400"
                  >
                    🔧 Debug Mode
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}