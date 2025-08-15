'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues
const Chart = dynamic(() => import('react-chartjs-2').then((mod) => mod.Chart), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
});

const Line = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
});

const Bar = dynamic(() => import('react-chartjs-2').then((mod) => mod.Bar), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
});

const Doughnut = dynamic(() => import('react-chartjs-2').then((mod) => mod.Doughnut), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
});

interface Bot {
  id: string;
  name: string;
  status: string;
}

interface AnalyticsData {
  commandUsage: { [key: string]: number };
  userActivity: number[];
  serverGrowth: number[];
  errorRate: number[];
  responseTime: number[];
  topCommands: { command: string; usage: number }[];
  dailyStats: {
    messages: number;
    commands: number;
    newMembers: number;
    activeUsers: number;
  };
}

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<Bot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [chartReady, setChartReady] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    commandUsage: {},
    userActivity: [],
    serverGrowth: [],
    errorRate: [],
    responseTime: [],
    topCommands: [],
    dailyStats: {
      messages: 0,
      commands: 0,
      newMembers: 0,
      activeUsers: 0
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchBot();
      generateAnalyticsData();
    }
  }, [user, botId, timeRange]);

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

  const fetchBot = async () => {
    try {
      const response = await botsAPI.getById(botId);
      setBot(response.data);
    } catch (error) {
      console.error('Error loading bot:', error);
      toast.error('Failed to load bot information');
      router.push('/bots');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAnalyticsData = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    // Generate sample data
    const commandUsage = {
      '/ping': Math.floor(Math.random() * 500) + 100,
      '/help': Math.floor(Math.random() * 300) + 50,
      '/kick': Math.floor(Math.random() * 100) + 10,
      '/ban': Math.floor(Math.random() * 50) + 5,
      '/welcome': Math.floor(Math.random() * 200) + 30,
      '/stats': Math.floor(Math.random() * 150) + 20,
    };

    const userActivity = Array.from({ length: days }, () => Math.floor(Math.random() * 100) + 20);
    const serverGrowth = Array.from({ length: days }, () => Math.floor(Math.random() * 10) + 1);
    const errorRate = Array.from({ length: days }, () => Math.random() * 5);
    const responseTime = Array.from({ length: days }, () => Math.floor(Math.random() * 50) + 20);

    const topCommands = Object.entries(commandUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([command, usage]) => ({ command, usage }));

    const dailyStats = {
      messages: Math.floor(Math.random() * 5000) + 1000,
      commands: Math.floor(Math.random() * 500) + 100,
      newMembers: Math.floor(Math.random() * 50) + 10,
      activeUsers: Math.floor(Math.random() * 200) + 50,
    };

    setAnalyticsData({
      commandUsage,
      userActivity,
      serverGrowth,
      errorRate,
      responseTime,
      topCommands,
      dailyStats
    });
  };

  const getDateLabels = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
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

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!user || !bot) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/bots/${botId}`)}
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span>←</span>
                <span className="font-medium">Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{bot.name} - Analytics</h1>
                <p className="text-sm text-gray-500">Detailed performance insights and statistics</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                bot.status === 'ONLINE' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <div className="w-1.5 h-1.5 bg-current rounded-full mr-1.5"></div>
                {bot.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Messages Today</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.dailyStats.messages.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-xl">💬</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Commands Used</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.dailyStats.commands.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-xl">⚡</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Members</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.dailyStats.newMembers}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.dailyStats.activeUsers}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 text-xl">🔥</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* User Activity Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity</h3>
            <div className="h-64">
              {chartReady && (
                <Line
                  data={{
                    labels: getDateLabels(),
                    datasets: [
                      {
                        label: 'Active Users',
                        data: analyticsData.userActivity,
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

          {/* Command Usage Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Commands</h3>
            <div className="h-64">
              {chartReady && (
                <Bar
                  data={{
                    labels: analyticsData.topCommands.map(cmd => cmd.command),
                    datasets: [
                      {
                        label: 'Usage Count',
                        data: analyticsData.topCommands.map(cmd => cmd.usage),
                        backgroundColor: [
                          'rgba(59, 130, 246, 0.8)',
                          'rgba(16, 185, 129, 0.8)',
                          'rgba(245, 158, 11, 0.8)',
                          'rgba(239, 68, 68, 0.8)',
                          'rgba(139, 92, 246, 0.8)',
                        ],
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              )}
            </div>
          </div>

          {/* Response Time Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time</h3>
            <div className="h-64">
              {chartReady && (
                <Line
                  data={{
                    labels: getDateLabels(),
                    datasets: [
                      {
                        label: 'Response Time (ms)',
                        data: analyticsData.responseTime,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              )}
            </div>
          </div>

          {/* Error Rate Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Rate</h3>
            <div className="h-64">
              {chartReady && (
                <Line
                  data={{
                    labels: getDateLabels(),
                    datasets: [
                      {
                        label: 'Error Rate (%)',
                        data: analyticsData.errorRate,
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              )}
            </div>
          </div>
        </div>

        {/* Command Usage Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Command Usage Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Command
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.topCommands.map((cmd, index) => {
                  const total = analyticsData.topCommands.reduce((sum, c) => sum + c.usage, 0);
                  const percentage = ((cmd.usage / total) * 100).toFixed(1);
                  return (
                    <tr key={cmd.command}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <code className="bg-gray-100 px-2 py-1 rounded">{cmd.command}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cmd.usage.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          index < 2 ? 'bg-green-100 text-green-800' : 
                          index < 4 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {index < 2 ? '📈 High' : index < 4 ? '📊 Medium' : '📉 Low'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}