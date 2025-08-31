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

export default function BotDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<Bot | null>(null);
  const [botLoading, setBotLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const lastLogCountRef = useRef(0);
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

  // Polling to get real logs
  useEffect(() => {
    if (!bot || bot.status !== 'ONLINE') {
      setWsConnection(null);
      
      // Status changes will be logged by backend, no need to add here
      // Backend logs are the single source of truth
      
      return;
    }

    // Simulate connection state for UI
    setWsConnection({} as WebSocket);
    
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
            // Always use backend logs as single source of truth
            // This ensures persistence across refreshes
            setLogs(data.logs.slice(-500));
            lastLogCountRef.current = data.logs.length;
          } else {
            // No logs available yet
            // Only set the waiting message if we truly have no logs
            if (logs.length === 0) {
              setLogs([`[${new Date().toLocaleTimeString()}] 📋 Console prête - Historique des activités s'affichera ici`]);
            }
          }
        } else {
          // API error, show connection issue only if no existing logs
          if (logs.length === 0) {
            setLogs([`[${new Date().toLocaleTimeString()}] ❌ Problème de connexion avec le serveur`]);
          }
        }
      } catch (error) {
        console.log('Could not fetch bot logs:', error);
        setLogs([`[${new Date().toLocaleTimeString()}] Erreur de récupération des logs`]);
      }
    };

    // Fetch logs immediately and then every 2 seconds
    pollLogs();
    const interval = setInterval(pollLogs, 2000);

    return () => {
      clearInterval(interval);
      setWsConnection(null);
    };
  }, [bot?.status, botId]);


  // Auto-scroll console to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  // Simulate real-time performance stats
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
  }, [bot]);

  // Auto-refresh bot status every 10 seconds
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
      
      // Status change will be handled by the logs useEffect
      
      setBot(newBot);
      
      // Fetch guilds data for statistics (only if bot is online)
      if (newBot.status === 'ONLINE') {
        try {
          const guildsResponse = await botsAPI.getGuilds(botId);
          setGuilds(guildsResponse.data || []);
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
    
    // Add immediate feedback message
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] [container@fivebot]: Server marked as starting...`]);
    
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
    
    // Add immediate feedback message
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] [container@fivebot]: Server marked as stopping...`]);
    
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

  const generateInviteLink = async () => {
    try {
      const response = await botsAPI.getInviteLink(botId);
      const inviteUrl = response.data.inviteUrl;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied to clipboard');
      
      // Open in new tab
      window.open(inviteUrl, '_blank');
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error generating invite link');
    }
  };

  if (loading || botLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
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
          <div className="flex justify-between items-center py-6">
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          
          {/* Top Row - Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <button
              onClick={bot.status === 'OFFLINE' ? handleStart : handleStop}
              disabled={actionLoading === 'start' || actionLoading === 'stop'}
              className={`flex items-center justify-center space-x-3 p-4 rounded-xl border-2 transition-all ${
                bot.status === 'OFFLINE'
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                  : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
              } disabled:opacity-50`}
            >
              {actionLoading === 'start' || actionLoading === 'stop' ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : bot.status === 'OFFLINE' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"/>
                </svg>
              )}
              <span className="font-medium">
                {actionLoading === 'start' ? 'Starting...' : actionLoading === 'stop' ? 'Stopping...' : bot.status === 'OFFLINE' ? 'Start Bot' : 'Stop Bot'}
              </span>
            </button>

            <button
              onClick={() => router.push(`/bots/${botId}/config`)}
              className="flex items-center justify-center space-x-3 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
              </svg>
              <span className="font-medium">Configuration</span>
            </button>

            <button
              onClick={generateInviteLink}
              className="flex items-center justify-center space-x-3 p-4 rounded-xl border-2 border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd"/>
              </svg>
              <span className="font-medium">Generate Invite</span>
            </button>

            <button
              onClick={() => router.push(`/bots/${botId}/analytics`)}
              className="flex items-center justify-center space-x-3 p-4 rounded-xl border-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
              </svg>
              <span className="font-medium">Analytics</span>
            </button>
          </div>

          {/* Main Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Console - Large Center */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-96">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2 2a1 1 0 000 2h.01a1 1 0 100-2H5zm3 0a1 1 0 000 2h3a1 1 0 100-2H8z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Live Console</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {bot.status === 'ONLINE' && wsConnection ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-600 font-medium">Live</span>
                      </>
                    ) : bot.status === 'ONLINE' ? (
                      <>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-yellow-600 font-medium">Connecting...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-500">Offline</span>
                      </>
                    )}
                    <button
                      onClick={() => router.push(`/bots/${botId}/logs`)}
                      className="ml-3 px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      View Full Logs
                    </button>
                  </div>
                </div>

                <div 
                  ref={consoleRef}
                  className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono h-80 overflow-y-auto border border-gray-700"
                >
                  <div className="space-y-1">
                    {logs.length === 0 ? (
                      <div className="text-gray-500">Aucun log disponible...</div>
                    ) : (
                      logs.slice(-100).map((log, index) => {
                        // Parse the log format: [time] [prefix]: message
                        const logMatch = log.match(/\[(\d{2}:\d{2}:\d{2})\] \[([^\]]+)\]: (.*)/);
                        
                        if (logMatch) {
                          const [, time, prefix, message] = logMatch;
                          
                          // Determine prefix color based on source
                          let prefixColor = 'text-gray-400';
                          if (prefix.startsWith('discord@')) {
                            prefixColor = 'text-blue-400';
                          } else if (prefix.startsWith('container@')) {
                            prefixColor = 'text-yellow-400';
                          } else if (prefix.startsWith('cmd@')) {
                            prefixColor = 'text-purple-400';
                          } else if (prefix.startsWith('system@')) {
                            prefixColor = 'text-orange-400';
                          }
                          
                          // Determine message color based on content
                          let messageColor = 'text-gray-300';
                          if (message.includes('error') || message.includes('ERROR') || message.includes('failed')) {
                            messageColor = 'text-red-400';
                          } else if (message.includes('warning') || message.includes('WARN')) {
                            messageColor = 'text-yellow-300';
                          } else if (message.includes('success') || message.includes('online')) {
                            messageColor = 'text-green-400';
                          } else if (message.includes('offline')) {
                            messageColor = 'text-gray-500';
                          }
                          
                          return (
                            <div key={index} className="font-mono text-sm leading-relaxed hover:bg-gray-800 px-1 -mx-1 rounded">
                              <span className="text-gray-500">[{time}]</span>
                              <span className={`${prefixColor} ml-1`}>[{prefix}]:</span>
                              <span className={`${messageColor} ml-1`}>{message}</span>
                            </div>
                          );
                        } else {
                          // Fallback for logs without proper format
                          return (
                            <div key={index} className="text-gray-400 font-mono text-sm leading-relaxed">
                              {log}
                            </div>
                          );
                        }
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">CPU Usage</span>
                      <span className="font-medium">{bot.status === 'ONLINE' ? `${realTimeStats.cpuUsage.toFixed(1)}%` : '0%'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          realTimeStats.cpuUsage > 80 ? 'bg-red-500' :
                          realTimeStats.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: bot.status === 'ONLINE' ? `${realTimeStats.cpuUsage}%` : '0%' }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Memory Usage</span>
                      <span className="font-medium">{bot.status === 'ONLINE' ? `${realTimeStats.memoryUsage.toFixed(1)}%` : '0%'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          realTimeStats.memoryUsage > 80 ? 'bg-red-500' :
                          realTimeStats.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: bot.status === 'ONLINE' ? `${realTimeStats.memoryUsage}%` : '0%' }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Response Time</span>
                      <span className={`font-medium ${
                        realTimeStats.responseTime < 100 ? 'text-green-600' :
                        realTimeStats.responseTime < 300 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {bot.status === 'ONLINE' ? `${realTimeStats.responseTime.toFixed(0)}ms` : '0ms'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1-1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Statistics</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Servers</span>
                    <span className="font-semibold text-gray-900">{guilds.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Total Users</span>
                    <span className="font-semibold text-gray-900">
                      {bot.status === 'ONLINE' ? guilds.reduce((acc, guild) => acc + (guild.memberCount || 0), 0).toLocaleString() : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Messages</span>
                    <span className="font-semibold text-gray-900">{bot.status === 'ONLINE' ? realTimeStats.messageCount.toLocaleString() : '0'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Commands</span>
                    <span className="font-semibold text-gray-900">{bot.status === 'ONLINE' ? realTimeStats.commandCount.toLocaleString() : '0'}</span>
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