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
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user.username} 👋
          </h1>
          <p className="text-lg text-gray-600">
            Manage your Discord bots and get started
          </p>
        </div>

        {/* Pending Invitations */}
        <PendingInvitations onAccept={fetchDashboardData} />

        {/* Quick Stats - Compact */}
        <div className="flex items-center gap-6 mb-8 text-sm">
          <div className="flex items-center gap-2">
            <CubeIcon className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">{stats.totalBots}</span> bots
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
            <span className="text-gray-600">
              <span className="font-semibold text-green-600">{stats.activeBots}</span> online
            </span>
          </div>
        </div>

        {/* Main Content - Single Column */}
        {bots.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CubeIcon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Create your first bot</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Get started by creating a Discord bot. It only takes a few minutes to set up and you'll be ready to go.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/bots/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
              >
                <PlusIcon className="w-5 h-5" />
                Create Bot
              </Link>
              <Link
                href="/modules"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors border border-gray-300"
              >
                Browse Modules
              </Link>
            </div>

            {/* Getting Started Steps */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">How it works</h3>
              <div className="grid grid-cols-3 gap-8 text-left">
                <div>
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mb-3">1</div>
                  <h4 className="font-medium text-gray-900 mb-1">Create Application</h4>
                  <p className="text-sm text-gray-600">Visit Discord Developer Portal and create a new bot application</p>
                </div>
                <div>
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mb-3">2</div>
                  <h4 className="font-medium text-gray-900 mb-1">Add to FiveBot</h4>
                  <p className="text-sm text-gray-600">Paste your bot token and give it a name</p>
                </div>
                <div>
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mb-3">3</div>
                  <h4 className="font-medium text-gray-900 mb-1">Install Modules</h4>
                  <p className="text-sm text-gray-600">Browse and add features to customize your bot</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header with actions */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Bots</h2>
              <div className="flex items-center gap-3">
                <Link
                  href="/modules"
                  className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Browse Modules
                </Link>
                <Link
                  href="/bots/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Create Bot
                </Link>
              </div>
            </div>

            {/* Bots List */}
            <div className="space-y-3">
              {bots.map((bot) => (
                <Link
                  key={bot.id}
                  href={`/bots/${bot.id}`}
                  className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <Avatar
                    fallback={bot.name[0]}
                    size="lg"
                    status={bot.status as any}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {bot.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Created {new Date(bot.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge status={bot.status as any}>
                      {bot.status}
                    </Badge>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
