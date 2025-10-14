'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Badge, Avatar, Button, SearchInput } from '@/components/ui';
import {
  PlusIcon,
  FunnelIcon,
  PlayIcon,
  StopIcon,
  CommandLineIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  EllipsisVerticalIcon,
  TrashIcon,
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
}

interface BotStats {
  servers: number;
  users: number;
}

export default function BotsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [botStats, setBotStats] = useState<{ [botId: string]: BotStats }>({});
  const [openMenus, setOpenMenus] = useState<{ [botId: string]: boolean }>({});

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

  const toggleMenu = (botId: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [botId]: !prev[botId]
    }));
  };

  const closeAllMenus = () => {
    setOpenMenus({});
  };

  const handleAction = async (botId: string, action: string) => {
    closeAllMenus();

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

  if (loading || botsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your bots...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Bots</h1>
          <p className="text-gray-600 mt-1">{bots.length} bots total</p>
        </div>
        <Button onClick={() => router.push('/bots/create')}>
          <PlusIcon className="w-4 h-4" />
          Create Bot
        </Button>
      </div>

      {/* Pending Invitations */}
      <PendingInvitations onAccept={fetchBots} />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Bots</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{bots.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Online</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{getStatusCount('ONLINE')}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Offline</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{getStatusCount('OFFLINE')}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 008.367 8.367zM4 10a6 6 0 1012 0A6 6 0 004 10z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{user?.credits || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search bots..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
      </Card>

      {/* Bots Grid */}
      {filteredBots.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            {bots.length === 0 ? (
              <>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No bots yet</h3>
                <p className="text-gray-600 mb-6">Create your first Discord bot to get started</p>
                <Button onClick={() => router.push('/bots/create')}>
                  <PlusIcon className="w-4 h-4" />
                  Create your first bot
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No bots found</h3>
                <p className="text-gray-600">Try adjusting your search or filters</p>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBots.map((bot) => (
            <Card key={bot.id} hover>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    fallback={bot.name[0]}
                    size="lg"
                    status={bot.status as any}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{bot.name}</h3>
                    <p className="text-xs text-gray-500">
                      Created {new Date(bot.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge status={bot.status as any}>
                  {bot.status}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                  </svg>
                  <span>{bot.status === 'ONLINE' ? 'Bot online' : 'Bot offline'}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <Button
                  size="sm"
                  fullWidth
                  onClick={() => router.push(`/bots/${bot.id}`)}
                >
                  Manage
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/bots/${bot.id}/analytics`)}
                  icon={<ChartBarIcon className="w-4 h-4" />}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/bots/${bot.id}/console`)}
                  icon={<CommandLineIcon className="w-4 h-4" />}
                />
                {bot.status === 'OFFLINE' ? (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleAction(bot.id, 'start')}
                    icon={<PlayIcon className="w-4 h-4" />}
                  />
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleAction(bot.id, 'stop')}
                    icon={<StopIcon className="w-4 h-4" />}
                  />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
