'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/Input';
import { designTokens } from '@/styles/design-tokens';

interface BotModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'core' | 'moderation' | 'utility' | 'fun' | 'economy' | 'community';
  enabled: boolean;
  installed: boolean;
  configurable: boolean;
}

const AVAILABLE_MODULES: BotModule[] = [
  {
    id: 'welcome',
    name: 'Welcome System',
    description: 'Greet new members with custom messages and auto-roles',
    icon: '👋',
    category: 'community',
    enabled: false,
    installed: false,
    configurable: true,
  },
  {
    id: 'moderation',
    name: 'Auto Moderation',
    description: 'Anti-spam, anti-raid, and content filtering',
    icon: '🛡️',
    category: 'moderation',
    enabled: false,
    installed: false,
    configurable: true,
  },
  {
    id: 'tickets',
    name: 'Ticket System',
    description: 'Support ticket system with categories and transcripts',
    icon: '🎫',
    category: 'utility',
    enabled: false,
    installed: false,
    configurable: true,
  },
  {
    id: 'leveling',
    name: 'Leveling & XP',
    description: 'Gamify your server with XP, levels, and role rewards',
    icon: '📊',
    category: 'economy',
    enabled: false,
    installed: false,
    configurable: true,
  },
  {
    id: 'commands',
    name: 'Custom Commands',
    description: 'Create custom commands with variables and embeds',
    icon: '⚡',
    category: 'utility',
    enabled: false,
    installed: false,
    configurable: true,
  },
  {
    id: 'embeds',
    name: 'Embed Builder',
    description: 'Create rich embed messages with buttons and interactions',
    icon: '📝',
    category: 'utility',
    enabled: false,
    installed: false,
    configurable: true,
  },
  {
    id: 'reaction-roles',
    name: 'Reaction Roles',
    description: 'Let users self-assign roles using reactions or buttons',
    icon: '🎭',
    category: 'utility',
    enabled: false,
    installed: false,
    configurable: true,
  },
  {
    id: 'logs',
    name: 'Server Logs',
    description: 'Advanced logging for moderation and server events',
    icon: '📋',
    category: 'moderation',
    enabled: false,
    installed: false,
    configurable: true,
  },
  {
    id: 'music',
    name: 'Music Player',
    description: 'Play music from YouTube, Spotify, and more',
    icon: '🎵',
    category: 'fun',
    enabled: false,
    installed: false,
    configurable: true,
  },
  {
    id: 'giveaways',
    name: 'Giveaways',
    description: 'Create and manage server giveaways',
    icon: '🎁',
    category: 'fun',
    enabled: false,
    installed: false,
    configurable: true,
  },
  {
    id: 'collab',
    name: 'Collaborators',
    description: 'Manage bot collaborators and permissions',
    icon: '👥',
    category: 'core',
    enabled: false,
    installed: false,
    configurable: true,
  },
  {
    id: 'status',
    name: 'Status Rotation',
    description: 'Rotate bot status messages automatically',
    icon: '🔄',
    category: 'core',
    enabled: false,
    installed: false,
    configurable: true,
  },
];

