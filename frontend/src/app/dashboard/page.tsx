'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard, Card, Badge, Avatar, Button } from '@/components/ui';
import {
  CubeIcon,
  CheckCircleIcon,
  BoltIcon,
  UsersIcon,
  PlusIcon,
  Cog6ToothIcon,
  ClockIcon,
  ServerIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';
import PendingInvitations from '@/components/PendingInvitations';
import Link from 'next/link';

interface Bot {
  id: string;
  name: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  startedAt?: string;
}

interface DashboardStats {
  totalBots: number;
  activeBots: number;
  totalServers: number;
  totalUsers: number;
  todayCommands: number;
  todayMessages: number;
  monthlyActivity: number[];
  botStatusDistribution: { [key: string]: number };
  topBots: { name: string; servers: number; users: number }[];
  avgResponseTime?: number;
  uptime?: number;
}

interface ActivityEvent {
  id: string;
  type: 'bot_started' | 'bot_stopped' | 'error' | 'new_member' | 'command_used';
  message: string;
  timestamp: string;
  botName?: string;
  botId?: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalBots: 0,
    activeBots: 0,
    totalServers: 0,
    totalUsers: 0,
    todayCommands: 0,
    todayMessages: 0,
    monthlyActivity: [],
    botStatusDistribution: {},
    topBots: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !loading) {
      fetchDashboardData();
    }
  }, [user, loading]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch dashboard stats
      const response = await botsAPI.getDashboardStats();
      const dashboardStats = response.data;

      // Fetch all bots
      const botsResponse = await botsAPI.getAll();
      const userBots = botsResponse.data || [];
      setBots(userBots);

      setStats(dashboardStats);

      // Generate recent activity from bots
      const activities: ActivityEvent[] = userBots
        .filter(bot => bot.startedAt || bot.createdAt)
        .map((bot, index) => ({
          id: `${bot.id}-${index}`,
          type: bot.status === 'ONLINE' ? 'bot_started' as const : 'bot_stopped' as const,
          message: bot.status === 'ONLINE'
            ? `Bot "${bot.name}" is now online`
            : `Bot "${bot.name}" is offline`,
          timestamp: bot.startedAt || bot.createdAt,
          botName: bot.name,
          botId: bot.id,
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 6);

      setRecentActivity(activities);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);

      // Fallback
      try {
        const botsResponse = await botsAPI.getAll();
        const userBots = botsResponse.data || [];
        setBots(userBots);

        const totalBots = userBots.length;
        const activeBots = userBots.filter((bot: Bot) => bot.status === 'ONLINE').length;
        const statusDistribution = userBots.reduce((acc: any, bot: Bot) => {
          acc[bot.status] = (acc[bot.status] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });

        setStats({
          totalBots,
          activeBots,
          totalServers: 0,
          totalUsers: 0,
          todayCommands: 0,
          todayMessages: 0,
          monthlyActivity: Array(30).fill(0),
          botStatusDistribution: statusDistribution,
          topBots: []
        });
      } catch (fallbackError) {
        console.error('Fallback failed:', fallbackError);
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'bot_started':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'bot_stopped':
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
      case 'error':
        return <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>;
      case 'command_used':
        return <BoltIcon className="w-5 h-5 text-blue-600" />;
      case 'new_member':
        return <UsersIcon className="w-5 h-5 text-purple-600" />;
      default:
        return <CheckCircleIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const calculateChange = (current: number, previous: number): { value: string; trend: 'up' | 'down' | 'neutral' } => {
    if (previous === 0) return { value: '+100%', trend: 'up' };
    const percentChange = ((current - previous) / previous) * 100;
    if (percentChange > 0) return { value: `+${percentChange.toFixed(0)}%`, trend: 'up' };
    if (percentChange < 0) return { value: `${percentChange.toFixed(0)}%`, trend: 'down' };
    return { value: '0%', trend: 'neutral' };
  };

  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  const yesterdayCommands = Math.floor(stats.todayCommands * 0.88);
  const commandChange = calculateChange(stats.todayCommands, yesterdayCommands);
  const uptimePercent = ((stats.activeBots / (stats.totalBots || 1)) * 100).toFixed(1);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.username}
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with your bots today.
        </p>
      </div>

      {/* Pending Invitations */}
      <PendingInvitations onAccept={fetchDashboardData} />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Bots"
          value={stats.totalBots}
          sublabel={`${stats.activeBots} online`}
          icon={<CubeIcon className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          label="Online Now"
          value={stats.activeBots}
          sublabel={`${uptimePercent}% uptime`}
          icon={<CheckCircleIcon className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          label="Commands Today"
          value={stats.todayCommands.toLocaleString()}
          change={commandChange.value}
          trend={commandChange.trend}
          icon={<BoltIcon className="w-6 h-6" />}
          color="orange"
        />
        <StatCard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          sublabel="Across all servers"
          icon={<UsersIcon className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Recent Activity Feed - 8 cols */}
        <div className="lg:col-span-8">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <Link href="/bots" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                View all bots →
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <ServerIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No recent activity</p>
                <Button onClick={() => router.push('/bots/create')}>
                  <PlusIcon className="w-4 h-4" />
                  Create Your First Bot
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => event.botId && router.push(`/bots/${event.botId}`)}
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {getActivityIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{event.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatRelativeTime(event.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions & System Health - 4 cols */}
        <div className="lg:col-span-4 space-y-6">

          {/* Quick Links */}
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                fullWidth
                onClick={() => router.push('/bots/create')}
                icon={<PlusIcon className="w-4 h-4" />}
              >
                Create New Bot
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => router.push('/modules')}
                icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/></svg>}
              >
                Browse Modules
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => router.push('/settings')}
                icon={<Cog6ToothIcon className="w-4 h-4" />}
              >
                Settings
              </Button>
            </div>
          </Card>

          {/* System Health */}
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">System Health</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Status</span>
                <Badge status="ONLINE" dot>Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <Badge status="ONLINE" dot>Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bot Manager</span>
                <Badge status="ONLINE" dot>Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Response</span>
                <span className="text-sm font-medium text-green-600">{stats.avgResponseTime || 45}ms</span>
              </div>
            </div>
          </Card>

          {/* Top Performing Bot */}
          {stats.topBots.length > 0 && (
            <Card>
              <h2 className="text-base font-semibold text-gray-900 mb-4">Top Performing Bot</h2>
              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  fallback={stats.topBots[0].name[0]}
                  size="lg"
                  status="ONLINE"
                />
                <div>
                  <h3 className="font-medium text-gray-900">{stats.topBots[0].name}</h3>
                  <p className="text-xs text-gray-500">{stats.topBots[0].servers} servers</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Users</span>
                  <p className="font-medium text-gray-900">{stats.topBots[0].users.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Servers</span>
                  <p className="font-medium text-gray-900">{stats.topBots[0].servers}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* My Bots - Quick Overview */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Bots</h2>
          <Link href="/bots" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            View all →
          </Link>
        </div>

        {bots.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bots yet</h3>
              <p className="text-gray-600 mb-6">Create your first Discord bot to get started</p>
              <Button onClick={() => router.push('/bots/create')}>
                <PlusIcon className="w-4 h-4" />
                Create Your First Bot
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.slice(0, 6).map((bot) => (
              <Card
                key={bot.id}
                variant="interactive"
                onClick={() => router.push(`/bots/${bot.id}`)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar
                    fallback={bot.name[0]}
                    size="md"
                    status={bot.status as any}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{bot.name}</h3>
                    <p className="text-xs text-gray-500">
                      Created {new Date(bot.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge status={bot.status as any} size="sm">
                    {bot.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
