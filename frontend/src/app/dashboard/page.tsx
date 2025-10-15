'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge, Avatar } from '@/components/ui';
import {
  CubeIcon,
  CheckCircleIcon,
  PlusIcon,
  ClockIcon,
  ServerIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
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
      {/* Hero Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome back, {user.username} 👋
            </h1>
            <p className="text-lg text-gray-600">
              Manage your Discord bots and track their performance
            </p>
          </div>
          <Link
            href="/bots/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
          >
            <PlusIcon className="w-5 h-5" />
            Create Bot
          </Link>
        </div>
      </div>

      {/* Pending Invitations */}
      <PendingInvitations onAccept={fetchDashboardData} />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Bots Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <CubeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <Link href="/bots" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              View all →
            </Link>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Total Bots</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalBots}</p>
            <p className="text-sm text-gray-500">{stats.activeBots} currently online</p>
          </div>
        </div>

        {/* Active Bots Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
              {uptimePercent}% uptime
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Active Now</p>
            <p className="text-3xl font-bold text-gray-900">{stats.activeBots}</p>
            <p className="text-sm text-gray-500">Running smoothly</p>
          </div>
        </div>

        {/* Credits Card */}
        <div className="bg-gradient-to-br from-purple-500 to-primary-600 rounded-xl p-6 shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <Link href="/settings/billing" className="text-sm font-medium text-white hover:underline">
              Add credits →
            </Link>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-purple-100">Available Credits</p>
            <p className="text-3xl font-bold">{user.credits}</p>
            <p className="text-sm text-purple-100">Ready to use</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bots - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Your Bots</h2>
                  <p className="text-sm text-gray-500 mt-1">Manage and monitor your Discord bots</p>
                </div>
                <Link href="/bots" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                  View all →
                </Link>
              </div>
            </div>

            <div className="p-6">
              {bots.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CubeIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No bots yet</h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    Create your first Discord bot and start building amazing features for your community
                  </p>
                  <Link
                    href="/bots/create"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Create Your First Bot
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {bots.slice(0, 5).map((bot) => (
                    <Link
                      key={bot.id}
                      href={`/bots/${bot.id}`}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-primary-300 transition-all group"
                    >
                      <div className="relative">
                        <Avatar
                          fallback={bot.name[0]}
                          size="lg"
                          status={bot.status as any}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {bot.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Created {new Date(bot.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge status={bot.status as any} size="sm">
                        {bot.status}
                      </Badge>
                    </Link>
                  ))}
                  {bots.length > 5 && (
                    <Link
                      href="/bots"
                      className="block text-center py-3 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      View {bots.length - 5} more bots →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & Info - Takes 1 column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/bots/create"
                className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors group"
              >
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <PlusIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 group-hover:text-primary-700">Create Bot</p>
                  <p className="text-xs text-gray-500">Add a new Discord bot</p>
                </div>
              </Link>

              <Link
                href="/modules"
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Browse Modules</p>
                  <p className="text-xs text-gray-500">Add features to your bots</p>
                </div>
              </Link>

              <Link
                href="/modules/installed"
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Installed Modules</p>
                  <p className="text-xs text-gray-500">Manage your modules</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Getting Started */}
          {bots.length === 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-primary-50 rounded-xl border border-primary-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <ArrowTrendingUpIcon className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900">Getting Started</h3>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p>Create your first bot from the Discord Developer Portal</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p>Add your bot token to FiveBot</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p>Install modules and customize features</p>
                </div>
              </div>
            </div>
          )}

          {/* Account Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Username</span>
                <span className="text-sm font-medium text-gray-900">{user.username}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Email</span>
                <span className="text-sm font-medium text-gray-900">{user.email}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Credits</span>
                <span className="text-sm font-semibold text-primary-600">{user.credits}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
