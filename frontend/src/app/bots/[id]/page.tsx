'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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

  // Fetch metrics
  useEffect(() => {
    if (!bot || bot.status !== 'ONLINE') {
      setRealTimeStats({
        cpuUsage: 0,
        memoryUsage: 0,
        uptime: 0,
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
        {/* Header with Banner */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
          {/* Banner */}
          <div className="relative h-32 bg-gradient-to-br from-primary-400 to-primary-600 overflow-hidden">
            {bot.banner ? (
              <img src={bot.banner} alt={`${bot.name} banner`} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600"></div>
            )}
          </div>

          {/* Header Content */}
          <div className="p-6 pt-0">
            <div className="flex items-end justify-between -mt-12 mb-6">
              {/* Avatar & Name */}
              <div className="flex items-end gap-4">
                <div className="relative">
                  {bot.avatar ? (
                    <img
                      src={bot.avatar}
                      alt={bot.name}
                      className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-gray-600">
                      {bot.name[0].toUpperCase()}
                    </div>
                  )}
                  {bot.status === 'ONLINE' && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success-500 border-4 border-white rounded-full"></div>
                  )}
                </div>

                <div className="pb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{bot.name}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Created {new Date(bot.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="pb-2">
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

              <button
                onClick={generateInviteLink}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors ml-auto"
              >
                <LinkIcon className="w-5 h-5" />
                Invite Link
              </button>

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
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Servers */}
          <div className="group bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100 hover:border-blue-300 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <ServerIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-blue-600">
                {bot.status === 'ONLINE' ? guilds.length : 0}
              </div>
              <p className="text-sm font-semibold text-gray-900">Servers</p>
              <p className="text-xs text-gray-500">
                {bot.status === 'ONLINE' ? 'Connected' : 'Offline'}
              </p>
            </div>
          </div>

          {/* Uptime */}
          <div className="group bg-gradient-to-br from-success-50 to-green-50 rounded-xl p-5 border border-success-100 hover:border-success-300 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <ClockIcon className="w-6 h-6 text-success-600" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-success-600">
                {bot.status === 'ONLINE' ? formatUptime(realTimeStats.uptime) : '—'}
              </div>
              <p className="text-sm font-semibold text-gray-900">Uptime</p>
              <p className="text-xs text-gray-500">
                {bot.status === 'ONLINE' ? 'Running' : 'Not running'}
              </p>
            </div>
          </div>

          {/* CPU */}
          <div className="group bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-100 hover:border-orange-300 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <CpuChipIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-orange-600">
                {bot.status === 'ONLINE' ? `${realTimeStats.cpuUsage.toFixed(1)}%` : '0%'}
              </div>
              <p className="text-sm font-semibold text-gray-900">CPU Usage</p>
              <p className="text-xs text-gray-500">System resources</p>
            </div>
          </div>

          {/* Memory */}
          <div className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100 hover:border-purple-300 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <SignalIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-purple-600">
                {bot.status === 'ONLINE' ? `${realTimeStats.memoryUsage.toFixed(1)}%` : '0%'}
              </div>
              <p className="text-sm font-semibold text-gray-900">Memory</p>
              <p className="text-xs text-gray-500">RAM usage</p>
            </div>
          </div>
        </div>

        {/* Servers List */}
        {bot.status === 'ONLINE' && guilds.length > 0 && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Connected Servers</h2>
                <p className="text-xs text-gray-500 mt-0.5">{guilds.length} servers total</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guilds.slice(0, 6).map((guild) => (
                <div
                  key={guild.id}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/30 transition-all"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {guild.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{guild.name}</p>
                    <p className="text-xs text-gray-500">
                      {guild.memberCount.toLocaleString()} members
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {guilds.length > 6 && (
              <div className="mt-4 text-center">
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  View all {guilds.length} servers →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bot Info */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Bot Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Prefix</span>
              <p className="text-lg font-bold text-gray-900 mt-1 font-mono">{bot.prefix}</p>
            </div>

            {bot.clientId && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Client ID</span>
                <p className="text-sm font-mono text-gray-900 mt-1 break-all">{bot.clientId}</p>
              </div>
            )}

            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Bot ID</span>
              <p className="text-sm font-mono text-gray-900 mt-1 break-all">{bot.id}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
