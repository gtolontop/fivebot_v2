'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, PanelCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/Input';
import { designTokens } from '@/styles/design-tokens';

interface InstalledModule {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  installedAt: Date;
  icon: string;
  version: string;
  config?: any;
}

const MOCK_INSTALLED_MODULES: InstalledModule[] = [
  {
    id: '1',
    name: 'Welcome System',
    description: 'Customizable welcome messages, auto-roles, and member screening',
    category: 'utility',
    enabled: true,
    installedAt: new Date('2024-01-15'),
    icon: '👋',
    version: '1.2.0',
  },
  {
    id: '2',
    name: 'Reaction Roles',
    description: 'Let users self-assign roles using reactions or buttons',
    category: 'utility',
    enabled: true,
    installedAt: new Date('2024-01-20'),
    icon: '🎭',
    version: '2.0.1',
  },
  {
    id: '3',
    name: 'Auto Moderation',
    description: 'Automatically moderate your server with advanced anti-spam, anti-raid, and content filtering',
    category: 'moderation',
    enabled: false,
    installedAt: new Date('2024-02-01'),
    icon: '🛡️',
    version: '1.5.3',
  },
];

export default function InstalledModulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [modules, setModules] = useState<InstalledModule[]>(MOCK_INSTALLED_MODULES);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const filteredModules = modules.filter(module =>
    module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggle = (moduleId: string) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, enabled: !m.enabled } : m
    ));
    const module = modules.find(m => m.id === moduleId);
    toast.success(`${module?.name} ${module?.enabled ? 'disabled' : 'enabled'}`);
  };

  const handleUninstall = (moduleId: string) => {
    setModules(prev => prev.filter(m => m.id !== moduleId));
    toast.success('Module uninstalled');
  };

  const handleConfigure = (moduleId: string) => {
    toast.info('Module configuration coming soon');
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      moderation: 'bg-red-100 text-red-700',
      utility: 'bg-blue-100 text-blue-700',
      fun: 'bg-purple-100 text-purple-700',
      music: 'bg-pink-100 text-pink-700',
      economy: 'bg-yellow-100 text-yellow-700',
      automation: 'bg-green-100 text-green-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={designTokens.typography.h1}>Installed Modules</h1>
            <p className={designTokens.typography.body + ' text-gray-500'}>
              Manage your installed modules
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/modules')}
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
            }
          >
            Browse Modules
          </Button>
        </div>

        {/* Search */}
        <SearchInput
          placeholder="Search installed modules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Total Installed</div>
            <div className="text-2xl font-bold text-gray-900">{modules.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Enabled</div>
            <div className="text-2xl font-bold text-success-600">
              {modules.filter(m => m.enabled).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Disabled</div>
            <div className="text-2xl font-bold text-gray-400">
              {modules.filter(m => !m.enabled).length}
            </div>
          </Card>
        </div>

        {/* Modules List */}
        {filteredModules.length > 0 ? (
          <div className="space-y-4">
            {filteredModules.map(module => (
              <Card key={module.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="text-4xl">{module.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className={designTokens.typography.h3}>{module.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(module.category)}`}>
                          {module.category}
                        </span>
                        <Badge
                          variant={module.enabled ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {module.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Version {module.version}</span>
                        <span>•</span>
                        <span>Installed {module.installedAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfigure(module.id)}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configure
                    </Button>

                    <button
                      onClick={() => handleToggle(module.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        module.enabled ? 'bg-success-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          module.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleUninstall(module.id)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-5xl mb-4">📦</div>
            <h3 className={designTokens.typography.h3 + ' mb-2'}>
              {searchQuery ? 'No modules found' : 'No modules installed yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery ? 'Try adjusting your search' : 'Browse the module marketplace to get started'}
            </p>
            {!searchQuery && (
              <Button
                variant="primary"
                onClick={() => router.push('/modules')}
              >
                Browse Modules
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
