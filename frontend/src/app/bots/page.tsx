'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  PlusIcon,
  FunnelIcon,
  PlayIcon,
  StopIcon,
  CommandLineIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  CheckCircleIcon,
  SignalIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import PendingInvitations from '@/components/PendingInvitations';
import Link from 'next/link';

interface Bot {
  id: string;
  name: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  clientId?: string;
  avatar?: string;
  banner?: string;
}

export default function BotsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !loading) {
      fetchBots();
    }
  }, [user, loading]);

  const fetchBots = async () => {
    try {
      setBotsLoading(true);
      const response = await botsAPI.getAll();
      const botsData = response.data;
      setBots(botsData);
    } catch (error: any) {
      console.error('Error fetching bots:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        router.push('/auth/login');
      } else {
        toast.error('Failed to load bots');
      }
    } finally {
      setBotsLoading(false);
    }
  };

  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || bot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    return bots.filter(bot => bot.status === status).length;
  };

  const handleAction = async (botId: string, action: string) => {
    try {
      switch (action) {
        case 'start':
          await botsAPI.start(botId);
          toast.success('Bot started successfully');
          await fetchBots();
          break;
        case 'stop':
          await botsAPI.stop(botId);
          toast.success('Bot stopped successfully');
          await fetchBots();
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
            await botsAPI.delete(botId);
            toast.success('Bot deleted successfully');
            await fetchBots();
          }
          break;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Action failed';
      toast.error(errorMessage);
      console.error(`Error executing ${action}:`, error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'OFFLINE':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'STARTING':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'ERROR':
        return 'text-danger-600 bg-danger-50 border-danger-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading || botsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your bots...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Bots</h1>
            <p className="text-sm text-gray-500 mt-1">{bots.length} bots total</p>
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

        {/* Pending Invitations */}
        <PendingInvitations onAccept={fetchBots} />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100 hover:border-blue-300 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <CubeIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-blue-600">{bots.length}</div>
              <p className="text-sm font-semibold text-gray-900">Total Bots</p>
              <p className="text-xs text-gray-500">All your bots</p>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-success-50 to-green-50 rounded-xl p-5 border border-success-100 hover:border-success-300 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform relative">
                <CheckCircleIcon className="w-6 h-6 text-success-600" />
                {getStatusCount('ONLINE') > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-success-600">{getStatusCount('ONLINE')}</div>
              <p className="text-sm font-semibold text-gray-900">Online</p>
              <p className="text-xs text-gray-500">Running now</p>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <SignalIcon className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-gray-600">{getStatusCount('OFFLINE')}</div>
              <p className="text-sm font-semibold text-gray-900">Offline</p>
              <p className="text-xs text-gray-500">Not running</p>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100 hover:border-purple-300 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <SparklesIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-purple-600">{user?.credits || 0}</div>
              <p className="text-sm font-semibold text-gray-900">Credits</p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search bots..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                className="px-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
                <option value="STARTING">Starting</option>
                <option value="ERROR">Error</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bots Grid */}
        {filteredBots.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-12">
            <div className="text-center py-12">
              {bots.length === 0 ? (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CubeIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No bots yet</h3>
                  <p className="text-gray-500 mb-6">Create your first Discord bot to get started</p>
                  <Link
                    href="/bots/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Create your first bot
                  </Link>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MagnifyingGlassIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No bots found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBots.map((bot) => (
              <div
                key={bot.id}
                className="group bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden hover:border-primary-300 hover:shadow-lg transition-all"
              >
                {/* Banner */}
                <div className="relative h-24 bg-gradient-to-br from-primary-400 to-primary-600 overflow-hidden">
                  {bot.banner ? (
                    <img src={bot.banner} alt={`${bot.name} banner`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600"></div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border backdrop-blur-sm ${getStatusColor(bot.status)}`}>
                      {bot.status}
                    </span>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  {/* Avatar & Info */}
                  <div className="flex items-end gap-4 -mt-8 mb-4">
                    <div className="relative">
                      {bot.avatar ? (
                        <img
                          src={bot.avatar}
                          alt={bot.name}
                          className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-gray-600">
                          {bot.name[0].toUpperCase()}
                        </div>
                      )}
                      {bot.status === 'ONLINE' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success-500 border-4 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-1">
                      <h3 className="text-lg font-bold text-gray-900">{bot.name}</h3>
                      <p className="text-xs text-gray-500">
                        Created {new Date(bot.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/bots/${bot.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                      Manage
                    </Link>
                    <Link
                      href={`/bots/${bot.id}/analytics`}
                      className="flex items-center justify-center px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Analytics"
                    >
                      <ChartBarIcon className="w-4 h-4 text-gray-600" />
                    </Link>
                    {bot.status === 'OFFLINE' ? (
                      <button
                        onClick={() => handleAction(bot.id, 'start')}
                        className="flex items-center justify-center px-3 py-2.5 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-colors group"
                        title="Start bot"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(bot.id, 'stop')}
                        className="flex items-center justify-center px-3 py-2.5 bg-danger-600 text-white rounded-lg hover:bg-danger-700 transition-colors group"
                        title="Stop bot"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
