'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { designTokens } from '@/styles/design-tokens';
import axios from 'axios';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

interface Module {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  icon: string;
  isCore: boolean;
}

interface UserModule {
  id: string;
  moduleId: string;
  purchasedAt: string;
  paymentAmount: number;
  module: Module;
}

interface Bot {
  id: string;
  name: string;
  avatar: string;
}

interface BotModule {
  botId: string;
  moduleId: string;
  enabled: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  FRAMEWORK: 'Framework',
  MODERATION: 'Moderation',
  WELCOME: 'Welcome',
  AUTOMATION: 'Automation',
  UTILITY: 'Utility',
  TICKETS: 'Tickets',
  LOGGING: 'Logging',
  FUN: 'Fun',
  MUSIC: 'Music',
  ECONOMY: 'Economy',
  LEVELING: 'Leveling',
  CUSTOM: 'Custom',
};

export default function InstalledModulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userModules, setUserModules] = useState<UserModule[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [botModules, setBotModules] = useState<Record<string, BotModule[]>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');

      // Fetch user modules
      const modulesRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/modules/user/owned`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserModules(modulesRes.data);

      // Fetch bots
      const botsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/bots`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBots(botsRes.data);

      // Fetch bot modules for each bot
      const botModulesData: Record<string, BotModule[]> = {};
      for (const bot of botsRes.data) {
        try {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/modules/bots/${bot.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          botModulesData[bot.id] = res.data;
        } catch (error) {
          console.error(`Error fetching modules for bot ${bot.id}:`, error);
          botModulesData[bot.id] = [];
        }
      }
      setBotModules(botModulesData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        Cookies.remove('token');
        router.push('/auth/login');
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (botId: string, moduleId: string) => {
    try {
      setActionLoading(`install-${botId}-${moduleId}`);
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/modules/bots/${botId}/${moduleId}/install`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Module installed successfully!');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to install module';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUninstall = async (botId: string, moduleId: string) => {
    if (!confirm('Are you sure you want to uninstall this module from this bot?')) return;

    try {
      setActionLoading(`uninstall-${botId}-${moduleId}`);
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/modules/bots/${botId}/${moduleId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Module uninstalled successfully!');
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to uninstall module';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const isModuleInstalled = (botId: string, moduleId: string): boolean => {
    return botModules[botId]?.some((bm) => bm.moduleId === moduleId) || false;
  };

  if (authLoading || loading) {
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={designTokens.typography.h1}>My Modules</h1>
            <p className={designTokens.typography.body + ' text-gray-500 mt-2'}>
              Manage and install your purchased modules
            </p>
          </div>
          <button
            onClick={() => router.push('/browse')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Browse Marketplace
          </button>
        </div>

        {/* Empty State */}
        {userModules.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className={designTokens.typography.h3 + ' mb-2'}>No modules yet</h3>
            <p className={designTokens.typography.body + ' text-gray-500 mb-6'}>
              Browse the marketplace to discover and install modules
            </p>
            <button
              onClick={() => router.push('/browse')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Browse Modules
            </button>
          </div>
        )}

        {/* Modules List */}
        {userModules.length > 0 && (
          <div className="space-y-4">
            {userModules.map((userModule) => (
              <div key={userModule.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Module Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">{userModule.module.icon}</div>
                      <div>
                        <h3 className={designTokens.typography.h3}>{userModule.module.name}</h3>
                        <p className={designTokens.typography.small + ' text-gray-500'}>
                          {userModule.module.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                            {CATEGORY_LABELS[userModule.module.category] || userModule.module.category}
                          </span>
                          {userModule.module.isCore && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                              Core
                            </span>
                          )}
                          {userModule.paymentAmount > 0 && (
                            <span className="text-xs text-gray-500">
                              Purchased for {userModule.paymentAmount} credits
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedModule(selectedModule?.id === userModule.module.id ? null : userModule.module)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg
                        className={`w-6 h-6 transition-transform ${selectedModule?.id === userModule.module.id ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Bot Installation List */}
                {selectedModule?.id === userModule.module.id && (
                  <div className="p-6 bg-gray-50">
                    <h4 className={designTokens.typography.h4 + ' mb-4'}>Install on Bot</h4>
                    {bots.length === 0 ? (
                      <p className="text-sm text-gray-500">No bots available. Create a bot first.</p>
                    ) : (
                      <div className="space-y-3">
                        {bots.map((bot) => {
                          const installed = isModuleInstalled(bot.id, userModule.module.id);
                          const loadingKey = installed
                            ? `uninstall-${bot.id}-${userModule.module.id}`
                            : `install-${bot.id}-${userModule.module.id}`;
                          const isLoading = actionLoading === loadingKey;

                          return (
                            <div
                              key={bot.id}
                              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center space-x-3">
                                {bot.avatar ? (
                                  <img src={bot.avatar} alt={bot.name} className="w-10 h-10 rounded-full" />
                                ) : (
                                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                                    🤖
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">{bot.name}</p>
                                  {installed && (
                                    <p className="text-xs text-green-600">✓ Installed</p>
                                  )}
                                </div>
                              </div>
                              {installed ? (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => router.push(`/bots/${bot.id}/config`)}
                                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    Configure
                                  </button>
                                  {!userModule.module.isCore && (
                                    <button
                                      onClick={() => handleUninstall(bot.id, userModule.module.id)}
                                      disabled={isLoading}
                                      className="px-4 py-2 text-sm text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                    >
                                      {isLoading ? 'Uninstalling...' : 'Uninstall'}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleInstall(bot.id, userModule.module.id)}
                                  disabled={isLoading}
                                  className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                                >
                                  {isLoading ? 'Installing...' : 'Install'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