export default function BotConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params.id as string;

  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<BotModule[]>(AVAILABLE_MODULES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchBot();
    }
  }, [user, botId]);

  const fetchBot = async () => {
    try {
      const response = await botsAPI.getById(botId);
      const botData = response.data;
      setBot(botData);

      // Map backend config to module states
      const config = botData.config || {};
      const updatedModules = AVAILABLE_MODULES.map(module => {
        let installed = false;
        let enabled = false;

        // Map backend config fields to module states
        switch (module.id) {
          case 'welcome':
            installed = !!config.welcomeEnabled;
            enabled = config.welcomeEnabled === true;
            break;
          case 'tickets':
            installed = !!config.ticketCategories || !!config.ticketTranscriptChannelId;
            enabled = !!config.ticketCategories;
            break;
          case 'commands':
            installed = !!config.embedV2Commands;
            enabled = Object.keys(config.embedV2Commands || {}).some((key: string) => config.embedV2Commands[key]?.enabled);
            break;
          case 'collab':
            installed = true; // Always available
            enabled = true;
            break;
          case 'status':
            installed = !!config.statusRotation;
            enabled = config.statusRotation?.enabled === true;
            break;
          case 'moderation':
            installed = !!config.autoModeration;
            enabled = config.autoModeration?.enabled === true;
            break;
          case 'leveling':
            installed = !!config.leveling;
            enabled = config.leveling?.enabled === true;
            break;
          case 'logs':
            installed = !!config.serverLogs;
            enabled = config.serverLogs?.enabled === true;
            break;
          default:
            // Keep default state for modules not yet implemented
            break;
        }

        return { ...module, installed, enabled };
      });

      setModules(updatedModules);
    } catch (error: any) {
      console.error('Error fetching bot:', error);
      toast.error('Failed to load bot details');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallModule = async (moduleId: string) => {
    try {
      // Map module ID to backend config field
      let configUpdate: any = {};

      switch (moduleId) {
        case 'welcome':
          configUpdate = { welcomeEnabled: true };
          break;
        case 'tickets':
          configUpdate = { ticketCategories: [] };
          break;
        case 'commands':
          configUpdate = { embedV2Commands: {} };
          break;
        case 'status':
          configUpdate = { statusRotation: { enabled: true, messages: [] } };
          break;
        case 'moderation':
          configUpdate = { autoModeration: { enabled: true } };
          break;
        case 'leveling':
          configUpdate = { leveling: { enabled: true } };
          break;
        case 'logs':
          configUpdate = { serverLogs: { enabled: true } };
          break;
        default:
          toast.error('Module installation not yet implemented');
          return;
      }

      // Update backend
      await botsAPI.update(botId, { config: { ...bot.config, ...configUpdate } });

      // Update local state
      setModules(prev => prev.map(m =>
        m.id === moduleId ? { ...m, installed: true, enabled: true } : m
      ));
      setBot({ ...bot, config: { ...bot.config, ...configUpdate } });

      toast.success('Module installed successfully!');
    } catch (error: any) {
      console.error('Error installing module:', error);
      toast.error('Failed to install module');
    }
  };

  const handleUninstallModule = async (moduleId: string) => {
    try {
      // Map module ID to backend config field to remove/disable
      let configUpdate: any = {};

      switch (moduleId) {
        case 'welcome':
          configUpdate = { welcomeEnabled: false };
          break;
        case 'tickets':
          configUpdate = { ticketCategories: null };
          break;
        case 'commands':
          configUpdate = { embedV2Commands: null };
          break;
        case 'status':
          configUpdate = { statusRotation: null };
          break;
        case 'moderation':
          configUpdate = { autoModeration: null };
          break;
        case 'leveling':
          configUpdate = { leveling: null };
          break;
        case 'logs':
          configUpdate = { serverLogs: null };
          break;
        case 'collab':
          toast.error('Cannot uninstall core module');
          return;
        default:
          toast.error('Module uninstallation not yet implemented');
          return;
      }

      // Update backend
      await botsAPI.update(botId, { config: { ...bot.config, ...configUpdate } });

      // Update local state
      setModules(prev => prev.map(m =>
        m.id === moduleId ? { ...m, installed: false, enabled: false } : m
      ));
      setBot({ ...bot, config: { ...bot.config, ...configUpdate } });

      toast.success('Module uninstalled');
    } catch (error: any) {
      console.error('Error uninstalling module:', error);
      toast.error('Failed to uninstall module');
    }
  };

  const handleToggleModule = (moduleId: string) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, enabled: !m.enabled } : m
    ));
    const module = modules.find(m => m.id === moduleId);
    toast.success(`${module?.name} ${module?.enabled ? 'disabled' : 'enabled'}`);
  };

  const handleConfigureModule = (moduleId: string) => {
    router.push(`/bots/${botId}/config/${moduleId}`);
  };

  const filteredModules = modules.filter(module => {
    const matchesSearch = module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const installedModules = filteredModules.filter(m => m.installed);
  const availableModules = filteredModules.filter(m => !m.installed);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      core: 'bg-gray-100 text-gray-700',
      moderation: 'bg-red-100 text-red-700',
      utility: 'bg-blue-100 text-blue-700',
      fun: 'bg-purple-100 text-purple-700',
      economy: 'bg-yellow-100 text-yellow-700',
      community: 'bg-green-100 text-green-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !bot) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <button
              onClick={() => router.push(`/bots/${botId}`)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={designTokens.typography.h1}>{bot.name} - Configuration</h1>
          </div>
          <p className={designTokens.typography.body + ' text-gray-500'}>
            Add and configure modules for your bot
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search modules..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['all', 'core', 'moderation', 'utility', 'fun', 'economy', 'community'].map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Installed Modules</div>
            <div className="text-2xl font-bold text-gray-900">{modules.filter(m => m.installed).length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Enabled Modules</div>
            <div className="text-2xl font-bold text-success-600">
              {modules.filter(m => m.enabled).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Available Modules</div>
            <div className="text-2xl font-bold text-gray-400">
              {modules.filter(m => !m.installed).length}
            </div>
          </Card>
        </div>

        {/* Installed Modules */}
        {installedModules.length > 0 && (
          <div>
            <h2 className={designTokens.typography.h2 + ' mb-4'}>Installed Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {installedModules.map(module => (
                <Card key={module.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{module.icon}</div>
                      <div>
                        <h3 className={designTokens.typography.h3}>{module.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(module.category)}`}>
                          {module.category}
                        </span>
                      </div>
                    </div>
                    <Badge variant={module.enabled ? 'success' : 'secondary'} size="sm">
                      {module.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{module.description}</p>

                  <div className="flex items-center space-x-2">
                    {module.configurable && (
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => handleConfigureModule(module.id)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Configure
                      </Button>
                    )}

                    <button
                      onClick={() => handleToggleModule(module.id)}
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
                      onClick={() => handleUninstallModule(module.id)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Modules */}
        {availableModules.length > 0 && (
          <div>
            <h2 className={designTokens.typography.h2 + ' mb-4'}>Available Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableModules.map(module => (
                <Card key={module.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{module.icon}</div>
                      <div>
                        <h3 className={designTokens.typography.h3}>{module.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(module.category)}`}>
                          {module.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{module.description}</p>

                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() => handleInstallModule(module.id)}
                    icon={
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                      </svg>
                    }
                  >
                    Install Module
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {filteredModules.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-5xl mb-4">🔍</div>
            <h3 className={designTokens.typography.h3 + ' mb-2'}>No modules found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
