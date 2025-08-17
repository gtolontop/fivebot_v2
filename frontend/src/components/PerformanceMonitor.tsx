'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Chart component to avoid SSR issues
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
});
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

interface PerformanceData {
  timestamp: string;
  cpu: number;
  memory: number;
  latency: number;
  commands: number;
}

interface PerformanceMonitorProps {
  botId: string;
  isOnline: boolean;
}

export default function PerformanceMonitor({ botId, isOnline }: PerformanceMonitorProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [chartsReady, setChartsReady] = useState(false);

  // Register Chart.js components
  useEffect(() => {
    ChartJS.register(
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      Title,
      Tooltip,
      Legend
    );
    setChartsReady(true);
  }, []);

  // Generate realistic performance data
  useEffect(() => {
    if (!isOnline) {
      setPerformanceData([]);
      return;
    }

    const generateData = () => {
      const now = new Date();
      const timestamp = now.toLocaleTimeString();
      
      // Simulate realistic bot performance
      const baseCpu = 15 + Math.random() * 10; // 15-25% base
      const baseMemory = 45 + Math.random() * 15; // 45-60MB base
      const baseLatency = 20 + Math.random() * 30; // 20-50ms base
      const commandsPerMin = Math.floor(Math.random() * 20);

      const newData: PerformanceData = {
        timestamp,
        cpu: Math.min(100, baseCpu + (Math.random() > 0.9 ? Math.random() * 30 : 0)), // Occasional spikes
        memory: Math.min(200, baseMemory + (Math.random() > 0.8 ? Math.random() * 40 : 0)),
        latency: Math.min(500, baseLatency + (Math.random() > 0.85 ? Math.random() * 100 : 0)),
        commands: commandsPerMin,
      };

      // Check for alerts
      const newAlerts: string[] = [];
      if (newData.cpu > 80) newAlerts.push(`High CPU usage: ${newData.cpu.toFixed(1)}%`);
      if (newData.memory > 150) newAlerts.push(`High memory usage: ${newData.memory.toFixed(1)}MB`);
      if (newData.latency > 200) newAlerts.push(`High latency: ${newData.latency.toFixed(0)}ms`);

      if (newAlerts.length > 0) {
        setAlerts(prev => [...prev.slice(-4), ...newAlerts]); // Keep last 5 alerts
      }

      setPerformanceData(prev => [...prev.slice(-20), newData]); // Keep last 20 data points
    };

    generateData(); // Initial data
    const interval = setInterval(generateData, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Performance Monitor</h3>
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">⚠️</div>
          <p>Bot must be online to monitor performance</p>
        </div>
      </div>
    );
  }

  const latestData = performanceData[performanceData.length - 1];

  const chartData = {
    labels: performanceData.map(d => d.timestamp),
    datasets: [
      {
        label: 'CPU (%)',
        data: performanceData.map(d => d.cpu),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Memory (MB)',
        data: performanceData.map(d => d.memory),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Latency (ms)',
        data: performanceData.map(d => d.latency),
        borderColor: 'rgb(245, 101, 101)',
        backgroundColor: 'rgba(245, 101, 101, 0.1)',
        tension: 0.4,
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
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">📊 Performance Monitor</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Live</span>
        </div>
      </div>

      {/* Current Stats */}
      {latestData && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">CPU Usage</div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                latestData.cpu > 80 ? 'bg-red-100 text-red-700' : 
                latestData.cpu > 60 ? 'bg-yellow-100 text-yellow-700' : 
                'bg-green-100 text-green-700'
              }`}>
                {latestData.cpu > 80 ? 'High' : latestData.cpu > 60 ? 'Medium' : 'Normal'}
              </div>
            </div>
            <div className={`text-2xl font-bold ${latestData.cpu > 80 ? 'text-red-600' : 'text-blue-600'}`}>
              {latestData.cpu.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">of available CPU cores</div>
            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${latestData.cpu > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, latestData.cpu)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-green-700 uppercase tracking-wide">Memory Usage</div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                latestData.memory > 150 ? 'bg-red-100 text-red-700' : 
                latestData.memory > 100 ? 'bg-yellow-100 text-yellow-700' : 
                'bg-green-100 text-green-700'
              }`}>
                {latestData.memory > 150 ? 'High' : latestData.memory > 100 ? 'Medium' : 'Low'}
              </div>
            </div>
            <div className={`text-2xl font-bold ${latestData.memory > 150 ? 'text-red-600' : 'text-green-600'}`}>
              {latestData.memory.toFixed(0)} MB
            </div>
            <div className="text-xs text-gray-500 mt-1">of 512 MB allocated</div>
            <div className="w-full bg-green-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${latestData.memory > 150 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, (latestData.memory / 512) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Response Time</div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                latestData.latency > 200 ? 'bg-red-100 text-red-700' : 
                latestData.latency > 100 ? 'bg-yellow-100 text-yellow-700' : 
                'bg-green-100 text-green-700'
              }`}>
                {latestData.latency > 200 ? 'Slow' : latestData.latency > 100 ? 'Average' : 'Fast'}
              </div>
            </div>
            <div className={`text-2xl font-bold ${latestData.latency > 200 ? 'text-red-600' : 'text-yellow-600'}`}>
              {latestData.latency.toFixed(0)} ms
            </div>
            <div className="text-xs text-gray-500 mt-1">avg API response time</div>
            <div className="w-full bg-yellow-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${
                  latestData.latency > 200 ? 'bg-red-500' : 
                  latestData.latency > 100 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (latestData.latency / 500) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-purple-700 uppercase tracking-wide">Activity</div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                latestData.commands > 15 ? 'bg-green-100 text-green-700' : 
                latestData.commands > 5 ? 'bg-yellow-100 text-yellow-700' : 
                'bg-gray-100 text-gray-700'
              }`}>
                {latestData.commands > 15 ? 'Busy' : latestData.commands > 5 ? 'Active' : 'Idle'}
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {latestData.commands}
            </div>
            <div className="text-xs text-gray-500 mt-1">commands per minute</div>
            <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
              <div 
                className="h-2 rounded-full bg-purple-500"
                style={{ width: `${Math.min(100, (latestData.commands / 30) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-red-700 mb-2">⚠️ Performance Alerts</h4>
          <div className="space-y-1">
            {alerts.slice(-3).map((alert, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-md p-2 text-sm text-red-700">
                {alert}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Chart */}
      <div className="h-64 mb-4">
        {chartsReady ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
            <span className="text-gray-500">Loading chart...</span>
          </div>
        )}
      </div>

      {/* Health Status */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">System Health</span>
          <div className="flex items-center space-x-2">
            {latestData && latestData.cpu < 70 && latestData.memory < 120 && latestData.latency < 150 ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Excellent</span>
              </>
            ) : latestData && latestData.cpu < 85 && latestData.memory < 160 && latestData.latency < 250 ? (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-yellow-600">Good</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-red-600">Needs Attention</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}