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
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg">
                {user.username[0].toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.username}
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                {user.credits} credits • {user.email}
              </p>
            </div>
          </div>
          <Link
            href="/bots/create"
            className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <PlusIcon className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Create Bot</span>
          </Link>
        </div>

        {/* Pending Invitations */}
        <PendingInvitations onAccept={fetchDashboardData} />

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CubeIcon className="w-6 h-6 text-blue-600" />
              </div>
              <Link href="/bots" className="text-primary-500 hover:text-primary-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalBots}</p>
            <p className="text-sm text-gray-600">Total Bots</p>
          </div>

          <div className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform relative">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                {stats.activeBots > 0 && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>}
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600 mb-1">{stats.activeBots}</p>
            <p className="text-sm text-gray-600">Online Now</p>
          </div>

          <div className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-purple-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
                </svg>
              </div>
              <Link href="/modules" className="text-primary-500 hover:text-primary-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">-</p>
            <p className="text-sm text-gray-600">Active Modules</p>
          </div>

          <div className="group bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowTrendingUpIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold mb-1">{uptimePercent}%</p>
            <p className="text-sm text-primary-100">System Uptime</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Recent Activity - 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <p className="text-xs text-gray-500 mt-0.5">Latest updates from your bots</p>
              </div>
              <Link href="/bots" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                View all →
              </Link>
            </div>
            <div className="p-5">
              {recentActivity.length === 0 ? (
                <div className="text-center py-12">
                  <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No recent activity</p>
                  <p className="text-gray-400 text-xs mt-1">Your bot events will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 6).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        {getActivityIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-medium">{event.message}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatRelativeTime(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Links - 1 col */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Links</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage your platform</p>
            </div>
            <div className="p-4 space-y-2">
              <Link
                href="/bots"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CubeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">All Bots</p>
                  <p className="text-xs text-gray-500">Manage your bots</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/bots/create"
                className="flex items-center gap-3 p-3 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors group"
              >
                <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                  <PlusIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Create Bot</p>
                  <p className="text-xs text-gray-500">Add new bot</p>
                </div>
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/modules"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Modules</p>
                  <p className="text-xs text-gray-500">Browse features</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/modules/installed"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Installed</p>
                  <p className="text-xs text-gray-500">Your modules</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/settings"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Settings</p>
                  <p className="text-xs text-gray-500">Account options</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Getting Started for new users */}
        {stats.totalBots === 0 && (
          <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-xl border border-primary-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Get Started with FiveBot</h3>
                <p className="text-gray-700 text-sm mb-4">
                  Create your first bot in minutes and unlock powerful automation for your Discord server.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <p className="font-semibold text-gray-900">Get Bot Token</p>
                      <p className="text-gray-600 text-xs">From Discord Developer Portal</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                      <p className="font-semibold text-gray-900">Create Bot</p>
                      <p className="text-gray-600 text-xs">Add it to your FiveBot account</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <p className="font-semibold text-gray-900">Add Features</p>
                      <p className="text-gray-600 text-xs">Install modules from our library</p>
                    </div>
                  </div>
                </div>
                <Link
                  href="/bots/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  Create Your First Bot
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
