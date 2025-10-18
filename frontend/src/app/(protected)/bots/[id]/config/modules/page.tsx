'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  icon: string;
  isCore: boolean;
}

interface BotModule {
  id: string;
  botId: string;
  moduleId: string;
  enabled: boolean;
  config: string;
  module: Module;
}

const CATEGORY_COLORS: Record<string, string> = {
  FRAMEWORK: 'bg-purple-100 text-purple-800',
  MODERATION: 'bg-red-100 text-red-800',
  WELCOME: 'bg-green-100 text-green-800',
  AUTOMATION: 'bg-blue-100 text-blue-800',
  UTILITY: 'bg-gray-100 text-gray-800',
  TICKETS: 'bg-yellow-100 text-yellow-800',
  LOGGING: 'bg-indigo-100 text-indigo-800',
  FUN: 'bg-pink-100 text-pink-800',
  CUSTOM: 'bg-teal-100 text-teal-800',
};

export default function BotModulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<any>(null);
  const [botModules, setBotModules] = useState<BotModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchData();
    }
  }, [user, botId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');

      // Fetch bot details
      const botRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBot(botRes.data);

      // Fetch bot modules
      const modulesRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/modules/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBotModules(modulesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (moduleId: string, enabled: boolean) => {
    try {
      setToggleLoading(moduleId);
      const token = Cookies.get('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/modules/bots/${botId}/${moduleId}/toggle`,
        { enabled: !enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Module ${!enabled ? 'enabled' : 'disabled'} successfully`);
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle module';
      toast.error(message);
    } finally {
      setToggleLoading(null);
    }
  };

  const handleConfigure = (slug: string) => {
    router.push(`/bots/${botId}/config/${slug}`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const coreModules = botModules.filter((bm) => bm.module.isCore);
  const installedModules = botModules.filter((bm) => !bm.module.isCore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={designTokens.typography.h2}>Installed Modules</h1>
          <p className={designTokens.typography.body + ' text-gray-500 mt-1'}>
            Manage modules installed on {bot?.name}
          </p>
        </div>
        <button
          onClick={() => router.push('/installed/modules')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Install More Modules
        </button>
      </div>

      {/* Core Modules */}
      {coreModules.length > 0 && (
        <div>
          <h2 className={designTokens.typography.h3 + ' mb-4'}>Core Modules</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {coreModules.map((botModule) => (
              <ModuleCard
                key={botModule.id}
                botModule={botModule}
                onToggle={handleToggle}
                onConfigure={handleConfigure}
                isToggling={toggleLoading === botModule.moduleId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Installed Modules */}
      {installedModules.length > 0 && (
        <div>
          <h2 className={designTokens.typography.h3 + ' mb-4'}>Active Modules</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {installedModules.map((botModule) => (
              <ModuleCard
                key={botModule.id}
                botModule={botModule}
                onToggle={handleToggle}
                onConfigure={handleConfigure}
                isToggling={toggleLoading === botModule.moduleId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {botModules.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className={designTokens.typography.h3 + ' mb-2'}>No modules installed</h3>
          <p className={designTokens.typography.body + ' text-gray-500 mb-6'}>
            Install modules from your library to get started
          </p>
          <button
            onClick={() => router.push('/installed/modules')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go to Module Library
          </button>
        </div>
      )}
    </div>
  );
}

interface ModuleCardProps {
  botModule: BotModule;
  onToggle: (moduleId: string, enabled: boolean) => void;
  onConfigure: (slug: string) => void;
  isToggling: boolean;
}

function ModuleCard({ botModule, onToggle, onConfigure, isToggling }: ModuleCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className="text-3xl">{botModule.module.icon}</div>
          <div>
            <h3 className={designTokens.typography.h4}>{botModule.module.name}</h3>
            <p className={designTokens.typography.small + ' text-gray-500 mt-1'}>
              {botModule.module.description}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${CATEGORY_COLORS[botModule.module.category] || 'bg-gray-100 text-gray-800'}`}
        >
          {botModule.module.category}
        </span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggle(botModule.moduleId, botModule.enabled)}
            disabled={isToggling || botModule.module.isCore}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              botModule.enabled ? 'bg-primary-600' : 'bg-gray-200'
            } ${botModule.module.isCore ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={botModule.module.isCore ? 'Core modules cannot be disabled' : ''}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                botModule.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {isToggling ? 'Updating...' : botModule.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <button
          onClick={() => onConfigure(botModule.module.slug)}
          className="px-4 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          Configure
        </button>
      </div>

      {botModule.module.isCore && (
        <p className="mt-3 text-xs text-gray-500 italic">
          Core module - always enabled
        </p>
      )}
    </div>
  );
}
