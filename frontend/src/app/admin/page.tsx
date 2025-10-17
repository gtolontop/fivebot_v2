'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { designTokens } from '@/styles/design-tokens';
import axios from 'axios';
import toast from 'react-hot-toast';

interface DashboardStats {
  stats: {
    totalUsers: number;
    totalBots: number;
    activeBots: number;
    totalModules: number;
    totalTransactions: number;
    totalCreditsDistributed: number;
  };
  recentUsers: any[];
  recentBots: any[];
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!authLoading && user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      toast.error('Admin access required');
      router.push('/dashboard');
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading || !stats) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className={designTokens.typography.h1}>Admin Dashboard</h1>
          <p className={designTokens.typography.body + ' text-gray-500 mt-2'}>
            Manage users, bots, modules, and platform settings
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon="👥"
            title="Total Users"
            value={stats.stats.totalUsers.toLocaleString()}
            color="bg-blue-100 text-blue-800"
          />
          <StatCard
            icon="🤖"
            title="Total Bots"
            value={stats.stats.totalBots.toLocaleString()}
            subtitle={`${stats.stats.activeBots} online`}
            color="bg-green-100 text-green-800"
          />
          <StatCard
            icon="🧩"
            title="Active Modules"
            value={stats.stats.totalModules.toLocaleString()}
            color="bg-purple-100 text-purple-800"
          />
          <StatCard
            icon="💳"
            title="Transactions"
            value={stats.stats.totalTransactions.toLocaleString()}
            color="bg-yellow-100 text-yellow-800"
          />
          <StatCard
            icon="💰"
            title="Credits Distributed"
            value={stats.stats.totalCreditsDistributed.toLocaleString()}
            color="bg-pink-100 text-pink-800"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className={designTokens.typography.h2 + ' mb-4'}>Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ActionCard
              icon="👥"
              title="Manage Users"
              description="View and manage all users"
              onClick={() => router.push('/admin/users')}
            />
            <ActionCard
              icon="🤖"
              title="Manage Bots"
              description="View all bots and servers"
              onClick={() => router.push('/admin/bots')}
            />
            <ActionCard
              icon="🧩"
              title="Manage Modules"
              description="Create and edit modules"
              onClick={() => router.push('/admin/modules')}
            />
            <ActionCard
              icon="💳"
              title="Transactions"
              description="View transaction history"
              onClick={() => router.push('/admin/transactions')}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className={designTokens.typography.h3 + ' mb-4'}>Recent Users</h3>
            <div className="space-y-3">
              {stats.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 text-sm">👤</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{user.username}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">{user.credits} credits</span>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push('/admin/users')}
              className="w-full mt-4 px-4 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              View All Users
            </button>
          </div>

          {/* Recent Bots */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className={designTokens.typography.h3 + ' mb-4'}>Recent Bots</h3>
            <div className="space-y-3">
              {stats.recentBots.map((bot: any) => (
                <div key={bot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {bot.avatar ? (
                      <img src={bot.avatar} alt={bot.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        🤖
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{bot.name}</p>
                      <p className="text-xs text-gray-500">by {bot.owner.username}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      bot.status === 'ONLINE'
                        ? 'bg-green-100 text-green-800'
                        : bot.status === 'OFFLINE'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {bot.status}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push('/admin/bots')}
              className="w-full mt-4 px-4 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              View All Bots
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

interface StatCardProps {
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  color: string;
}

function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className={designTokens.typography.h2}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

interface ActionCardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

function ActionCard({ icon, title, description, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl p-6 border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all text-left group"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className={designTokens.typography.h4 + ' mb-2 group-hover:text-primary-600 transition-colors'}>
        {title}
      </h3>
      <p className={designTokens.typography.small + ' text-gray-500'}>{description}</p>
    </button>
  );
}
