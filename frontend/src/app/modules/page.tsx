'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/Input';
import { designTokens } from '@/styles/design-tokens';

interface Module {
  id: string;
  name: string;
  description: string;
  category: 'moderation' | 'utility' | 'fun' | 'music' | 'economy' | 'automation';
  downloads: number;
  rating: number;
  price: number;
  installed: boolean;
  featured: boolean;
  icon: string;
}

const MOCK_MODULES: Module[] = [
  {
    id: '1',
    name: 'Auto Moderation',
    description: 'Automatically moderate your server with advanced anti-spam, anti-raid, and content filtering',
    category: 'moderation',
    downloads: 12450,
    rating: 4.8,
    price: 0,
    installed: false,
    featured: true,
    icon: '🛡️'
  },
  {
    id: '2',
    name: 'Welcome System',
    description: 'Customizable welcome messages, auto-roles, and member screening',
    category: 'utility',
    downloads: 9821,
    rating: 4.6,
    price: 0,
    installed: true,
    featured: true,
    icon: '👋'
  },
  {
    id: '3',
    name: 'Music Player Pro',
    description: 'High-quality music streaming from YouTube, Spotify, and SoundCloud',
    category: 'music',
    downloads: 18920,
    rating: 4.9,
    price: 50,
    installed: false,
    featured: true,
    icon: '🎵'
  },
  {
    id: '4',
    name: 'Leveling & XP',
    description: 'Gamify your server with leveling, XP, leaderboards, and role rewards',
    category: 'economy',
    downloads: 15600,
    rating: 4.7,
    price: 25,
    installed: false,
    featured: false,
    icon: '📊'
  },
  {
    id: '5',
    name: 'Ticket System',
    description: 'Professional support ticket system with categories and transcripts',
    category: 'utility',
    downloads: 8340,
    rating: 4.5,
    price: 30,
    installed: false,
    featured: false,
    icon: '🎫'
  },
  {
    id: '6',
    name: 'Games & Fun',
    description: 'Mini-games, trivia, polls, and interactive activities for your community',
    category: 'fun',
    downloads: 11230,
    rating: 4.4,
    price: 0,
    installed: false,
    featured: false,
    icon: '🎮'
  },
  {
    id: '7',
    name: 'Custom Commands',
    description: 'Create unlimited custom commands with variables, embeds, and buttons',
    category: 'utility',
    downloads: 7890,
    rating: 4.6,
    price: 15,
    installed: false,
    featured: false,
    icon: '⚡'
  },
  {
    id: '8',
    name: 'Reaction Roles',
    description: 'Let users self-assign roles using reactions or buttons',
    category: 'utility',
    downloads: 13450,
    rating: 4.8,
    price: 0,
    installed: true,
    featured: false,
    icon: '🎭'
  },
  {
    id: '9',
    name: 'Auto Publisher',
    description: 'Automatically publish messages in announcement channels',
    category: 'automation',
    downloads: 4560,
    rating: 4.3,
    price: 10,
    installed: false,
    featured: false,
    icon: '📢'
  },
  {
    id: '10',
    name: 'Advanced Logs',
    description: 'Comprehensive server logging with custom webhooks and filters',
    category: 'moderation',
    downloads: 9870,
    rating: 4.7,
    price: 20,
    installed: false,
    featured: false,
    icon: '📝'
  },
];

export default function ModulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modules, setModules] = useState<Module[]>(MOCK_MODULES);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const filteredModules = modules.filter(module => {
    const matchesSearch = module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredModules = filteredModules.filter(m => m.featured);
  const regularModules = filteredModules.filter(m => !m.featured);

  const handleInstall = (moduleId: string) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, installed: true } : m
    ));
    toast.success('Module installed successfully!');
  };

  const handleUninstall = (moduleId: string) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, installed: false } : m
    ));
    toast.success('Module uninstalled');
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
        <div>
          <h1 className={designTokens.typography.h1}>Module Marketplace</h1>
          <p className={designTokens.typography.body + ' text-gray-500'}>
            Extend your bot with powerful modules
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['all', 'moderation', 'utility', 'fun', 'music', 'economy', 'automation'].map(category => (
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

        {/* Featured Modules */}
        {featuredModules.length > 0 && (
          <div>
            <h2 className={designTokens.typography.h2 + ' mb-4'}>Featured Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredModules.map(module => (
                <Card key={module.id} variant="interactive" className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{module.icon}</div>
                      <div>
                        <h3 className={designTokens.typography.h3}>{module.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(module.category)}`}>
                            {module.category}
                          </span>
                          {module.featured && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                              ⭐ Featured
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{module.description}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        {module.rating}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {module.downloads.toLocaleString()}
                      </span>
                    </div>
                    <div className="font-semibold text-primary-600">
                      {module.price === 0 ? 'FREE' : `${module.price} credits`}
                    </div>
                  </div>

                  {module.installed ? (
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      onClick={() => handleUninstall(module.id)}
                    >
                      Uninstall
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => handleInstall(module.id)}
                      disabled={user.credits < module.price}
                    >
                      {module.price === 0 ? 'Install Free' : `Install (${module.price} credits)`}
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Modules */}
        {regularModules.length > 0 && (
          <div>
            <h2 className={designTokens.typography.h2 + ' mb-4'}>All Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularModules.map(module => (
                <Card key={module.id} variant="interactive" className="p-6">
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

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        {module.rating}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {module.downloads.toLocaleString()}
                      </span>
                    </div>
                    <div className="font-semibold text-primary-600">
                      {module.price === 0 ? 'FREE' : `${module.price} credits`}
                    </div>
                  </div>

                  {module.installed ? (
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      onClick={() => handleUninstall(module.id)}
                    >
                      Uninstall
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => handleInstall(module.id)}
                      disabled={user.credits < module.price}
                    >
                      {module.price === 0 ? 'Install Free' : `Install (${module.price} credits)`}
                    </Button>
                  )}
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
