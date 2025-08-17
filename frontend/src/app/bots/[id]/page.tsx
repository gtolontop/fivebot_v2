'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import NotificationsCenter from '@/components/NotificationsCenter';
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
  const [fetchingBot, setFetchingBot] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
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

  // Polling pour récupérer les vrais logs
  useEffect(() => {
    if (!bot || bot.status !== 'ONLINE') {
      setWsConnection(null);
      return;
    }

    // Simulate connection state for UI
    setWsConnection({} as WebSocket);
    
    const pollLogs = async () => {
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
          console.log('Bot detail logs response:', data); // Debug
          if (data.logs && data.logs.length > 0) {
            // Replace logs instead of appending to avoid duplicates
            setLogs(data.logs.slice(-50));
          } else {
            setLogs([]);
          }
        }
      } catch (error) {
        console.log('Could not fetch bot logs:', error);
        setLogs([]);
      }
    };

    // Fetch logs immediately and then every 5 seconds (less frequent)
    pollLogs();
    const interval = setInterval(pollLogs, 5000);

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

  // Simulate real-time performance stats - only when online
  useEffect(() => {
    // Reset stats to 0 when bot goes offline
    if (!bot || bot.status !== 'ONLINE') {
      setRealTimeStats({
        cpuUsage: 0,
        memoryUsage: 0,
        uptime: 0,
        eventCount: 0,
        messageCount: 0,
        commandCount: 0,
        responseTime: 0
      });
      return;
    }

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
  }, [bot?.status]); // React to status changes

  // Auto-refresh bot status every 30 seconds (reduced frequency)
  useEffect(() => {
    if (!bot) return;

    const statusInterval = setInterval(() => {
      fetchBot();
    }, 30000);

    return () => clearInterval(statusInterval);
  }, [bot?.id]);

  const fetchBot = async () => {
    if (fetchingBot) return; // Prevent concurrent fetches
    setFetchingBot(true);
    
    try {
      const response = await botsAPI.getById(botId);
      const newBot = response.data;
      
      // Clear logs and reset when status changes
      if (bot && bot.status !== newBot.status) {
        setLogs([]); // Clear existing logs when status changes
        
        if (newBot.status === 'OFFLINE') {
          setLogs([`[${new Date().toLocaleTimeString()}] Bot is offline`]);
        } else if (newBot.status === 'STARTING') {
          setLogs([`[${new Date().toLocaleTimeString()}] Bot is starting...`]);
        }
      }
      
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
      setFetchingBot(false);
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
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error generating invite link');
    }
  };

  const viewLogs = () => {
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

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                </svg>
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
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414L7.586 12l-1.293 1.293a1 1 0 101.414 1.414L9 13.414l2.293 2.293a1 1 0 001.414-1.414L11.414 12l1.293-1.293z" clipRule="evenodd"/>
                </svg>
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
                      <div className="text-gray-500">No logs available...</div>
                    ) : (
                      logs.slice(-50).map((log, index) => (
                        <div 
                          key={index} 
                          className={`${index === logs.slice(-50).length - 1 ? 'text-green-300' : 'text-green-400'} leading-relaxed`}
                        >
                          {log}
                        </div>
                      ))
                    )}
                    {bot.status === 'ONLINE' && (
                      <div className="text-yellow-400 animate-pulse flex items-center space-x-1">
                        <span>●</span>
                        <span>Waiting for events...</span>
                      </div>
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
                    <div className="flex justify-between items-center text-sm mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">CPU Usage</span>
                        <span className="text-xs text-gray-400">of available cores</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {bot.status === 'ONLINE' ? `${realTimeStats.cpuUsage.toFixed(1)}%` : '0%'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          realTimeStats.cpuUsage > 80 ? 'bg-red-100 text-red-700' :
                          realTimeStats.cpuUsage > 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {bot.status === 'ONLINE' ? (
                            realTimeStats.cpuUsage > 80 ? 'High' :
                            realTimeStats.cpuUsage > 60 ? 'Medium' : 'Normal'
                          ) : 'Offline'}
                        </span>
                      </div>
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
                    <div className="flex justify-between items-center text-sm mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Memory Usage</span>
                        <span className="text-xs text-gray-400">of 512 MB allocated</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {bot.status === 'ONLINE' ? `${(realTimeStats.memoryUsage * 5.12).toFixed(0)} MB` : '0 MB'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          realTimeStats.memoryUsage > 80 ? 'bg-red-100 text-red-700' :
                          realTimeStats.memoryUsage > 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {bot.status === 'ONLINE' ? (
                            realTimeStats.memoryUsage > 80 ? 'High' :
                            realTimeStats.memoryUsage > 60 ? 'Medium' : 'Low'
                          ) : 'Offline'}
                        </span>
                      </div>
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
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Response Time</span>
                        <span className="text-xs text-gray-400">avg Discord API</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${
                          realTimeStats.responseTime < 100 ? 'text-green-600' :
                          realTimeStats.responseTime < 300 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {bot.status === 'ONLINE' ? `${realTimeStats.responseTime.toFixed(0)} ms` : '0 ms'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          realTimeStats.responseTime < 100 ? 'bg-green-100 text-green-700' :
                          realTimeStats.responseTime < 300 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {bot.status === 'ONLINE' ? (
                            realTimeStats.responseTime < 100 ? 'Fast' :
                            realTimeStats.responseTime < 300 ? 'Average' : 'Slow'
                          ) : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
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