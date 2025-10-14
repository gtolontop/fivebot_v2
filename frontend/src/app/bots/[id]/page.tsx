'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, StatCard, Badge, Button } from '@/components/ui';
import { designTokens } from '@/styles/design-tokens';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  LinkIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CommandLineIcon,
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
  const [logs, setLogs] = useState<string[]>([]);
  const [realTimeStats, setRealTimeStats] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    uptime: 0,
    networkDownload: 0,
    networkUpload: 0,
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

  // Polling for logs
  useEffect(() => {
    if (!bot || bot.status !== 'ONLINE') {
      setLogs([]);
      return;
    }

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
            setLogs(data.logs.slice(-50)); // Keep last 50 logs
          }
        }
      } catch (error) {
        console.log('Could not fetch bot logs:', error);
      }
    };

    pollLogs();
    const interval = setInterval(pollLogs, 3000);

    return () => clearInterval(interval);
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

    try {
      await botsAPI.start(botId);
      toast.success('Bot is starting...');
      await fetchBot();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error starting bot');
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

  if (loading || botLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bot details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !bot) return null;

  // Use Discord CDN for avatar if clientId exists
  const botAvatar = bot.clientId
    ? `https://cdn.discordapp.com/avatars/${bot.clientId}/${bot.avatar || 'default'}.png?size=256`
    : `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.name}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="relative">
              <img
                src={botAvatar}
                alt={bot.name}
                className="w-20 h-20 rounded-xl border-2 border-gray-200 bg-white"
              />
              <div className="absolute -bottom-1 -right-1">
                <Badge status={bot.status as any} dot size="sm">
                  {bot.status}
                </Badge>
              </div>
            </div>

            {/* Bot Name & Info */}
            <div>
              <h1 className={designTokens.typography.h1 + ' text-gray-900'}>{bot.name}</h1>
              <p className="text-gray-500 text-sm">
                Created {new Date(bot.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
                {(bot.status === 'OFFLINE' || bot.status === 'ERROR') && (
                  <Button
                    variant="success"
                    onClick={handleStart}
                    loading={actionLoading === 'start'}
                    disabled={actionLoading !== null}
                    icon={<PlayIcon className="w-4 h-4" />}
                  >
                    Start Bot
                  </Button>
                )}

                {bot.status === 'ONLINE' && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={handleRestart}
                      loading={actionLoading === 'restart'}
                      disabled={actionLoading !== null}
                      icon={<ArrowPathIcon className="w-4 h-4" />}
                    >
                      Restart
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleStop}
                      loading={actionLoading === 'stop'}
                      disabled={actionLoading !== null}
                      icon={<StopIcon className="w-4 h-4" />}
                    >
                      Stop
                    </Button>
                  </>
                )}

                {bot.status === 'STARTING' && (
                  <Button variant="secondary" disabled loading>
                    Starting...
                  </Button>
                )}

                {bot.status === 'STOPPING' && (
                  <Button variant="secondary" disabled loading>
                    Stopping...
                  </Button>
                )}
              </div>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            fullWidth
            onClick={() => router.push(`/bots/${botId}/invite`)}
            icon={<LinkIcon className="w-5 h-5" />}
          >
            Invite Link
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => router.push(`/bots/${botId}/analytics`)}
            icon={<ChartBarIcon className="w-5 h-5" />}
          >
            Analytics
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => router.push(`/bots/${botId}/config`)}
            icon={<Cog6ToothIcon className="w-5 h-5" />}
          >
            Configuration
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={generateInviteLink}
            icon={<LinkIcon className="w-5 h-5" />}
          >
            Invite Link
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Servers"
            value={bot.status === 'ONLINE' ? guilds.length : 0}
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
              </svg>
            }
            color="blue"
          />

          <StatCard
            label="Uptime"
            value={bot.status === 'ONLINE' ? formatUptime(realTimeStats.uptime) : 'Offline'}
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
              </svg>
            }
            color="green"
          />

          <StatCard
            label="CPU Usage"
            value={bot.status === 'ONLINE' ? `${realTimeStats.cpuUsage.toFixed(1)}%` : '0%'}
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 7H7v6h6V7z"/>
                <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd"/>
              </svg>
            }
            color="orange"
          />

          <StatCard
            label="Memory"
            value={bot.status === 'ONLINE' ? `${realTimeStats.memoryUsage.toFixed(1)}%` : '0%'}
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"/>
                <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"/>
                <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"/>
              </svg>
            }
            color="purple"
          />

          <StatCard
            label="Network"
            value={bot.status === 'ONLINE' ? formatBytes(realTimeStats.networkDownload) : '0 B/s'}
            sublabel={bot.status === 'ONLINE' ? `↑ ${formatBytes(realTimeStats.networkUpload)}` : undefined}
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
            }
            color="green"
          />
        </div>

        {/* Console Preview */}
        {bot.status === 'ONLINE' && logs.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className={designTokens.typography.h2}>Console</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/bots/${botId}/console`)}
              >
                View Full Console
              </Button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs">
              {logs.map((log, index) => (
                <div key={index} className="py-0.5 text-gray-300">
                  {log}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Servers List */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className={designTokens.typography.h2 + ' mb-4'}>
                Servers ({guilds.length})
              </h2>

              {guilds.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {bot.status === 'ONLINE' ? 'No servers found' : 'Bot is offline'}
                </div>
              ) : (
                <div className="space-y-3">
                  {guilds.map((guild) => (
                    <div
                      key={guild.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                          {guild.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{guild.name}</p>
                          <p className="text-sm text-gray-500">{guild.memberCount.toLocaleString()} members</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Bot Information */}
          <div className="space-y-6">
            <Card>
              <h2 className={designTokens.typography.h2 + ' mb-4'}>Information</h2>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Prefix</span>
                  <p className="text-base font-semibold text-gray-900 mt-1 font-mono">{bot.prefix}</p>
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
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
