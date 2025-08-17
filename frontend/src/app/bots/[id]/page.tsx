'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import Header from '@/components/Header';

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

  // Real-time performance stats
  const [stats, setStats] = useState({
    cpu: 0,
    memory: 0,
    ping: 0,
    uptime: 0
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

  // Fetch logs every 1.5 seconds when bot is online
  useEffect(() => {
    if (!bot) return;

    if (bot.status !== 'ONLINE') {
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
            setLogs(prev => {
              const newLogs = data.logs.slice(-30);
              if (JSON.stringify(newLogs) !== JSON.stringify(prev)) {
                return newLogs;
              }
              return prev;
            });
          } else if (logs.length === 0) {
            setLogs([`🚀 Bot ${bot.name} connected and ready - ${new Date().toLocaleTimeString()}`]);
          }
        }
      } catch (error) {
        console.log('Could not fetch logs:', error);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 1500);
    return () => clearInterval(interval);
  }, [bot?.status, botId]);

  // Update performance stats from real API when bot is online
  useEffect(() => {
    if (bot?.status === 'ONLINE') {
      const fetchMetrics = async () => {
        try {
          const token = Cookies.get('token');
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/bots/${botId}/metrics/realtime`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setStats({
              cpu: data.cpu || 0,
              memory: data.memory || 0,
              ping: data.ping || 0,
              uptime: data.uptime || 0
            });
          }
        } catch (error) {
          console.log('Could not fetch metrics:', error);
          setStats({ cpu: 0, memory: 0, ping: 0, uptime: 0 });
        }
      };
      
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 2000);
      return () => clearInterval(interval);
    } else {
      setStats({ cpu: 0, memory: 0, ping: 0, uptime: 0 });
    }
  }, [bot?.status, botId]);

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
      
      setTimeout(async () => {
        await fetchBot();
      }, 2000);
      
      let checks = 0;
      const statusCheckInterval = setInterval(async () => {
        checks++;
        if (checks > 15) {
          clearInterval(statusCheckInterval);
          return;
        }
        
        try {
          const response = await botsAPI.getById(botId);
          const updatedBot = response.data;
          if (updatedBot.status === 'ONLINE') {
            setBot(updatedBot);
            clearInterval(statusCheckInterval);
          } else {
            setBot(updatedBot);
          }
        } catch (error) {
          console.log('Status check error:', error);
        }
      }, 2000);
      
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
      
      setTimeout(async () => {
        await fetchBot();
      }, 1000);
      
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
      
      setTimeout(async () => {
        await fetchBot();
      }, 2000);
      
      let checks = 0;
      const statusCheckInterval = setInterval(async () => {
        checks++;
        if (checks > 15) {
          clearInterval(statusCheckInterval);
          return;
        }
        
        try {
          const response = await botsAPI.getById(botId);
          const updatedBot = response.data;
          if (updatedBot.status === 'ONLINE') {
            setBot(updatedBot);
            clearInterval(statusCheckInterval);
          } else {
            setBot(updatedBot);
          }
        } catch (error) {
          console.log('Status check error:', error);
        }
      }, 2000);
      
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
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-lg">Loading bot dashboard...</p>
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

  const totalMembers = guilds.reduce((sum, guild) => sum + guild.memberCount, 0);
  const totalServers = guilds.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header
        title={bot.name}
        subtitle={
          <div className="flex items-center space-x-3 mt-1">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(bot.status)}`}>
              <span className="mr-2">{getStatusIcon(bot.status)}</span>
              {bot.status}
            </span>
            <span className="text-gray-500 text-sm">
              ID: {bot.id.substring(0, 8)}...
            </span>
          </div>
        }
        icon={
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🤖</span>
          </div>
        }
        backButton={{
          label: "Back to Bots",
          href: "/bots"
        }}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Status</p>
                <p className="text-gray-900 text-2xl font-bold">{bot.status}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">{getStatusIcon(bot.status)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Servers</p>
                <p className="text-gray-900 text-2xl font-bold">{totalServers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Members</p>
                <p className="text-gray-900 text-2xl font-bold">{totalMembers.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Uptime</p>
                <p className="text-gray-900 text-2xl font-bold">{bot.status === 'ONLINE' ? formatUptime(stats.uptime) : '0h 0m'}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-8">
          <h3 className="text-white text-lg font-semibold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
            </svg>
            Bot Controls
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={bot.status === 'OFFLINE' ? handleStart : handleStop}
              disabled={actionLoading === 'start' || actionLoading === 'stop'}
              className={`p-4 rounded-xl border transition-all text-sm font-medium flex flex-col items-center space-y-2 ${
                bot.status === 'OFFLINE'
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
              } disabled:opacity-50`}
            >
              {actionLoading === 'start' || actionLoading === 'stop' ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-2xl">{bot.status === 'OFFLINE' ? '▶️' : '⏹️'}</span>
              )}
              <span>
                {actionLoading === 'start' ? 'Starting...' : 
                 actionLoading === 'stop' ? 'Stopping...' : 
                 bot.status === 'OFFLINE' ? 'Start Bot' : 'Stop Bot'}
              </span>
            </button>

            <button
              onClick={handleRestart}
              disabled={actionLoading === 'restart'}
              className="p-4 rounded-xl border bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30 transition-all disabled:opacity-50 text-sm font-medium flex flex-col items-center space-y-2"
            >
              {actionLoading === 'restart' ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-2xl">🔄</span>
              )}
              <span>{actionLoading === 'restart' ? 'Restarting...' : 'Restart'}</span>
            </button>

            <button
              onClick={() => router.push(`/bots/${botId}/config`)}
              className="p-4 rounded-xl border bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all text-sm font-medium flex flex-col items-center space-y-2"
            >
              <span className="text-2xl">⚙️</span>
              <span>Configure</span>
            </button>

            <button
              onClick={generateInviteLink}
              className="p-4 rounded-xl border bg-purple-500/20 border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-all text-sm font-medium flex flex-col items-center space-y-2"
            >
              <span className="text-2xl">🔗</span>
              <span>Invite Link</span>
            </button>
          </div>
        </div>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Console - Takes 2/3 on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-white font-medium">Live Console</span>
                  {bot.status === 'ONLINE' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                      Live
                    </span>
                  )}
                </div>
                <span className="text-slate-400 text-xs">Auto-refresh every 1.5s</span>
              </div>
              
              <div className="h-96 overflow-y-auto p-4 bg-black/20">
                <div className="space-y-2 text-sm font-mono">
                  {logs.length === 0 ? (
                    <div className="text-slate-400 text-center py-8">
                      {bot.status === 'ONLINE' ? (
                        <div className="space-y-2">
                          <div>⏳ Waiting for bot activity...</div>
                          <div className="text-xs">Console will show live logs when bot processes events</div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>💤 Bot is offline</div>
                          <div className="text-xs">Start the bot to see live activity</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="text-emerald-400 leading-relaxed hover:bg-white/5 px-2 py-1 rounded">
                        <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> {log}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Performance & Info */}
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h3 className="text-white text-lg font-semibold mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                </svg>
                Performance
              </h3>
              
              {bot.status === 'ONLINE' ? (
                <div className="space-y-6">
                  {/* CPU Usage */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300 font-medium">CPU Usage</span>
                      <span className="font-mono text-sm font-semibold text-purple-400">{stats.cpu}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-purple-400 to-pink-400 h-3 rounded-full transition-all duration-500" 
                        style={{width: `${Math.min(stats.cpu, 100)}%`}}
                      ></div>
                    </div>
                  </div>

                  {/* Memory Usage */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300 font-medium">Memory</span>
                      <span className="font-mono text-sm font-semibold text-emerald-400">{stats.memory}MB</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-emerald-400 to-blue-400 h-3 rounded-full transition-all duration-500" 
                        style={{width: `${Math.min((stats.memory / 512) * 100, 100)}%`}}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">/ 512MB allocated</div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/30">
                      <div className="text-xl font-bold font-mono text-blue-400">{stats.ping}ms</div>
                      <div className="text-sm text-blue-300 mt-1 font-medium">Latency</div>
                      <div className="text-xs text-blue-200 mt-1">
                        {stats.ping < 50 ? '🟢 Excellent' : stats.ping < 100 ? '🟡 Good' : '🔴 Slow'}
                      </div>
                    </div>
                    
                    <div className="text-center p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30">
                      <div className="text-xl font-bold font-mono text-emerald-400">{formatUptime(stats.uptime)}</div>
                      <div className="text-sm text-emerald-300 mt-1 font-medium">Uptime</div>
                      <div className="text-xs text-emerald-200 mt-1">
                        {stats.uptime > 60 ? '🟢 Stable' : '🟡 Starting'}
                      </div>
                    </div>
                  </div>

                  {/* System Health */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-emerald-300 font-semibold">System Healthy</span>
                      </div>
                      <div className="text-xs text-emerald-400">
                        Last: {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-16">
                  <div className="text-6xl mb-4">💤</div>
                  <div className="text-lg font-medium">Bot is offline</div>
                  <div className="text-sm mt-2">Performance monitoring unavailable</div>
                  <div className="text-xs text-slate-500 mt-4">Start the bot to see real-time metrics</div>
                </div>
              )}
            </div>

            {/* Server List */}
            {bot.status === 'ONLINE' && guilds.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <h3 className="text-white text-lg font-semibold mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                  </svg>
                  Active Servers
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {guilds.slice(0, 5).map((guild) => (
                    <div key={guild.id} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        {guild.icon ? (
                          <img
                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
                            alt={guild.name}
                            className="w-8 h-8 rounded"
                          />
                        ) : (
                          <span className="text-white font-semibold text-sm">
                            {guild.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{guild.name}</p>
                        <p className="text-slate-400 text-sm">
                          {guild.memberCount.toLocaleString()} members
                        </p>
                      </div>
                    </div>
                  ))}
                  {guilds.length > 5 && (
                    <div className="text-center text-slate-400 text-sm py-2">
                      +{guilds.length - 5} more servers
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h3 className="text-white text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/bots/${botId}/analytics`)}
                  className="w-full p-3 rounded-lg border bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 text-blue-400 hover:from-blue-500/30 hover:to-purple-500/30 transition-all text-sm font-medium flex items-center space-x-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                  </svg>
                  <span>View Analytics</span>
                </button>
                
                <button
                  onClick={() => router.push(`/bots/${botId}/config`)}
                  className="w-full p-3 rounded-lg border bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400 hover:from-emerald-500/30 hover:to-teal-500/30 transition-all text-sm font-medium flex items-center space-x-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                  </svg>
                  <span>Bot Settings</span>
                </button>

                <button
                  onClick={async () => {
                    if (window.confirm('Force stop this bot? This will immediately terminate the process.')) {
                      try {
                        await botsAPI.forceStop(botId);
                        toast.success('Bot force stopped');
                        fetchBot();
                      } catch (error: any) {
                        toast.error('Error force stopping bot');
                      }
                    }
                  }}
                  className="w-full p-3 rounded-lg border bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/30 text-red-400 hover:from-red-500/30 hover:to-pink-500/30 transition-all text-sm font-medium flex items-center space-x-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                  <span>Force Stop</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}