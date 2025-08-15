'use client';

import { useState, useEffect } from 'react';

interface PerformanceCardProps {
  botStatus: string;
  isOnline: boolean;
}

export default function PerformanceCard({ botStatus, isOnline }: PerformanceCardProps) {
  const [metrics, setMetrics] = useState({
    cpu: 0,
    memory: 0,
    latency: 0,
    commands: 0,
  });

  useEffect(() => {
    if (!isOnline) {
      setMetrics({ cpu: 0, memory: 0, latency: 0, commands: 0 });
      return;
    }

    const updateMetrics = () => {
      const baseCpu = 15 + Math.random() * 10;
      const baseMemory = 45 + Math.random() * 15;
      const baseLatency = 20 + Math.random() * 30;
      const commandsPerMin = Math.floor(Math.random() * 20);

      setMetrics({
        cpu: Math.min(100, baseCpu + (Math.random() > 0.9 ? Math.random() * 30 : 0)),
        memory: Math.min(200, baseMemory + (Math.random() > 0.8 ? Math.random() * 40 : 0)),
        latency: Math.min(500, baseLatency + (Math.random() > 0.85 ? Math.random() * 100 : 0)),
        commands: commandsPerMin,
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 3000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const getStatusColor = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'text-green-600';
    if (value <= thresholds[1]) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'bg-green-500';
    if (value <= thresholds[1]) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">Live</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-500">Offline</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* CPU Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">CPU</span>
            <span className={`text-sm font-bold ${getStatusColor(metrics.cpu, [70, 85])}`}>
              {metrics.cpu.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(metrics.cpu, [70, 85])}`}
              style={{ width: `${Math.min(metrics.cpu, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Memory</span>
            <span className={`text-sm font-bold ${getStatusColor(metrics.memory, [120, 160])}`}>
              {metrics.memory.toFixed(0)}MB
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(metrics.memory, [120, 160])}`}
              style={{ width: `${Math.min((metrics.memory / 200) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Latency */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Latency</span>
            <span className={`text-sm font-bold ${getStatusColor(metrics.latency, [100, 200])}`}>
              {metrics.latency.toFixed(0)}ms
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(metrics.latency, [100, 200])}`}
              style={{ width: `${Math.min((metrics.latency / 500) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Commands */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Commands</span>
            <span className="text-sm font-bold text-blue-600">
              {metrics.commands}/min
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300 bg-blue-500"
              style={{ width: `${Math.min((metrics.commands / 20) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {!isOnline && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 text-center">
            Performance monitoring available when bot is online
          </p>
        </div>
      )}
    </div>
  );
}