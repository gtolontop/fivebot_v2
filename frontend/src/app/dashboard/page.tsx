'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import {
  CubeIcon,
  CheckCircleIcon,
  PlusIcon,
  ClockIcon,
  ServerIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  BoltIcon,
  ChartBarIcon,
  SignalIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';

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
  const [liveFeed, setLiveFeed] = useState(true);

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

      const response = await botsAPI.getDashboardStats();
      const dashboardStats = response.data;

      const botsResponse = await botsAPI.getAll();
      const userBots = botsResponse.data || [];
      setBots(userBots);

      setStats(dashboardStats);

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
        .slice(0, 8);

      setRecentActivity(activities);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);

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
        return <CheckCircleIcon className="w-5 h-5 text-success-600" />;
      case 'bot_stopped':
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
      case 'error':
        return <svg className="w-5 h-5 text-danger-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>;
      case 'command_used':
        return <BoltIcon className="w-5 h-5 text-primary-600" />;
      case 'new_member':
        return <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>;
      default:
        return <CheckCircleIcon className="w-5 h-5 text-gray-500" />;
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

  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  const uptimePercent = stats.totalBots > 0
    ? ((stats.activeBots / stats.totalBots) * 100).toFixed(1)
    : '0.0';

  const activeModules = 0; // TODO: Connect to real data

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Welcome back, {user.username}
            </p>
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

        {/* System Overview */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">System Overview</h2>
              <p className="text-xs text-gray-500 mt-0.5">Global system status and performance</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success-50 border border-success-200 rounded-lg">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-success-700">All Systems Operational</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Uptime */}
            <div className="group relative bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-5 border border-primary-100 hover:border-primary-300 transition-all hover:shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <SignalIcon className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary-600">{uptimePercent}%</div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">System Uptime</p>
                <div className="w-full bg-primary-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-1000"
                    style={{ width: `${uptimePercent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Total Bots */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100 hover:border-blue-300 transition-all hover:shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <CubeIcon className="w-6 h-6 text-blue-600" />
                </div>
                <Link href="/bots" className="text-blue-500 hover:text-blue-600 transition-colors">
                  <ArrowTrendingUpIcon className="w-5 h-5" />
                </Link>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-blue-600">{stats.totalBots}</div>
                <p className="text-sm font-semibold text-gray-900">Total Bots</p>
                <p className="text-xs text-gray-500">{stats.activeBots} online</p>
              </div>
            </div>

            {/* Active Bots */}
            <div className="group relative bg-gradient-to-br from-success-50 to-green-50 rounded-xl p-5 border border-success-100 hover:border-success-300 transition-all hover:shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform relative">
                  <CheckCircleIcon className="w-6 h-6 text-success-600" />
                  {stats.activeBots > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-success-600">{stats.activeBots}</div>
                <p className="text-sm font-semibold text-gray-900">Bots Online</p>
                <p className="text-xs text-gray-500">Running now</p>
              </div>
            </div>

            {/* Active Modules */}
            <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100 hover:border-purple-300 transition-all hover:shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
                  </svg>
                </div>
                <Link href="/modules" className="text-purple-500 hover:text-purple-600 transition-colors">
                  <ArrowTrendingUpIcon className="w-5 h-5" />
                </Link>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-purple-600">{activeModules}</div>
                <p className="text-sm font-semibold text-gray-900">Active Modules</p>
                <p className="text-xs text-gray-500">Installed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed - 2 cols */}
          <div className="lg:col-span-2 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200/50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Your Activity</h2>
                <p className="text-xs text-gray-500 mt-0.5">Real-time bot events and updates</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLiveFeed(!liveFeed)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    liveFeed
                      ? 'bg-success-100 text-success-700 border border-success-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${liveFeed ? 'bg-success-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  {liveFeed ? 'Live' : 'Paused'}
                </button>
                <Link href="/bots" className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1">
                  View Logs
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="p-6">
              {recentActivity.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ClockIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-900 font-semibold">No activity yet</p>
                  <p className="text-gray-500 text-sm mt-1">Bot events will appear here in real-time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((event, index) => (
                    <div
                      key={event.id}
                      className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all animate-slide-up cursor-pointer"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                          {getActivityIcon(event.type)}
                        </div>
                        {liveFeed && index === 0 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-success-500 rounded-full border-2 border-white animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{event.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-xs text-gray-500">{formatRelativeTime(event.timestamp)}</p>
                        </div>
                      </div>
                      {event.botId && (
                        <Link
                          href={`/bots/${event.botId}`}
                          className="text-primary-600 hover:text-primary-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions - 1 col */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
                <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
                <p className="text-xs text-gray-500 mt-0.5">Fast access to key features</p>
              </div>
              <div className="p-4 space-y-3">
                <Link
                  href="/bots/create"
                  className="group relative flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 hover:-translate-y-1 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform backdrop-blur-sm relative z-10">
                    <PlusIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 relative z-10">
                    <p className="text-sm font-bold">Create Bot</p>
                    <p className="text-xs text-primary-100">Start a new project</p>
                  </div>
                  <svg className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  href="/bots"
                  className="group flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all hover:-translate-y-0.5"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CubeIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">Manage Bots</p>
                    <p className="text-xs text-gray-500">View and control</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  href="/modules"
                  className="group flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all hover:-translate-y-0.5"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">Modules Marketplace</p>
                    <p className="text-xs text-gray-500">Add features</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  href="/settings"
                  className="group flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all hover:-translate-y-0.5"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ServerIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">Server Status</p>
                    <p className="text-xs text-gray-500">View health</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Analytics</h2>
              <p className="text-xs text-gray-500 mt-0.5">System performance and trends</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs font-semibold bg-primary-100 text-primary-700 border border-primary-300 rounded-lg">
                Last 7 days
              </button>
              <button className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Last 30 days
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Uptime Evolution */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Uptime Evolution</p>
                <span className="text-xs text-success-600 font-semibold">+2.3%</span>
              </div>
              <div className="h-24 bg-gradient-to-r from-success-50 to-green-50 rounded-xl border border-success-200 flex items-end p-3 gap-1">
                {[65, 72, 68, 75, 82, 78, 85, 88, 92, 90, 95, 98].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-success-500 to-success-400 rounded-sm transition-all hover:from-success-600 hover:to-success-500 cursor-pointer"
                    style={{ height: `${height}%` }}
                  ></div>
                ))}
              </div>
            </div>

            {/* Active Bots Trend */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Active Bots</p>
                <span className="text-xs text-primary-600 font-semibold">Stable</span>
              </div>
              <div className="h-24 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-200 flex items-end p-3 gap-1">
                {[80, 82, 85, 84, 86, 88, 87, 89, 90, 88, 90, 92].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-primary-500 to-primary-400 rounded-sm transition-all hover:from-primary-600 hover:to-primary-500 cursor-pointer"
                    style={{ height: `${height}%` }}
                  ></div>
                ))}
              </div>
            </div>

            {/* Response Time */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Avg Response Time</p>
                <span className="text-xs text-warning-600 font-semibold">-12ms</span>
              </div>
              <div className="h-24 bg-gradient-to-r from-warning-50 to-orange-50 rounded-xl border border-warning-200 flex items-end p-3 gap-1">
                {[95, 88, 92, 85, 80, 75, 78, 72, 70, 68, 65, 62].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-warning-500 to-warning-400 rounded-sm transition-all hover:from-warning-600 hover:to-warning-500 cursor-pointer"
                    style={{ height: `${height}%` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
