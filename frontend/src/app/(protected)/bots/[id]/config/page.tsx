'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { designTokens } from '@/styles/design-tokens';
import axios from 'axios';
import toast from 'react-hot-toast';

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
  moduleId: string;
  enabled: boolean;
  module: Module;
}

const CONFIG_PAGES: Record<string, { title: string; description: string; path: string }> = {
  modules: {
    title: 'Modules',
    description: 'Manage installed modules',
    path: 'modules',
  },
  welcome: {
    title: 'Welcome System',
    description: 'Configure welcome messages and auto-roles',
    path: 'welcome',
  },
  tickets: {
    title: 'Ticket System',
    description: 'Setup support ticket categories and panels',
    path: 'tickets',
  },
  collab: {
    title: 'Collaborators',
    description: 'Manage bot team members and permissions',
    path: 'collab',
  },
  commands: {
    title: 'Custom Commands',
    description: 'Create and edit custom commands',
    path: 'commands',
  },
  status: {
    title: 'Status Rotation',
    description: 'Configure bot status messages',
    path: 'status',
  },
};

export default function BotConfigHomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<any>(null);
  const [botModules, setBotModules] = useState<BotModule[]>([]);
  const [loading, setLoading] = useState(true);

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
      const token = localStorage.getItem('token');

      // Fetch bot
      const botRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBot(botRes.data);

      // Fetch bot modules
      const modulesRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/modules/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBotModules(modulesRes.data.filter((bm: BotModule) => bm.enabled));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const enabledModules = botModules.filter((bm) => bm.enabled);
  const hasModules = enabledModules.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className={designTokens.typography.h1}>Bot Configuration</h1>
        <p className={designTokens.typography.body + ' text-gray-500 mt-2'}>
          Configure and customize {bot?.name}
        </p>
      </div>

      {/* Core Config Sections */}
      <div>
        <h2 className={designTokens.typography.h2 + ' mb-4'}>Core Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ConfigCard
            icon="🧩"
            title="Modules"
            description="Manage installed modules"
            onClick={() => router.push(`/bots/${botId}/config/modules`)}
            badge={`${enabledModules.length} active`}
            badgeColor="bg-blue-100 text-blue-800"
          />
          <ConfigCard
            icon="👥"
            title="Collaborators"
            description="Manage team members"
            onClick={() => router.push(`/bots/${botId}/config/collab`)}
          />
          <ConfigCard
            icon="🔄"
            title="Status Rotation"
            description="Bot status messages"
            onClick={() => router.push(`/bots/${botId}/config/status`)}
          />
        </div>
      </div>

      {/* Module Configurations */}
      {hasModules && (
        <div>
          <h2 className={designTokens.typography.h2 + ' mb-4'}>Module Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enabledModules.map((botModule) => (
              <ConfigCard
                key={botModule.id}
                icon={botModule.module.icon}
                title={botModule.module.name}
                description={botModule.module.description}
                onClick={() => router.push(`/bots/${botId}/config/${botModule.module.slug}`)}
                badge={botModule.enabled ? 'Enabled' : 'Disabled'}
                badgeColor={
                  botModule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className={designTokens.typography.h2 + ' mb-4'}>Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickActionCard
            icon="🛒"
            title="Browse Modules"
            description="Discover and install new modules"
            onClick={() => router.push('/browse')}
          />
          <QuickActionCard
            icon="📦"
            title="My Modules"
            description="View and manage your module library"
            onClick={() => router.push('/installed/modules')}
          />
        </div>
      </div>

      {/* Empty State */}
      {!hasModules && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="text-3xl">💡</div>
            <div>
              <h3 className={designTokens.typography.h3 + ' text-blue-900 mb-2'}>
                No modules installed yet
              </h3>
              <p className={designTokens.typography.body + ' text-blue-700 mb-4'}>
                Install modules to unlock powerful features for your bot. Browse the marketplace
                or install from your library.
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push('/browse')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Browse Marketplace
                </button>
                <button
                  onClick={() => router.push('/installed/modules')}
                  className="px-4 py-2 bg-white text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  My Module Library
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ConfigCardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  badge?: string;
  badgeColor?: string;
}

function ConfigCard({ icon, title, description, onClick, badge, badgeColor }: ConfigCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl p-6 border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all text-left group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-4xl">{icon}</div>
        {badge && (
          <span className={`px-2 py-1 text-xs font-medium rounded ${badgeColor || 'bg-gray-100 text-gray-800'}`}>
            {badge}
          </span>
        )}
      </div>
      <h3 className={designTokens.typography.h4 + ' mb-2 group-hover:text-primary-600 transition-colors'}>
        {title}
      </h3>
      <p className={designTokens.typography.small + ' text-gray-500'}>{description}</p>
    </button>
  );
}

interface QuickActionCardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

function QuickActionCard({ icon, title, description, onClick }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 border-2 border-primary-200 hover:border-primary-400 hover:shadow-lg transition-all text-left group"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className={designTokens.typography.h4 + ' mb-2 group-hover:text-primary-700 transition-colors'}>
        {title}
      </h3>
      <p className={designTokens.typography.small + ' text-gray-600'}>{description}</p>
    </button>
  );
}
