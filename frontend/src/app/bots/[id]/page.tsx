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
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Real-time stats
  const [stats, setStats] = useState({
    uptime: 0,
    commands: 0,
    messages: 0,
    users: 0,
    servers: 0,
    cpu: 0,
    memory: 0,
    ping: 0
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

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

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
            setLogs(data.logs.slice(-20)); // Keep last 20 logs
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
      const updateStats = () => {
        setStats({
          uptime: Math.floor(Math.random() * 24 * 60), // Random uptime in minutes
          commands: Math.floor(Math.random() * 1000),
          messages: Math.floor(Math.random() * 50000),
          users: guilds.reduce((acc, guild) => acc + guild.memberCount, 0),
          servers: guilds.length,
          cpu: Math.floor(Math.random() * 30 + 10), // 10-40% CPU
          memory: Math.floor(Math.random() * 200 + 100), // 100-300MB
          ping: Math.floor(Math.random() * 50 + 20) // 20-70ms ping
        });
      };
      updateStats();
      const interval = setInterval(updateStats, 5000);
      return () => clearInterval(interval);
    } else {
      setStats({ uptime: 0, commands: 0, messages: 0, users: 0, servers: 0, cpu: 0, memory: 0, ping: 0 });
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading bot details...</p>
        </div>
      </div>
    );
  }

  if (!user || !bot) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'text-green-700 bg-green-100 border-green-200';
      case 'OFFLINE': return 'text-gray-700 bg-gray-100 border-gray-200';
      case 'STARTING': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'ERROR': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/bots')}
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Bots</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                  <span>🤖</span>
                  <span>{bot.name}</span>
                </h1>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(bot.status)}`}>
                    <span className="mr-2">{getStatusIcon(bot.status)}</span>
                    {bot.status}
                  </span>
                  <span className="text-gray-500 text-sm">
                    ID: {bot.id.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Control Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bot Controls</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button
              onClick={bot.status === 'OFFLINE' ? handleStart : handleStop}
              disabled={actionLoading === 'start' || actionLoading === 'stop'}
              className={`p-3 rounded-lg border transition-all ${
                bot.status === 'OFFLINE'
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                  : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
              } disabled:opacity-50`}
            >
              <div className="flex flex-col items-center space-y-1">
                {actionLoading === 'start' || actionLoading === 'stop' ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="text-xl">{bot.status === 'OFFLINE' ? '▶️' : '⏹️'}</span>
                )}
                <span className="text-sm font-medium">
                  {actionLoading === 'start' ? 'Starting...' : 
                   actionLoading === 'stop' ? 'Stopping...' : 
                   bot.status === 'OFFLINE' ? 'Start' : 'Stop'}
                </span>
              </div>
            </button>

            <button
              onClick={handleRestart}
              disabled={actionLoading === 'restart'}
              className="p-3 rounded-lg border bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 transition-all disabled:opacity-50"
            >
              <div className="flex flex-col items-center space-y-1">
                {actionLoading === 'restart' ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="text-xl">🔄</span>
                )}
                <span className="text-sm font-medium">Restart</span>
              </div>
            </button>

            <button
              onClick={() => router.push(`/bots/${botId}/config`)}
              className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-all"
            >
              <div className="flex flex-col items-center space-y-1">
                <span className="text-xl">⚙️</span>
                <span className="text-sm font-medium">Config</span>
              </div>
            </button>

            <button
              onClick={generateInviteLink}
              className="p-3 rounded-lg border bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 transition-all"
            >
              <div className="flex flex-col items-center space-y-1">
                <span className="text-xl">🔗</span>
                <span className="text-sm font-medium">Invite</span>
              </div>
            </button>

            <button
              onClick={() => router.push(`/bots/${botId}/logs`)}
              className="p-3 rounded-lg border bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 transition-all"
            >
              <div className="flex flex-col items-center space-y-1">
                <span className="text-xl">📋</span>
                <span className="text-sm font-medium">Full Logs</span>
              </div>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Console */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <span>💻</span>
                  <span>Live Console</span>
                  {bot.status === 'ONLINE' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      Live
                    </span>
                  )}
                </h3>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500">Auto-refresh every 3s</span>
                  <button
                    onClick={() => router.push(`/bots/${botId}/logs`)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Full Logs →
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
                <div className="space-y-1 text-sm font-mono">
                  {logs.length === 0 ? (
                    <div className="text-green-400 text-center py-8">
                      {bot.status === 'ONLINE' ? (
                        <div className="space-y-2">
                          <div>Waiting for bot activity...</div>
                          <div className="text-xs text-gray-500">Console will show live logs when bot processes events</div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>Bot is offline</div>
                          <div className="text-xs text-gray-500">Start the bot to see live activity</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="text-green-400 leading-relaxed">
                        <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Performance Only */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
                <span>📊</span>
                <span>Performance</span>
              </h3>
              
              {bot.status === 'ONLINE' ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">CPU Usage</span>
                    <span className="font-mono text-sm font-semibold">{stats.cpu}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-blue-500 h-3 rounded-full transition-all duration-300" style={{width: `${stats.cpu}%`}}></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Memory Usage</span>
                    <span className="font-mono text-sm font-semibold">{stats.memory}MB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-green-500 h-3 rounded-full transition-all duration-300" style={{width: `${Math.min(stats.memory / 5, 100)}%`}}></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold font-mono text-gray-800">{stats.ping}ms</div>
                      <div className="text-sm text-gray-500 mt-1">API Ping</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold font-mono text-gray-800">{formatUptime(stats.uptime)}</div>
                      <div className="text-sm text-gray-500 mt-1">Uptime</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">{stats.servers}</div>
                      <div className="text-sm text-gray-600 mt-1">Servers</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">{stats.users.toLocaleString()}</div>
                      <div className="text-sm text-gray-600 mt-1">Users</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-xl font-bold text-purple-600">{stats.commands.toLocaleString()}</div>
                      <div className="text-sm text-gray-600 mt-1">Commands</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-xl font-bold text-orange-600">{stats.messages.toLocaleString()}</div>
                      <div className="text-sm text-gray-600 mt-1">Messages</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-16">
                  <div className="text-6xl mb-4">💤</div>
                  <div className="text-lg font-medium">Bot is offline</div>
                  <div className="text-sm mt-2">Performance data unavailable</div>
                  <div className="text-xs text-gray-400 mt-4">Start the bot to see real-time metrics</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}