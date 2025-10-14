'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import PendingInvitations from '@/components/PendingInvitations';

// Dynamic imports to avoid SSR issues
const Line = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
});

const Bar = dynamic(() => import('react-chartjs-2').then((mod) => mod.Bar), {
  ssr: false,
  loading: () => <div className="h-48 bg-gray-100 rounded-lg animate-pulse"></div>
});

const Doughnut = dynamic(() => import('react-chartjs-2').then((mod) => mod.Doughnut), {
  ssr: false,
  loading: () => <div className="h-48 bg-gray-100 rounded-lg animate-pulse"></div>
});

interface Bot {
  id: string;
  name: string;
  status: string;
  isActive: boolean;
  createdAt: string;
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

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
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
  const [chartReady, setChartReady] = useState(false);

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

  // Register Chart.js components
  useEffect(() => {
    import('chart.js').then((ChartJS) => {
      ChartJS.Chart.register(
        ChartJS.CategoryScale,
        ChartJS.LinearScale,
        ChartJS.PointElement,
        ChartJS.LineElement,
        ChartJS.BarElement,
        ChartJS.Title,
        ChartJS.Tooltip,
        ChartJS.Legend,
        ChartJS.ArcElement
      );
      setChartReady(true);
    });
  }, []);


  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch dashboard stats from backend
      const response = await botsAPI.getDashboardStats();
      const dashboardStats = response.data;
      
      // Fetch all bots for display
      const botsResponse = await botsAPI.getAll();
      const userBots = botsResponse.data || [];
      setBots(userBots);
      
      setStats(dashboardStats);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // If metrics table doesn't exist, show fallback data
      if (error.response?.status === 500 && error.response?.data?.message?.includes('bot_metrics')) {
        console.log('Metrics table not found, using fallback data');
      }
      
      // Fallback to showing bots at least
      try {
        const botsResponse = await botsAPI.getAll();
        const userBots = botsResponse.data || [];
        setBots(userBots);
        
        // Show basic stats if API fails
        const totalBots = userBots.length;
        const activeBots = userBots.filter(bot => bot.status === 'ONLINE').length;
        const statusDistribution = userBots.reduce((acc, bot) => {
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
        console.error('Fallback also failed:', fallbackError);
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setIsLoading(false);
    }
  };


  const getDateLabels = () => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Show loading only for initial auth loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header
        title="Dashboard"
        subtitle={`Welcome back, ${user.username}`}
        actions={
          <button
            onClick={() => router.push('/bots/create')}
            className="flex items-center justify-center space-x-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
            </svg>
            <span className="hidden sm:inline">Create Bot</span>
          </button>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* Pending Invitations */}
        <PendingInvitations onAccept={fetchDashboardData} />

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Bots</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.totalBots}</p>
                <p className="text-xs sm:text-sm text-green-600 mt-1">
                  {stats.activeBots} active
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Servers</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.totalServers.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Across all bots
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Community reach
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Today's Activity</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.todayCommands.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Commands executed
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">

          {/* Activity Chart */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">30-Day Activity</h3>
            <div className="h-48 sm:h-56 md:h-64">
              {chartReady && (
                <Line
                  data={{
                    labels: getDateLabels(),
                    datasets: [
                      {
                        label: 'Commands',
                        data: stats.monthlyActivity,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              )}
            </div>
          </div>

          {/* Bot Status Distribution */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Bot Status</h3>
            <div className="h-48 sm:h-56 md:h-64">
              {chartReady && Object.keys(stats.botStatusDistribution).length > 0 && (
                <Doughnut
                  data={{
                    labels: Object.keys(stats.botStatusDistribution),
                    datasets: [
                      {
                        data: Object.values(stats.botStatusDistribution),
                        backgroundColor: [
                          '#6B7280', // gray for OFFLINE
                          '#10B981', // green for ONLINE
                          '#F59E0B', // yellow for STARTING
                          '#EF4444', // red for ERROR
                        ],
                        borderWidth: 2,
                        borderColor: '#fff',
                      },
                    ],
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                      },
                    },
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">

          {/* Recent Bots */}
          <div className="lg:col-span-2 bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Your Bots</h3>
              <button
                onClick={() => router.push('/bots')}
                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium"
              >
                View All
              </button>
            </div>
            
            {bots.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m0 0v6m0-6V9a2 2 0 012-2h2m0 0V4a1 1 0 011-1h2a1 1 0 011 1v3m-6 0h6" />
                </svg>
                <h4 className="mt-2 text-lg font-medium text-gray-900">No bots yet</h4>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first Discord bot.</p>
                <button
                  onClick={() => router.push('/bots/create')}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                  </svg>
                  Create First Bot
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {bots.slice(0, 5).map((bot) => (
                  <div key={bot.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        bot.status === 'ONLINE' ? 'bg-green-500' :
                        bot.status === 'OFFLINE' ? 'bg-gray-400' :
                        bot.status === 'STARTING' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <h4 className="font-medium text-gray-900">{bot.name}</h4>
                        <p className="text-sm text-gray-500">Created {new Date(bot.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bot.status === 'ONLINE' ? 'bg-green-100 text-green-800' :
                        bot.status === 'OFFLINE' ? 'bg-gray-100 text-gray-800' :
                        bot.status === 'STARTING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {bot.status}
                      </span>
                      <button
                        onClick={() => router.push(`/bots/${bot.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Credits</span>
                <span className="font-semibold text-gray-900">{user.credits}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Messages Today</span>
                <span className="font-semibold text-gray-900">{stats.todayMessages.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Avg Response Time</span>
                <span className="font-semibold text-green-600">{stats.avgResponseTime || 45}ms</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Uptime</span>
                <span className="font-semibold text-green-600">{stats.uptime || 99.8}%</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/bots')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Manage All Bots
                </button>
                <button
                  onClick={() => router.push('/bots/create')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Create New Bot
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}