'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  LinkIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ServerIcon,
  ClockIcon,
  CpuChipIcon,
  SignalIcon,
  ArrowTrendingUpIcon,
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
  avatar?: string;
  banner?: string;
}

export default function BotDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<Bot | null>(null);
  const [botLoading, setBotLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [realTimeStats, setRealTimeStats] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    uptime: 0,
    networkDownload: 0,
    networkUpload: 0,
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
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

  // Fetch metrics
  useEffect(() => {
    if (!bot || bot.status !== 'ONLINE') {
      setRealTimeStats({
        cpuUsage: 0,
        memoryUsage: 0,
        uptime: 0,
        networkDownload: 0,
        networkUpload: 0,
      });
      return;
    }

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
            setRealTimeStats({
              cpuUsage: data.metrics.cpuUsage || 0,
              memoryUsage: data.metrics.memoryUsage || 0,
              uptime: data.metrics.uptime || 0,
              networkDownload: data.metrics.networkDownload || 0,
              networkUpload: data.metrics.networkUpload || 0,
            });
          }
        }
      } catch (error) {
        // Silent fail
      }
    };

    fetchMetrics();
    const metricsInterval = setInterval(fetchMetrics, 3000);

    return () => clearInterval(metricsInterval);
  }, [bot?.status, botId]);

  // Parse ANSI color codes to Tailwind classes
  const parseAnsiColors = (text: string) => {
    const ansiRegex = /\x1b\[([0-9;]+)m/g;
    const parts: { text: string; color: string }[] = [];
    let lastIndex = 0;
    let currentColor = 'text-gray-300';

    const colorMap: Record<string, string> = {
      '0': 'text-gray-300',
      '30': 'text-gray-900',
      '31': 'text-red-400',
      '32': 'text-green-400',
      '33': 'text-yellow-400',
      '34': 'text-blue-400',
      '35': 'text-purple-400',
      '36': 'text-cyan-400',
      '37': 'text-gray-300',
      '90': 'text-gray-500',
      '91': 'text-red-300',
      '92': 'text-green-300',
      '93': 'text-yellow-300',
      '94': 'text-blue-300',
      '95': 'text-purple-300',
      '96': 'text-cyan-300',
      '97': 'text-white',
    };

    let match;
    while ((match = ansiRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const textPart = text.substring(lastIndex, match.index);
        parts.push({ text: textPart, color: currentColor });
      }

      const code = match[1].split(';')[0];
      currentColor = colorMap[code] || currentColor;

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), color: currentColor });
    }

    return parts.length > 0 ? parts : [{ text, color: 'text-gray-300' }];
  };

  // Polling for logs - ALWAYS active
  useEffect(() => {
    if (!bot) return;

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
        // Silent fail
      }
    };

    // Initial fetch
    pollLogs();

    // Poll every 2 seconds
    const logsInterval = setInterval(pollLogs, 2000);

    return () => clearInterval(logsInterval);
  }, [bot?.id, botId]);

  // Auto-scroll console when new logs arrive
  useEffect(() => {
    if (consoleRef.current && autoScroll) {
      const element = consoleRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleConsoleScroll = () => {
    if (consoleRef.current) {
      const element = consoleRef.current;
      const isAtBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 10;
      setAutoScroll(isAtBottom);
    }
  };

  // Auto-refresh status
  useEffect(() => {
    if (!bot) return;

    const interval = (bot.status === 'STARTING' || bot.status === 'STOPPING') ? 2000 : 10000;
    const statusInterval = setInterval(() => {
      fetchBot();
    }, interval);

    return () => clearInterval(statusInterval);
  }, [bot?.id, bot?.status]);

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
    setBot(prev => prev ? { ...prev, status: 'STARTING' } : null);

    try {
      await botsAPI.start(botId);
      toast.success('Bot is starting...');
      pollBotStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error starting bot');
      await fetchBot();
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    setActionLoading('stop');
    setBot(prev => prev ? { ...prev, status: 'STOPPING' } : null);

    try {
      await botsAPI.stop(botId);
      toast.success('Bot stopped');
      setTimeout(() => {
        setBot(prev => prev ? { ...prev, status: 'OFFLINE' } : null);
        setActionLoading(null);
      }, 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error stopping bot');
      await fetchBot();
      setActionLoading(null);
    }
  };

  const handleRestart = async () => {
    setActionLoading('restart');
    setBot(prev => prev ? { ...prev, status: 'STARTING' } : null);

    try {
      await botsAPI.start(botId, { force: true });
      toast.success('Bot restarting...');
      pollBotStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error restarting bot');
      await fetchBot();
    } finally {
      setActionLoading(null);
    }
  };

  const pollBotStatus = () => {
    let attempts = 0;
    const maxAttempts = 20;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await botsAPI.getStatus(botId);
        const status = response.data.status;

        setBot(prev => prev ? { ...prev, status } : null);

        if (status === 'ONLINE' || status === 'ERROR' || attempts >= maxAttempts) {
          clearInterval(interval);
          if (status === 'ONLINE') {
            toast.success('Bot is now online!');
            fetchBot(); // Refresh to get guilds
          }
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }
    }, 1000);
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

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(' ') : '< 1m';
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes.toFixed(1)} B/s`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'OFFLINE':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'STARTING':
      case 'STOPPING':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'ERROR':
        return 'text-danger-600 bg-danger-50 border-danger-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading || botLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading bot details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !bot) return null;

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            {/* Avatar & Info */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {bot.avatar ? (
                  <img
                    src={bot.avatar}
                    alt={bot.name}
                    className="w-16 h-16 rounded-xl shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl shadow-md flex items-center justify-center text-2xl font-bold text-gray-600">
                    {bot.name[0].toUpperCase()}
                  </div>
                )}
                {bot.status === 'ONLINE' && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success-500 border-3 border-white rounded-full"></div>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">{bot.name}</h1>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-mono">
                  {bot.clientId && (
                    <span>Client: {bot.clientId}</span>
                  )}
                  <span>•</span>
                  <span>Bot: {bot.id}</span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div>
              <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg border ${getStatusColor(bot.status)}`}>
                {bot.status}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
              {(bot.status === 'OFFLINE' || bot.status === 'ERROR') && (
                <button
                  onClick={handleStart}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-2 px-6 py-2.5 bg-success-600 text-white font-semibold rounded-lg hover:bg-success-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlayIcon className="w-5 h-5" />
                  Start Bot
                </button>
              )}

              {bot.status === 'ONLINE' && (
                <>
                  <button
                    onClick={handleRestart}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <ArrowPathIcon className="w-5 h-5" />
                    Restart
                  </button>
                  <button
                    onClick={handleStop}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-2 px-4 py-2.5 bg-danger-600 text-white font-semibold rounded-lg hover:bg-danger-700 transition-colors disabled:opacity-50"
                  >
                    <StopIcon className="w-5 h-5" />
                    Stop
                  </button>
                </>
              )}

              {(bot.status === 'STARTING' || bot.status === 'STOPPING') && (
                <button
                  disabled
                  className="flex items-center gap-2 px-6 py-2.5 bg-warning-600 text-white font-semibold rounded-lg opacity-75 cursor-not-allowed"
                >
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {bot.status === 'STARTING' ? 'Starting...' : 'Stopping...'}
                </button>
              )}

              <Link
                href={`/bots/${botId}/servers`}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors ml-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                Servers
              </Link>

              <Link
                href={`/bots/${botId}/config`}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Cog6ToothIcon className="w-5 h-5" />
                Config
              </Link>

              <Link
                href={`/bots/${botId}/analytics`}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChartBarIcon className="w-5 h-5" />
                Analytics
              </Link>
            </div>
        </div>

        {/* Stats Grid - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Servers */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <ServerIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {bot.status === 'ONLINE' ? guilds.length : '—'}
                </div>
                <p className="text-xs font-medium text-gray-600">Servers</p>
              </div>
            </div>
          </div>

          {/* Uptime */}
          <div className="bg-gradient-to-br from-success-50 to-green-50 rounded-xl p-4 border border-success-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <ClockIcon className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-success-600">
                  {bot.status === 'ONLINE' ? formatUptime(realTimeStats.uptime) : '—'}
                </div>
                <p className="text-xs font-medium text-gray-600">Uptime</p>
              </div>
            </div>
          </div>

          {/* CPU */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <CpuChipIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {bot.status === 'ONLINE' ? `${realTimeStats.cpuUsage.toFixed(1)}%` : '—'}
                </div>
                <p className="text-xs font-medium text-gray-600">CPU</p>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <SignalIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {bot.status === 'ONLINE' ? `${realTimeStats.memoryUsage.toFixed(1)}%` : '—'}
                </div>
                <p className="text-xs font-medium text-gray-600">RAM</p>
              </div>
            </div>
          </div>

          {/* Network Download */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {bot.status === 'ONLINE' ? formatBytes(realTimeStats.networkDownload) : '—'}
                </div>
                <p className="text-xs font-medium text-gray-600">↓ Down</p>
              </div>
            </div>
          </div>

          {/* Network Upload */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {bot.status === 'ONLINE' ? formatBytes(realTimeStats.networkUpload) : '—'}
                </div>
                <p className="text-xs font-medium text-gray-600">↑ Up</p>
              </div>
            </div>
          </div>
        </div>

        {/* Console + Servers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Console - Takes 2/3 */}
          <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span className="text-gray-400 font-mono text-sm">Console</span>
            </div>
            <div className="flex items-center gap-2">
              {!autoScroll && (
                <button
                  onClick={() => {
                    setAutoScroll(true);
                    if (consoleRef.current) {
                      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
                    }
                  }}
                  className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200 transition-colors mr-2"
                >
                  Resume scroll
                </button>
              )}
              {bot.status === 'ONLINE' ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-success-900/30 border border-success-500/30 rounded-lg">
                  <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                  <span className="text-success-400 text-xs font-semibold">LIVE</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-700/30 border border-gray-600/30 rounded-lg">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span className="text-gray-400 text-xs font-semibold">OFFLINE</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div
              ref={consoleRef}
              onScroll={handleConsoleScroll}
              className="h-96 overflow-y-auto font-mono text-sm p-4 space-y-0.5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
            >
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  {bot.status === 'ONLINE' ? (
                    <>
                      <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>Waiting for logs...</p>
                    </>
                  ) : (
                    <>
                      <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p>Bot is offline</p>
                      <p className="text-xs mt-1">Start the bot to see console logs</p>
                    </>
                  )}
                </div>
              ) : (
                logs.slice(-200).map((log, index) => {
                  const logMatch = log.match(/\[(\d{2}:\d{2}:\d{2})\] \[([^\]]+)\]: (.*)/);

                  if (logMatch) {
                    const [, time, prefix, message] = logMatch;

                    let prefixColor = 'text-gray-400';
                    if (prefix.includes('bot@')) prefixColor = 'text-blue-400';
                    else if (prefix.includes('container@')) prefixColor = 'text-yellow-400';
                    else if (prefix.includes('system@')) prefixColor = 'text-green-400';

                    const messageParts = parseAnsiColors(message);

                    return (
                      <div key={index} className="py-0.5 hover:bg-gray-800/50 -mx-2 px-2 rounded transition-colors">
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

                  const parts = parseAnsiColors(log);
                  return (
                    <div key={index} className="py-0.5 hover:bg-gray-800/50 -mx-2 px-2 rounded transition-colors">
                      {parts.map((part, i) => (
                        <span key={i} className={part.color}>{part.text}</span>
                      ))}
                    </div>
                  );
                })
              )}
            </div>

            {/* Gradient overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
          </div>
        </div>

          {/* Servers List - Takes 1/3 */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">Connected Servers</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {bot.status === 'ONLINE' ? `${guilds.length} servers` : 'Offline'}
              </p>
            </div>

            {bot.status === 'ONLINE' && guilds.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {guilds.map((guild) => (
                  <div
                    key={guild.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/30 transition-all"
                  >
                    {guild.icon ? (
                      <img
                        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith('a_') ? 'gif' : 'png'}?size=64`}
                        alt={guild.name}
                        className="w-10 h-10 rounded-lg flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {guild.name[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{guild.name}</p>
                      <p className="text-xs text-gray-500">
                        {guild.memberCount.toLocaleString()} members
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <ServerIcon className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">
                  {bot.status === 'ONLINE' ? 'No servers' : 'Bot is offline'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
