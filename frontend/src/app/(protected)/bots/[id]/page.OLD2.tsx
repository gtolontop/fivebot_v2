'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { Card, PanelCard, Badge, Avatar, Button } from '@/components/ui';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  LinkIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  TrashIcon,
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
  const [realTimeStats, setRealTimeStats] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    uptime: 0,
    networkDownload: 0,
    networkUpload: 0,
  });
  const consoleRef = useRef<HTMLDivElement>(null);
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

  // Polling for logs
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
      const interval = setInterval(pollLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [bot?.status, botId]);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current && autoScroll) {
      const element = consoleRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Fetch metrics
  useEffect(() => {
    if (!bot || bot.status !== 'ONLINE') {
      setRealTimeStats(prev => ({ ...prev, uptime: 0 }));
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
            setRealTimeStats(prev => ({
              ...prev,
              cpuUsage: data.metrics.cpuUsage || 0,
              memoryUsage: data.metrics.memoryUsage || 0,
              networkDownload: data.metrics.networkDownload || 0,
              networkUpload: data.metrics.networkUpload || 0,
            }));
          }
        }
      } catch (error) {
        // Silent fail
      }
    };

    const metricsInterval = setInterval(fetchMetrics, 10000);
    fetchMetrics();

    return () => clearInterval(metricsInterval);
  }, [bot?.status, bot?.startedAt, botId]);

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

  if (loading || botLoading) {
    return (
      <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bot details...</p>
          </div>
        </div>
    );
  }

  if (!user || !bot) return null;

  return (
    {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Avatar
            fallback={bot.name[0]}
            size="xl"
            status={bot.status as any}
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{bot.name}</h1>
            <p className="text-gray-600 mt-1">Bot ID: {bot.id}</p>
          </div>
        </div>
        <Badge status={bot.status as any} size="md">
          {bot.status}
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Button
          variant="outline"
          fullWidth
          onClick={() => router.push(`/bots/${botId}/console`)}
          icon={<CommandLineIcon className="w-4 h-4" />}
        >
          Console
        </Button>
        <Button
          variant="outline"
          fullWidth
          onClick={() => router.push(`/bots/${botId}/analytics`)}
          icon={<ChartBarIcon className="w-4 h-4" />}
        >
          Analytics
        </Button>
        <Button
          variant="outline"
          fullWidth
          onClick={() => router.push(`/bots/${botId}/config`)}
          icon={<Cog6ToothIcon className="w-4 h-4" />}
        >
          Settings
        </Button>
        <Button
          variant="outline"
          fullWidth
          onClick={generateInviteLink}
          icon={<LinkIcon className="w-4 h-4" />}
        >
          Invite Link
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - Console Preview */}
        <div className="lg:col-span-2">
          <PanelCard
            title="Console"
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/bots/${botId}/console`)}
              >
                View Full Console
              </Button>
            }
          >
            <div
              ref={consoleRef}
              className="bg-gray-900 text-gray-100 p-4 rounded-lg h-96 overflow-y-auto font-mono text-xs"
            >
              {logs.length === 0 ? (
                <div className="text-gray-500">Waiting for logs...</div>
              ) : (
                logs.slice(-50).map((log, index) => (
                  <div key={index} className="py-0.5">
                    {log}
                  </div>
                ))
              )}
            </div>
          </PanelCard>

          {/* Server Information */}
          {guilds.length > 0 && (
            <Card className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Servers</h2>
              <div className="space-y-2">
                {guilds.slice(0, 5).map((guild) => (
                  <div key={guild.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{guild.name}</p>
                      <p className="text-xs text-gray-500">{guild.memberCount} members</p>
                    </div>
                  </div>
                ))}
                {guilds.length > 5 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    And {guilds.length - 5} more servers...
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Controls & Stats */}
        <div className="space-y-6">

          {/* Control Panel */}
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Control Panel</h2>
            <div className="space-y-3">
              <Button
                variant="success"
                fullWidth
                onClick={handleStart}
                disabled={bot.status !== 'OFFLINE' || actionLoading !== null}
                loading={actionLoading === 'start' || bot.status === 'STARTING'}
                icon={<PlayIcon className="w-4 h-4" />}
              >
                {bot.status === 'STARTING' ? 'Starting...' : 'Start'}
              </Button>

              <Button
                variant="secondary"
                fullWidth
                onClick={handleRestart}
                disabled={bot.status !== 'ONLINE' || actionLoading !== null}
                loading={actionLoading === 'restart'}
                icon={<ArrowPathIcon className="w-4 h-4" />}
              >
                Restart
              </Button>

              <Button
                variant="danger"
                fullWidth
                onClick={handleStop}
                disabled={bot.status !== 'ONLINE' || actionLoading !== null}
                loading={actionLoading === 'stop'}
                icon={<StopIcon className="w-4 h-4" />}
              >
                Stop
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                fullWidth
                onClick={handleDelete}
                icon={<TrashIcon className="w-4 h-4" />}
                className="text-red-600 hover:bg-red-50 border-red-200"
              >
                Delete Bot
              </Button>
            </div>
          </Card>

          {/* Live Metrics */}
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Live Metrics</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">CPU Load</span>
                  <span className="text-sm font-semibold text-gray-900">{realTimeStats.cpuUsage.toFixed(0)}%</span>
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
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Memory</span>
                  <span className="text-sm font-semibold text-gray-900">{realTimeStats.memoryUsage.toFixed(0)}%</span>
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

              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Servers</span>
                  <span className="text-sm font-medium text-gray-900">
                    {bot.status === 'ONLINE' ? guilds.length : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="text-sm font-medium text-gray-900">
                    {bot.status === 'ONLINE' ? formatUptime(realTimeStats.uptime) : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Network ⬇</span>
                  <span className="text-sm font-medium text-gray-900">
                    {bot.status === 'ONLINE' ? `${realTimeStats.networkDownload.toFixed(1)} KB/s` : '0 KB/s'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Network ⬆</span>
                  <span className="text-sm font-medium text-gray-900">
                    {bot.status === 'ONLINE' ? `${realTimeStats.networkUpload.toFixed(1)} KB/s` : '0 KB/s'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Bot Info */}
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Created</span>
                <p className="font-medium text-gray-900">{new Date(bot.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">Prefix</span>
                <p className="font-medium text-gray-900">{bot.prefix}</p>
              </div>
              {bot.clientId && (
                <div>
                  <span className="text-gray-500">Client ID</span>
                  <p className="font-medium text-gray-900 font-mono text-xs">{bot.clientId}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
  );
}
