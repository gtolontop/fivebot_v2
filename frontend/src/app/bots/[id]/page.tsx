'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import Header from '@/components/Header';
import { 
  PlayIcon, 
  StopIcon, 
  CogIcon, 
  LinkIcon,
  ChartBarIcon,
  ServerIcon,
  CommandLineIcon,
  CpuChipIcon,
  SignalIcon,
  ClockIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  HashtagIcon,
  ArrowPathIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  WifiIcon,
  WifiOffIcon
} from '@heroicons/react/24/outline';

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
  const [logs, setLogs] = useState<string[]>([]);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [realTimeStats, setRealTimeStats] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    uptime: 0,
    eventCount: 0,
    messageCount: 0,
    commandCount: 0,
    responseTime: 0
  });
  const consoleRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'performance' | 'settings'>('console');

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

  // Polling pour récupérer les logs
  useEffect(() => {
    if (!bot || !botId) return;

    const pollLogs = async () => {
      try {
        const token = Cookies.get('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/bots/${botId}/logs/live`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.logs && data.logs.length > 0) {
            setLogs(data.logs);
          }
        }
      } catch (error) {
        console.log('Could not fetch bot logs:', error);
      }
    };

    pollLogs();

    if (bot.status === 'ONLINE' || bot.status === 'STARTING') {
      setWsConnection({} as WebSocket);
      const interval = setInterval(pollLogs, 2000);
      return () => {
        clearInterval(interval);
        setWsConnection(null);
      };
    } else {
      setWsConnection(null);
    }
  }, [bot?.status, botId]);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current && activeTab === 'console') {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, activeTab]);

  // Simulation des stats temps réel
  useEffect(() => {
    if (!bot || bot.status !== 'ONLINE') return;

    const statsInterval = setInterval(() => {
      setRealTimeStats(prev => ({
        cpuUsage: Math.max(0, Math.min(100, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(0, Math.min(100, prev.memoryUsage + (Math.random() - 0.5) * 5)),
        uptime: prev.uptime + 1,
        eventCount: prev.eventCount + Math.floor(Math.random() * 3),
        messageCount: prev.messageCount + Math.floor(Math.random() * 5),
        commandCount: prev.commandCount + (Math.random() < 0.3 ? 1 : 0),
        responseTime: Math.max(10, Math.min(500, prev.responseTime + (Math.random() - 0.5) * 20))
      }));
    }, 2000);

    return () => clearInterval(statsInterval);
  }, [bot?.status]);

  // Auto-refresh du statut
  useEffect(() => {
    if (!bot) return;

    const statusInterval = setInterval(() => {
      fetchBot();
    }, 10000);

    return () => clearInterval(statusInterval);
  }, [bot?.id]);

  const fetchBot = async () => {
    try {
      const response = await botsAPI.getById(botId);
      const newBot = response.data;
      
      setBot(newBot);
      
      if (newBot.status === 'ONLINE') {
        try {
          const guildsResponse = await botsAPI.getGuilds(botId);
          setGuilds(guildsResponse.data || []);
        } catch (error) {
          console.log('Could not fetch guilds data:', error);
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
    }
  };

  const handleStart = async () => {
    setActionLoading('start');
    
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] [container@fivebot]: Server marked as starting...`]);
    
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
    
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] [container@fivebot]: Server marked as stopping...`]);
    
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
    
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] [container@fivebot]: Server restart initiated...`]);
    
    try {
      await botsAPI.start(botId, { force: true });
      toast.success('Bot restarting...');
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return;
    }

    try {
      await botsAPI.delete(botId);
      toast.success('Bot deleted successfully');
      router.push('/bots');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting bot');
    }
  };

  if (loading || botLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading bot details...</p>
        </div>
      </div>
    );
  }

  if (!user || !bot) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'text-green-600 bg-green-100';
      case 'OFFLINE': return 'text-gray-600 bg-gray-100';
      case 'STARTING': return 'text-yellow-600 bg-yellow-100';
      case 'ERROR': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={bot.name}
        subtitle={`Bot ID: ${bot.id}`}
        backButton={{
          label: "Back to Bots",
          href: "/bots"
        }}
        actions={
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bot.status)}`}>
              {bot.status === 'ONLINE' && <CheckCircleIcon className="w-4 h-4 mr-1" />}
              {bot.status === 'ERROR' && <ExclamationTriangleIcon className="w-4 h-4 mr-1" />}
              {bot.status === 'STARTING' && <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />}
              {bot.status}
            </span>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          
          {/* Control Panel */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <button
                onClick={handleStart}
                disabled={bot.status !== 'OFFLINE' || actionLoading !== null}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'start' ? (
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PlayIcon className="w-4 h-4 mr-2" />
                )}
                Start
              </button>

              <button
                onClick={handleStop}
                disabled={bot.status !== 'ONLINE' || actionLoading !== null}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'stop' ? (
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <StopIcon className="w-4 h-4 mr-2" />
                )}
                Stop
              </button>

              <button
                onClick={handleRestart}
                disabled={bot.status !== 'ONLINE' || actionLoading !== null}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'restart' ? (
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                )}
                Restart
              </button>

              <button
                onClick={() => router.push(`/bots/${botId}/config`)}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <CogIcon className="w-4 h-4 mr-2" />
                Settings
              </button>

              <button
                onClick={generateInviteLink}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Invite
              </button>

              <button
                onClick={() => router.push(`/bots/${botId}/analytics`)}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <ChartBarIcon className="w-4 h-4 mr-2" />
                Analytics
              </button>

              <button
                onClick={handleDelete}
                className="inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ServerIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Servers</p>
                  <p className="text-2xl font-semibold text-gray-900">{guilds.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {guilds.reduce((acc, guild) => acc + (guild.memberCount || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Uptime</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {bot.status === 'ONLINE' ? formatUptime(realTimeStats.uptime) : '0s'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <SignalIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Response Time</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {bot.status === 'ONLINE' ? `${realTimeStats.responseTime}ms` : '0ms'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white shadow-sm rounded-lg">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveTab('console')}
                  className={`py-3 px-8 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'console'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CommandLineIcon className="w-5 h-5 inline-block mr-2" />
                  Console
                </button>
                <button
                  onClick={() => setActiveTab('performance')}
                  className={`py-3 px-8 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'performance'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CpuChipIcon className="w-5 h-5 inline-block mr-2" />
                  Performance
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-3 px-8 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'settings'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CogIcon className="w-5 h-5 inline-block mr-2" />
                  Details
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Console Tab */}
              {activeTab === 'console' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-medium text-gray-900">Live Console</h3>
                      {bot.status === 'ONLINE' && wsConnection ? (
                        <div className="flex items-center text-green-600">
                          <WifiIcon className="w-4 h-4 mr-1" />
                          <span className="text-sm">Connected</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-400">
                          <WifiIcon className="w-4 h-4 mr-1" />
                          <span className="text-sm">Disconnected</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/bots/${botId}/logs`)}
                      className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      View Full Logs →
                    </button>
                  </div>

                  <div 
                    ref={consoleRef}
                    className="bg-gray-900 text-gray-100 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm"
                    style={{ scrollbarGutter: 'stable' }}
                  >
                    {logs.length === 0 ? (
                      <div className="text-gray-500">No logs available...</div>
                    ) : (
                      logs.slice(-100).map((log, index) => {
                        const logMatch = log.match(/\[(\d{2}:\d{2}:\d{2})\] \[([^\]]+)\]: (.*)/);
                        
                        if (logMatch) {
                          const [, time, prefix, message] = logMatch;
                          
                          let prefixColor = 'text-gray-400';
                          if (prefix.includes('bot@')) prefixColor = 'text-blue-400';
                          else if (prefix.includes('container@')) prefixColor = 'text-yellow-400';
                          else if (prefix.includes('system@')) prefixColor = 'text-green-400';
                          
                          let messageColor = 'text-gray-300';
                          if (message.toLowerCase().includes('error')) messageColor = 'text-red-400';
                          else if (message.toLowerCase().includes('warning')) messageColor = 'text-yellow-400';
                          else if (message.toLowerCase().includes('success') || message.includes('✅')) messageColor = 'text-green-400';
                          
                          return (
                            <div key={index} className="py-0.5 hover:bg-gray-800 -mx-2 px-2 rounded">
                              <span className="text-gray-500">[{time}]</span>
                              <span className={`${prefixColor} ml-2`}>[{prefix}]:</span>
                              <span className={`${messageColor} ml-2`}>{message}</span>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={index} className="text-gray-400 py-0.5">
                            {log}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-4">Resource Usage</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-600">CPU Usage</span>
                            <span className="text-sm font-medium">{realTimeStats.cpuUsage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                realTimeStats.cpuUsage > 80 ? 'bg-red-500' :
                                realTimeStats.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${realTimeStats.cpuUsage}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-600">Memory Usage</span>
                            <span className="text-sm font-medium">{realTimeStats.memoryUsage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                realTimeStats.memoryUsage > 80 ? 'bg-red-500' :
                                realTimeStats.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${realTimeStats.memoryUsage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-4">Activity Stats</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Events Processed</span>
                          <span className="text-sm font-medium">{realTimeStats.eventCount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Messages Received</span>
                          <span className="text-sm font-medium">{realTimeStats.messageCount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-sm text-gray-600">Commands Executed</span>
                          <span className="text-sm font-medium">{realTimeStats.commandCount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Server Distribution</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {guilds.slice(0, 6).map((guild) => (
                        <div key={guild.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          {guild.icon ? (
                            <img 
                              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                              alt={guild.name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <ServerIcon className="w-5 h-5 text-gray-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{guild.name}</p>
                            <p className="text-xs text-gray-500">{guild.memberCount?.toLocaleString()} members</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {guilds.length > 6 && (
                      <p className="text-sm text-gray-500 text-center mt-4">
                        And {guilds.length - 6} more servers...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Bot Information</h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-50 px-4 py-3 rounded-lg">
                        <dt className="text-xs font-medium text-gray-500">Bot ID</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">{bot.id}</dd>
                      </div>
                      <div className="bg-gray-50 px-4 py-3 rounded-lg">
                        <dt className="text-xs font-medium text-gray-500">Client ID</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">{bot.clientId || 'Not available'}</dd>
                      </div>
                      <div className="bg-gray-50 px-4 py-3 rounded-lg">
                        <dt className="text-xs font-medium text-gray-500">Prefix</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">{bot.prefix}</dd>
                      </div>
                      <div className="bg-gray-50 px-4 py-3 rounded-lg">
                        <dt className="text-xs font-medium text-gray-500">Created At</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {new Date(bot.createdAt).toLocaleDateString()}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Features Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Welcome Messages</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bot.config?.welcomeEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bot.config?.welcomeEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Auto Moderation</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bot.config?.moderationEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bot.config?.moderationEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Auto Role</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bot.config?.autoRoleEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bot.config?.autoRoleEnabled ? 'Enabled' : 'Disabled'}
                        </span>
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