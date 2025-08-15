'use client';

import { useState, useEffect } from 'react';

interface StatsCardProps {
  botStatus: string;
  guilds: any[];
  isOnline: boolean;
}

export default function StatsCard({ botStatus, guilds, isOnline }: StatsCardProps) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    commandsToday: 0,
    uptime: '0h 0m',
    responseTime: 0,
  });

  useEffect(() => {
    if (!isOnline) {
      setStats({
        totalUsers: 0,
        commandsToday: 0,
        uptime: '0h 0m',
        responseTime: 0,
      });
      return;
    }

    // Simulate realistic stats
    const updateStats = () => {
      const totalUsers = guilds.reduce((acc, guild) => acc + (guild.memberCount || Math.floor(Math.random() * 500) + 50), 0);
      const commandsToday = Math.floor(Math.random() * 200) + 50;
      const uptimeHours = Math.floor(Math.random() * 48);
      const uptimeMinutes = Math.floor(Math.random() * 60);
      const responseTime = Math.floor(Math.random() * 100) + 20;

      setStats({
        totalUsers,
        commandsToday,
        uptime: `${uptimeHours}h ${uptimeMinutes}m`,
        responseTime,
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [isOnline, guilds]);

  const statItems = [
    {
      label: 'Servers',
      value: guilds.length.toString(),
      icon: '🏢',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: '👥',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Commands Today',
      value: stats.commandsToday.toString(),
      icon: '⚡',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Uptime',
      value: stats.uptime,
      icon: '⏱️',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Statistics</h3>
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
        {statItems.map((stat, index) => (
          <div key={index} className={`${stat.bgColor} rounded-lg p-3`}>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-lg">{stat.icon}</span>
              <span className="text-xs font-medium text-gray-600">{stat.label}</span>
            </div>
            <div className={`text-xl font-bold ${stat.color}`}>
              {isOnline ? stat.value : '0'}
            </div>
          </div>
        ))}
      </div>

      {isOnline && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Avg Response Time</span>
            <span className={`font-medium ${stats.responseTime < 50 ? 'text-green-600' : stats.responseTime < 100 ? 'text-yellow-600' : 'text-red-600'}`}>
              {stats.responseTime}ms
            </span>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 text-center">
            Statistics available when bot is online
          </p>
        </div>
      )}
    </div>
  );
}