'use client';

import { useState, useEffect } from 'react';
import { botsAPI } from '@/utils/api';
import Link from 'next/link';
import {
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

interface BotHealthMetrics {
  botId: string;
  botName: string;
  status: string;
  uptime: number;
  healthScore: number;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  issues: string[];
  errorRate: number;
  latency: number;
}

interface SystemHealthOverview {
  totalBots: number;
  healthyBots: number;
  warningBots: number;
  criticalBots: number;
  offlineBots: number;
  averageHealthScore: number;
  averageUptime: number;
  totalMessages24h: number;
  totalCommands24h: number;
  systemStatus: 'operational' | 'degraded' | 'outage';
  lastUpdated: string;
}

export default function HealthWidget() {
  const [overview, setOverview] = useState<SystemHealthOverview | null>(null);
  const [botsHealth, setBotsHealth] = useState<BotHealthMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchHealthData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealthData = async () => {
    try {
      const [overviewRes, botsRes] = await Promise.all([
        botsAPI.getHealthOverview(),
        botsAPI.getAllBotsHealth(),
      ]);
      setOverview(overviewRes.data);
      setBotsHealth(botsRes.data);
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatUptime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-success-600 bg-success-100';
      case 'warning':
        return 'text-warning-600 bg-warning-100';
      case 'critical':
        return 'text-danger-600 bg-danger-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'critical':
        return <XCircleIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getSystemStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-success-100 text-success-700 text-xs font-semibold rounded-full">
            <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
            All Systems Operational
          </span>
        );
      case 'degraded':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-warning-100 text-warning-700 text-xs font-semibold rounded-full">
            <span className="w-2 h-2 bg-warning-500 rounded-full animate-pulse" />
            Degraded Performance
          </span>
        );
      case 'outage':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-danger-100 text-danger-700 text-xs font-semibold rounded-full">
            <span className="w-2 h-2 bg-danger-500 rounded-full" />
            System Outage
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200/50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-red-100 rounded-xl flex items-center justify-center">
            <HeartIcon className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">System Health</h2>
            <p className="text-xs text-gray-500">Real-time bot health monitoring</p>
          </div>
        </div>
        {getSystemStatusBadge(overview.systemStatus)}
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Health Score */}
          <div className="bg-gradient-to-br from-success-50 to-green-50 rounded-xl p-4 border border-success-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-success-700">Health Score</span>
              <CheckCircleIcon className="w-4 h-4 text-success-600" />
            </div>
            <div className="text-2xl font-bold text-success-600">{overview.averageHealthScore}%</div>
            <div className="text-xs text-success-600 mt-1">Average across all bots</div>
          </div>

          {/* Healthy Bots */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-700">Healthy</span>
              <span className="text-xs text-blue-600 font-semibold">{overview.healthyBots}/{overview.totalBots}</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{overview.healthyBots}</div>
            <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${overview.totalBots > 0 ? (overview.healthyBots / overview.totalBots) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Commands 24h */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-700">Commands (24h)</span>
              <BoltIcon className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">{overview.totalCommands24h}</div>
            <div className="text-xs text-purple-600 mt-1">Total processed</div>
          </div>

          {/* Uptime */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-orange-700">Avg Uptime</span>
              <ArrowTrendingUpIcon className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-600">{formatUptime(overview.averageUptime)}</div>
            <div className="text-xs text-orange-600 mt-1">Average runtime</div>
          </div>
        </div>

        {/* Issues Summary */}
        {(overview.warningBots > 0 || overview.criticalBots > 0) && (
          <div className="mb-4 p-4 bg-warning-50 border border-warning-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-warning-600" />
              <span className="font-semibold text-warning-800">Attention Required</span>
            </div>
            <p className="text-sm text-warning-700">
              {overview.warningBots > 0 && `${overview.warningBots} bot(s) need attention. `}
              {overview.criticalBots > 0 && `${overview.criticalBots} bot(s) in critical state.`}
            </p>
          </div>
        )}

        {/* Bot List Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
        >
          {showDetails ? 'Hide Details' : 'Show Bot Details'}
          <svg
            className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Bot Details */}
        {showDetails && botsHealth.length > 0 && (
          <div className="mt-4 space-y-2">
            {botsHealth.map((bot) => (
              <Link
                key={bot.botId}
                href={`/bots/${bot.botId}`}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(bot.healthStatus)}`}>
                    {getStatusIcon(bot.healthStatus)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{bot.botName}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Uptime: {formatUptime(bot.uptime)}</span>
                      {bot.issues.length > 0 && (
                        <span className="text-warning-600">• {bot.issues.length} issue(s)</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{bot.healthScore}%</p>
                    <p className="text-xs text-gray-500">Health</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        {showDetails && botsHealth.length === 0 && (
          <div className="mt-4 text-center py-8 text-gray-500">
            <HeartIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No bots to monitor yet</p>
            <Link href="/bots/create" className="text-primary-600 text-sm font-medium hover:underline">
              Create your first bot
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
