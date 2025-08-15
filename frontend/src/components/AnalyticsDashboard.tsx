'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Chart components to avoid SSR issues
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
});

const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
});

const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
});
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

interface AnalyticsData {
  dailyUsers: number[];
  weeklyCommands: { command: string; count: number }[];
  serverActivity: { server: string; activity: number }[];
  memberGrowth: number[];
  commandLatency: number[];
  errorRates: number[];
}

interface AnalyticsDashboardProps {
  botId: string;
  botStatus: string;
  guilds: any[];
}

export default function AnalyticsDashboard({ botId, botStatus, guilds }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [selectedMetric, setSelectedMetric] = useState<'users' | 'commands' | 'errors'>('users');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);

  // Register Chart.js components
  useEffect(() => {
    ChartJS.register(
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      BarElement,
      Title,
      Tooltip,
      Legend,
      ArcElement
    );
    setChartsReady(true);
  }, []);

  // Generate realistic analytics data
  useEffect(() => {
    const generateData = () => {
      const days = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
      
      // Generate daily active users
      const dailyUsers = Array.from({ length: days }, (_, i) => {
        const baseUsers = 50 + Math.random() * 100;
        const trend = Math.sin((i / days) * Math.PI) * 20; // Seasonal trend
        return Math.floor(baseUsers + trend + (Math.random() - 0.5) * 30);
      });

      // Generate top commands
      const commands = ['ping', 'help', 'welcome', 'stats', 'config', 'moderation', 'music'];
      const weeklyCommands = commands.map(cmd => ({
        command: `/${cmd}`,
        count: Math.floor(Math.random() * 500) + 50,
      })).sort((a, b) => b.count - a.count);

      // Generate server activity
      const serverActivity = guilds.map((guild, i) => ({
        server: guild.name || `Server ${i + 1}`,
        activity: Math.floor(Math.random() * 100) + 20,
      })).sort((a, b) => b.activity - a.activity);

      // Generate member growth
      const memberGrowth = Array.from({ length: days }, (_, i) => {
        const baseGrowth = 5 + Math.random() * 15;
        return Math.floor(baseGrowth + (Math.random() - 0.5) * 10);
      });

      // Generate command latency
      const commandLatency = Array.from({ length: days }, () => 
        Math.floor(20 + Math.random() * 80)
      );

      // Generate error rates
      const errorRates = Array.from({ length: days }, () => 
        Math.random() * 5 // 0-5% error rate
      );

      setAnalyticsData({
        dailyUsers,
        weeklyCommands,
        serverActivity,
        memberGrowth,
        commandLatency,
        errorRates,
      });
    };

    generateData();
  }, [timeRange, guilds]);

  const exportReport = async () => {
    setIsExporting(true);
    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create downloadable content
      const reportData = {
        botId,
        timeRange,
        generatedAt: new Date().toISOString(),
        data: analyticsData,
        summary: {
          totalUsers: analyticsData?.dailyUsers.reduce((a, b) => a + b, 0) || 0,
          topCommand: analyticsData?.weeklyCommands[0]?.command || 'N/A',
          avgLatency: analyticsData?.commandLatency.reduce((a, b) => a + b, 0) / (analyticsData?.commandLatency.length || 1) || 0,
        }
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bot-analytics-${botId}-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  if (!analyticsData) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const getTimeLabels = () => {
    const days = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
    if (timeRange === '24h') {
      return Array.from({ length: 24 }, (_, i) => `${i}:00`);
    }
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - days + i + 1);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  };

  // User Activity Chart
  const userActivityData = {
    labels: getTimeLabels(),
    datasets: [
      {
        label: 'Active Users',
        data: analyticsData.dailyUsers,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Commands Chart
  const commandsData = {
    labels: analyticsData.weeklyCommands.map(c => c.command),
    datasets: [
      {
        label: 'Command Usage',
        data: analyticsData.weeklyCommands.map(c => c.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 101, 101, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(6, 182, 212, 0.8)',
        ],
      },
    ],
  };

  // Server Activity Heatmap (simplified as bar chart)
  const serverActivityData = {
    labels: analyticsData.serverActivity.map(s => s.server.length > 15 ? s.server.substring(0, 15) + '...' : s.server),
    datasets: [
      {
        label: 'Activity Score',
        data: analyticsData.serverActivity.map(s => s.activity),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
      },
    ],
  };

  // Performance Metrics
  const performanceData = {
    labels: getTimeLabels(),
    datasets: [
      {
        label: 'Avg Latency (ms)',
        data: analyticsData.commandLatency,
        borderColor: 'rgb(245, 101, 101)',
        backgroundColor: 'rgba(245, 101, 101, 0.1)',
        yAxisID: 'y',
      },
      {
        label: 'Error Rate (%)',
        data: analyticsData.errorRates,
        borderColor: 'rgb(251, 191, 36)',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        yAxisID: 'y1',
      },
    ],
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
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const summary = {
    totalUsers: analyticsData.dailyUsers.reduce((a, b) => a + b, 0),
    avgUsers: Math.round(analyticsData.dailyUsers.reduce((a, b) => a + b, 0) / analyticsData.dailyUsers.length),
    topCommand: analyticsData.weeklyCommands[0]?.command || 'N/A',
    totalCommands: analyticsData.weeklyCommands.reduce((a, b) => a + b.count, 0),
    avgLatency: Math.round(analyticsData.commandLatency.reduce((a, b) => a + b, 0) / analyticsData.commandLatency.length),
    avgErrorRate: (analyticsData.errorRates.reduce((a, b) => a + b, 0) / analyticsData.errorRates.length).toFixed(2),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">📈 Advanced Analytics</h3>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="text-sm border rounded-md px-2 py-1"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button
              onClick={exportReport}
              disabled={isExporting}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {isExporting ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Exporting...
                </div>
              ) : (
                '📄 Export Report'
              )}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-xl font-bold text-blue-600">{summary.totalUsers}</div>
            <div className="text-xs text-blue-800">Total Users</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-xl font-bold text-green-600">{summary.avgUsers}</div>
            <div className="text-xs text-green-800">Avg Daily</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-xl font-bold text-purple-600">{summary.totalCommands}</div>
            <div className="text-xs text-purple-800">Commands</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-xl font-bold text-yellow-600">{summary.topCommand}</div>
            <div className="text-xs text-yellow-800">Top Command</div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-center">
            <div className="text-xl font-bold text-indigo-600">{summary.avgLatency}ms</div>
            <div className="text-xs text-indigo-800">Avg Latency</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-xl font-bold text-red-600">{summary.avgErrorRate}%</div>
            <div className="text-xs text-red-800">Error Rate</div>
          </div>
        </div>
      </div>

      {/* User Activity Chart */}
      <div className="card p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">👥 User Activity Trends</h4>
        <div className="h-64">
          {chartsReady ? (
            <Line data={userActivityData} options={{ responsive: true, maintainAspectRatio: false }} />
          ) : (
            <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
              <span className="text-gray-500">Loading chart...</span>
            </div>
          )}
        </div>
      </div>

      {/* Commands and Server Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">⚡ Top Commands</h4>
          <div className="h-64">
            {chartsReady ? (
              <Bar 
                data={commandsData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } }
                }} 
              />
            ) : (
              <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <span className="text-gray-500">Loading chart...</span>
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">🌡️ Server Activity Heatmap</h4>
          <div className="h-64">
            {chartsReady ? (
              <Bar 
                data={serverActivityData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                      },
                    },
                  },
                }} 
              />
            ) : (
              <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <span className="text-gray-500">Loading chart...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="card p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">🚀 Performance Metrics</h4>
        <div className="h-64">
          {chartsReady ? (
            <Line data={performanceData} options={chartOptions} />
          ) : (
            <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
              <span className="text-gray-500">Loading chart...</span>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Stats Table */}
      <div className="card p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">📊 Detailed Statistics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Command Performance</h5>
            <div className="space-y-2">
              {analyticsData.weeklyCommands.slice(0, 5).map((cmd, index) => (
                <div key={cmd.command} className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-mono">{cmd.command}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{cmd.count} uses</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(cmd.count / analyticsData.weeklyCommands[0].count) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Server Engagement</h5>
            <div className="space-y-2">
              {analyticsData.serverActivity.slice(0, 5).map((server, index) => (
                <div key={server.server} className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm truncate max-w-32" title={server.server}>
                    {server.server}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{server.activity}%</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${server.activity}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}