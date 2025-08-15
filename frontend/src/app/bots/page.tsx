'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

interface Bot {
  id: string;
  name: string;
  status: string;
  isActive: boolean;
  createdAt: string;
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
  const [verifyingStatuses, setVerifyingStatuses] = useState(false);
  const [startingAllBots, setStartingAllBots] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchBots();
    }
  }, [user]);

  const fetchBots = async () => {
    try {
      const response = await botsAPI.getAll();
      const botsData = response.data;
      setBots(botsData);
      
      // Fetch stats for each bot
      await fetchBotStats(botsData);
    } catch (error) {
      console.error('Erreur lors du chargement des bots:', error);
      toast.error('Failed to load bots');
    } finally {
      setBotsLoading(false);
    }
  };

  const fetchBotStats = async (botsData: Bot[]) => {
    const stats: { [botId: string]: BotStats } = {};
    
    // Only fetch stats for online bots to avoid rate limits
    const onlineBots = botsData.filter(bot => bot.status === 'ONLINE');
    
    const statsPromises = onlineBots.map(async (bot) => {
      try {
        const guildsResponse = await botsAPI.getGuilds(bot.id);
        const guilds = guildsResponse.data || [];
        const totalUsers = guilds.reduce((acc: number, guild: any) => 
          acc + (guild.memberCount || 0), 0
        );
        
        stats[bot.id] = {
          servers: guilds.length,
          users: totalUsers
        };
      } catch (error) {
        console.log(`Could not fetch stats for bot ${bot.name}`);
        // Use default values for bots we can't fetch stats for
        stats[bot.id] = {
          servers: 0,
          users: 0
        };
      }
    });
    
    try {
      await Promise.allSettled(statsPromises);
      setBotStats(stats);
    } catch (error) {
      console.log('Error fetching bot stats');
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
        case 'manage':
          router.push(`/bots/${botId}`);
          break;
        case 'logs':
          router.push(`/bots/${botId}/logs`);
          break;
        case 'analytics':
          router.push(`/bots/${botId}/analytics`);
          break;
        case 'settings':
          router.push(`/bots/${botId}/config`);
          break;
        case 'start':
          await botsAPI.start(botId);
          toast.success('Bot started successfully');
          await fetchBots(); // Refresh the list
          break;
        case 'stop':
          await botsAPI.stop(botId);
          toast.success('Bot stopped successfully');
          await fetchBots(); // Refresh the list
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
            await botsAPI.delete(botId);
            toast.success('Bot deleted successfully');
            await fetchBots(); // Refresh the list
          }
          break;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Action failed';
      toast.error(errorMessage);
      console.error(`Error executing ${action}:`, error);
    }
  };

  const verifyAllStatuses = async () => {
    setVerifyingStatuses(true);
    try {
      // First fix any concurrency issues
      console.log('🔧 Fixing concurrency issues first...');
      await fixConcurrencyIssues();
      
      // Then sync statuses
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/bots/setup/metrics`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Cookies.get('token') || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'sync-statuses' })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Status verification completed: ${result.updated} bots synced`);
        await fetchBots(); // Refresh the list to show updated statuses
      } else {
        console.error('Verify statuses failed:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('Error response:', errorData);
        toast.error(`Failed to verify bot statuses: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error verifying statuses:', error);
      toast.error('Error verifying bot statuses');
    } finally {
      setVerifyingStatuses(false);
    }
  };

  const startAllBots = async () => {
    setStartingAllBots(true);
    try {
      const offlineBots = bots.filter(bot => bot.status === 'OFFLINE');
      
      if (offlineBots.length === 0) {
        toast.info('No offline bots to start');
        return;
      }

      let started = 0;
      let errors = 0;

      for (const bot of offlineBots) {
        try {
          await botsAPI.start(bot.id);
          started++;
          toast.success(`${bot.name} started`);
        } catch (error: any) {
          errors++;
          console.error(`Error starting bot ${bot.name}:`, error);
          toast.error(`Failed to start ${bot.name}`);
        }
      }

      if (started > 0) {
        toast.success(`Started ${started} bots successfully`);
        await fetchBots(); // Refresh the list
      }
      
      if (errors > 0) {
        toast.error(`${errors} bots failed to start`);
      }

    } catch (error) {
      console.error('Error starting all bots:', error);
      toast.error('Error starting bots');
    } finally {
      setStartingAllBots(false);
    }
  };

  const fixConcurrencyIssues = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/bots/setup/metrics`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Cookies.get('token') || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'fix-concurrency' })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Fixed concurrency issues: ${result.updated} bots reset`);
        await fetchBots(); // Refresh the list
      } else {
        toast.error('Failed to fix concurrency issues');
      }
    } catch (error) {
      console.error('Error fixing concurrency:', error);
      toast.error('Error fixing concurrency issues');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return (
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
          </div>
        );
      case 'OFFLINE':
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 008.367 8.367zM4 10a6 6 0 1012 0A6 6 0 004 10z" clipRule="evenodd"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading bots...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Bots</h1>
                <p className="text-sm text-gray-500">Manage your Discord bots</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span>←</span>
                <span className="font-medium">Back to Dashboard</span>
              </button>
              <button
                onClick={verifyAllStatuses}
                disabled={verifyingStatuses}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                title="Verify real bot statuses"
              >
                {verifyingStatuses ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                  </svg>
                )}
                <span>{verifyingStatuses ? 'Verifying...' : 'Sync Status'}</span>
              </button>
              <button
                onClick={startAllBots}
                disabled={startingAllBots || bots.filter(bot => bot.status === 'OFFLINE').length === 0}
                className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                title="Start all offline bots"
              >
                {startingAllBots ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                  </svg>
                )}
                <span>{startingAllBots ? 'Starting...' : 'Start All'}</span>
              </button>
              <button
                onClick={() => router.push('/bots/create')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                </svg>
                <span>Create Bot</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bots</p>
                <p className="text-2xl font-bold text-gray-900">{bots.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online</p>
                <p className="text-2xl font-bold text-green-600">{getStatusCount('ONLINE')}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Offline</p>
                <p className="text-2xl font-bold text-gray-600">{getStatusCount('OFFLINE')}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 008.367 8.367zM4 10a6 6 0 1012 0A6 6 0 004 10z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Credits</p>
                <p className="text-2xl font-bold text-purple-600">{user.credits}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search bots..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
        {botsLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading your bots...</p>
            </div>
          </div>
        ) : filteredBots.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              {bots.length === 0 ? (
                <>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No bots yet</h3>
                  <p className="text-gray-600 mb-6">Create your first Discord bot to get started</p>
                  <button
                    onClick={() => router.push('/bots/create')}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                    </svg>
                    <span>Create your first bot</span>
                  </button>
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
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBots.map((bot) => (
              <div key={bot.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(bot.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{bot.name}</h3>
                      <p className="text-sm text-gray-500">
                        Created {new Date(bot.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    bot.status === 'ONLINE' ? 'bg-green-100 text-green-800' :
                    bot.status === 'OFFLINE' ? 'bg-gray-100 text-gray-800' :
                    bot.status === 'STARTING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {bot.status}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                    </svg>
                    <span>
                      {bot.status === 'ONLINE' && botStats[bot.id] 
                        ? `Active in ${botStats[bot.id].servers} server${botStats[bot.id].servers !== 1 ? 's' : ''}`
                        : bot.status === 'ONLINE'
                        ? 'Loading server data...'
                        : 'Bot offline'
                      }
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                    </svg>
                    <span>
                      {bot.status === 'ONLINE' && botStats[bot.id]
                        ? `${botStats[bot.id].users.toLocaleString()} total members`
                        : bot.status === 'ONLINE'
                        ? 'Loading member data...'
                        : 'No members'
                      }
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2 mt-6 pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => router.push(`/bots/${bot.id}`)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Manage
                  </button>
                  <button 
                    onClick={() => router.push(`/bots/${bot.id}/analytics`)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Analytics
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="relative">
                    <button 
                      onClick={() => toggleMenu(bot.id)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                      </svg>
                    </button>
                    
                    {openMenus[bot.id] && (
                      <>
                        {/* Backdrop */}
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={closeAllMenus}
                        ></div>
                        
                        {/* Menu */}
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={() => handleAction(bot.id, 'logs')}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                            </svg>
                            <span>View Logs</span>
                          </button>
                          
                          <button
                            onClick={() => handleAction(bot.id, 'settings')}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                            </svg>
                            <span>Settings</span>
                          </button>
                          
                          <div className="border-t border-gray-100 my-1"></div>
                          
                          {bot.status === 'OFFLINE' ? (
                            <button
                              onClick={() => handleAction(bot.id, 'start')}
                              className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center space-x-2"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                              </svg>
                              <span>Start Bot</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(bot.id, 'stop')}
                              className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"/>
                              </svg>
                              <span>Stop Bot</span>
                            </button>
                          )}
                          
                          <div className="border-t border-gray-100 my-1"></div>
                          
                          <button
                            onClick={() => handleAction(bot.id, 'delete')}
                            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                              <path fillRule="evenodd" d="M10 5a2 2 0 00-2 2v6a2 2 0 104 0V7a2 2 0 00-2-2zM8 7a2 2 0 114 0v6a2 2 0 11-4 0V7zM5 4a1 1 0 011-1h8a1 1 0 110 2v10a2 2 0 11-4 0H8a2 2 0 01-4 0V5a1 1 0 01-1-1z" clipRule="evenodd"/>
                            </svg>
                            <span>Delete Bot</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}