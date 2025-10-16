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
  WifiIcon
} from '@heroicons/react/24/outline';

interface Bot {
  id: string;
  name: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  startedAt?: string;
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
  discordTag?: string; // Bot username with discriminator (e.g., "BotName#1234")
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
    responseTime: 0,
    networkDownload: 0,
    networkUpload: 0
  });
  const consoleRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'performance' | 'settings'>('console');
  const [autoScroll, setAutoScroll] = useState(true);

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

  // Auto-scroll console only when enabled and user is at bottom
  useEffect(() => {
    if (consoleRef.current && activeTab === 'console' && autoScroll) {
      const element = consoleRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [logs, activeTab, autoScroll]);

  // Handle scroll events to detect if user scrolled up
  const handleConsoleScroll = () => {
    if (consoleRef.current) {
      const element = consoleRef.current;
      const isAtBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 10;
      setAutoScroll(isAtBottom);
    }
  };

  // Parse ANSI color codes to Tailwind classes
  const parseAnsiColors = (text: string) => {
    // Remove ANSI codes and return plain text with inline styles
    const ansiRegex = /\x1b\[([0-9;]+)m/g;
    const parts: { text: string; color: string }[] = [];
    let lastIndex = 0;
    let currentColor = 'text-gray-300';

    const colorMap: Record<string, string> = {
      '0': 'text-gray-300',     // Reset
      '30': 'text-gray-900',    // Black
      '31': 'text-red-400',     // Red
      '32': 'text-green-400',   // Green
      '33': 'text-yellow-400',  // Yellow
      '34': 'text-blue-400',    // Blue
      '35': 'text-purple-400',  // Magenta
      '36': 'text-cyan-400',    // Cyan
      '37': 'text-gray-300',    // White
      '90': 'text-gray-500',    // Bright Black (Gray)
      '91': 'text-red-300',     // Bright Red
      '92': 'text-green-300',   // Bright Green
      '93': 'text-yellow-300',  // Bright Yellow
      '94': 'text-blue-300',    // Bright Blue
      '95': 'text-purple-300',  // Bright Magenta
      '96': 'text-cyan-300',    // Bright Cyan
      '97': 'text-white',       // Bright White
    };

    let match;
    while ((match = ansiRegex.exec(text)) !== null) {
      // Add text before this code
      if (match.index > lastIndex) {
        const textPart = text.substring(lastIndex, match.index);
        parts.push({ text: textPart, color: currentColor });
      }

      // Update color based on code
      const code = match[1].split(';')[0]; // Take first code
      currentColor = colorMap[code] || currentColor;

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), color: currentColor });
    }

    return parts.length > 0 ? parts : [{ text, color: 'text-gray-300' }];
  };

  // Calcul de l'uptime réel basé sur startedAt
  const calculateRealUptime = () => {
    if (!bot?.startedAt || bot.status !== 'ONLINE') return 0;
    const startTime = new Date(bot.startedAt).getTime();
    const currentTime = Date.now();
    const uptimeSeconds = Math.floor((currentTime - startTime) / 1000);
    // Prevent negative uptime (clock sync issues)
    return Math.max(0, uptimeSeconds);
  };

  // Simulation des stats temps réel avec uptime réel
  useEffect(() => {
    if (!bot || bot.status !== 'ONLINE') {
      setRealTimeStats(prev => ({ ...prev, uptime: 0 }));
      return;
    }

    // Initialiser l'uptime réel
    setRealTimeStats(prev => ({ ...prev, uptime: calculateRealUptime() }));

    // Fetch real metrics from backend
    const fetchMetrics = async () => {
      try {
        const token = Cookies.get('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/bots/${botId}/metrics/process`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.metrics) {
            setRealTimeStats(prev => ({
              ...prev,
              cpuUsage: data.metrics.cpuUsage || 0,
              memoryUsage: data.metrics.memoryUsage || 0,
              networkDownload: data.metrics.networkDownload || 0,
              networkUpload: data.metrics.networkUpload || 0,
              uptime: calculateRealUptime(), // Use calculated uptime for accuracy
            }));
          }
        }
      } catch (error) {
        // Silently fail - keep old values
      }
    };

    // Fetch metrics every 10 seconds
    const metricsInterval = setInterval(fetchMetrics, 10000);
    fetchMetrics(); // Initial fetch

    // Update uptime every second for smooth display
    const uptimeInterval = setInterval(() => {
      setRealTimeStats(prev => ({
        ...prev,
        uptime: calculateRealUptime(),
      }));
    }, 1000);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(uptimeInterval);
    };
  }, [bot?.status, bot?.startedAt, botId]);

  // Auto-refresh du statut
  useEffect(() => {
    if (!bot) return;

    // Check more frequently when bot is starting or stopping
    const interval = (bot.status === 'STARTING' || bot.status === 'STOPPING') ? 2000 : 10000;
    
    const statusInterval = setInterval(() => {
      fetchBot();
    }, interval);

    return () => clearInterval(statusInterval);
  }, [bot?.id, bot?.status]);

  // Clear action loading when bot status changes
  useEffect(() => {
    if (bot && actionLoading === 'start' && bot.status === 'ONLINE') {
      setActionLoading(null);
    }
  }, [bot?.status, actionLoading]);

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
      toast.success('Bot is starting...');
      await fetchBot();
      // Don't clear actionLoading here if bot is in STARTING state
      // It will be cleared when bot status changes to ONLINE
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error starting bot');
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
      case 'STOPPING': return 'text-orange-600 bg-orange-100';
      case 'ERROR': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
              {bot.status === 'STOPPING' && <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />}
              {bot.status}
            </span>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Console - Left Side (2/3 width) */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6 h-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Console</h3>
                  {bot.status === 'ONLINE' && wsConnection ? (
                    <div className="flex items-center text-green-600">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-1.5 sm:mr-2"></div>
                      <span className="text-xs sm:text-sm">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-400">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-1.5 sm:mr-2"></div>
                      <span className="text-xs sm:text-sm">Disconnected</span>
                    </div>
                  )}
                </div>
                {!autoScroll && (
                  <button
                    onClick={() => {
                      setAutoScroll(true);
                      if (consoleRef.current) {
                        consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
                      }
                    }}
                    className="px-2 sm:px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200 transition-colors whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Auto-scroll paused • Click to resume</span>
                    <span className="sm:hidden">Resume scroll</span>
                  </button>
                )}
              </div>

              <div
                ref={consoleRef}
                onScroll={handleConsoleScroll}
                className="bg-gray-900 text-gray-100 p-3 sm:p-4 rounded-lg h-[400px] sm:h-[500px] lg:h-[600px] overflow-y-auto font-mono text-xs sm:text-sm"
                style={{ scrollbarGutter: 'stable' }}
              >
                {logs.length === 0 ? (
                  <div className="text-gray-500">Waiting for logs...</div>
                ) : (
                  logs.slice(-200).map((log, index) => {
                    const logMatch = log.match(/\[(\d{2}:\d{2}:\d{2})\] \[([^\]]+)\]: (.*)/);

                    if (logMatch) {
                      const [, time, prefix, message] = logMatch;

                      let prefixColor = 'text-gray-400';
                      if (prefix.includes('bot@')) prefixColor = 'text-blue-400';
                      else if (prefix.includes('container@')) prefixColor = 'text-yellow-400';
                      else if (prefix.includes('system@')) prefixColor = 'text-green-400';

                      // Parse ANSI colors in the message
                      const messageParts = parseAnsiColors(message);

                      return (
                        <div key={index} className="py-0.5 hover:bg-gray-800 -mx-2 px-2 rounded transition-colors">
                          <span className="text-gray-500">[{time}]</span>
                          <span className={`${prefixColor} ml-2`}>[{prefix}]:</span>
                          <span className="ml-2">
                            {messageParts.map((part, i) => (
                              <span key={i} className={part.color}>{part.text}</span>
                            ))}
                          </span>
                        </div>
                      );
                    }

                    // For logs without standard format, parse ANSI colors
                    const parts = parseAnsiColors(log);
                    return (
                      <div key={index} className="py-0.5">
                        {parts.map((part, i) => (
                          <span key={i} className={part.color}>{part.text}</span>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Controls and Stats - Right Side (1/3 width) */}
          <div className="space-y-4 sm:space-y-6">
            {/* Control Buttons */}
            <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Control Panel</h3>
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={handleStart}
                  disabled={bot.status !== 'OFFLINE' || actionLoading !== null}
                  className="w-full inline-flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {(actionLoading === 'start' || bot.status === 'STARTING') ? (
                    <ArrowPathIcon className="w-4 sm:w-5 h-4 sm:h-5 mr-2 animate-spin" />
                  ) : (
                    <PlayIcon className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                  )}
                  {bot.status === 'STARTING' ? 'Starting...' : 'Start'}
                </button>

                <button
                  onClick={handleRestart}
                  disabled={bot.status !== 'ONLINE' || actionLoading !== null}
                  className="w-full inline-flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {actionLoading === 'restart' ? (
                    <ArrowPathIcon className="w-4 sm:w-5 h-4 sm:h-5 mr-2 animate-spin" />
                  ) : (
                    <ArrowPathIcon className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                  )}
                  Restart
                </button>

                <button
                  onClick={handleStop}
                  disabled={bot.status !== 'ONLINE' || actionLoading !== null}
                  className="w-full inline-flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {actionLoading === 'stop' ? (
                    <ArrowPathIcon className="w-4 sm:w-5 h-4 sm:h-5 mr-2 animate-spin" />
                  ) : (
                    <StopIcon className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                  )}
                  {actionLoading === 'stop' && bot.status === 'STOPPING' ? 'Kill' : 'Stop'}
                </button>
              </div>

              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 space-y-2 sm:space-y-3">
                <button
                  onClick={() => router.push(`/bots/${botId}/config`)}
                  className="w-full inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                >
                  <CogIcon className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Settings
                </button>

                <button
                  onClick={generateInviteLink}
                  className="w-full inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                >
                  <LinkIcon className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Invite Link
                </button>

                <button
                  onClick={() => router.push(`/bots/${botId}/analytics`)}
                  className="w-full inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                >
                  <ChartBarIcon className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Analytics
                </button>
              </div>
            </div>

            {/* Bot Information */}
            <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Information</h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Servers</div>
                  <div className="mt-1 text-xs sm:text-sm text-gray-900 font-semibold">
                    {bot.status === 'ONLINE' ? (realTimeStats.cpuUsage > 0 ? `${guilds.length} servers` : 'Loading...') : 'Offline'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">CPU Load</div>
                    <div className="mt-1">
                      <div className="flex items-baseline">
                        <span className="text-lg sm:text-2xl font-semibold text-gray-900">{realTimeStats.cpuUsage.toFixed(0)}</span>
                        <span className="ml-1 text-xs sm:text-sm text-gray-600">%</span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            realTimeStats.cpuUsage > 80 ? 'bg-red-500' :
                            realTimeStats.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${realTimeStats.cpuUsage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Memory</div>
                    <div className="mt-1">
                      <div className="flex items-baseline">
                        <span className="text-lg sm:text-2xl font-semibold text-gray-900">{realTimeStats.memoryUsage.toFixed(0)}</span>
                        <span className="ml-1 text-xs sm:text-sm text-gray-600">%</span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
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
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Uptime</div>
                  <div className="mt-1 text-xs sm:text-sm text-gray-900 font-medium">
                    {bot.status === 'ONLINE' ? formatUptime(realTimeStats.uptime) : 'Offline'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Network ⬇</div>
                    <div className="mt-1 text-xs sm:text-sm text-gray-900 font-medium">
                      {bot.status === 'ONLINE' ? `${realTimeStats.networkDownload.toFixed(1)} KB/s` : '0 KB/s'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Network ⬆</div>
                    <div className="mt-1 text-xs sm:text-sm text-gray-900 font-medium">
                      {bot.status === 'ONLINE' ? `${realTimeStats.networkUpload.toFixed(1)} KB/s` : '0 KB/s'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Quick Stats</h3>
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Servers</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">{guilds.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Total Users</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {guilds.reduce((acc, guild) => acc + (guild.memberCount || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Messages</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">{realTimeStats.messageCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Commands</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">{realTimeStats.commandCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}