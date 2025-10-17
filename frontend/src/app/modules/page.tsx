'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { designTokens } from '@/styles/design-tokens';
import axios from 'axios';

interface Module {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  icon: string;
  downloads: number;
  isCore: boolean;
  tags: string;
  features: string;
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

const CATEGORY_COLORS: Record<string, string> = {
  FRAMEWORK: 'bg-purple-100 text-purple-800',
  MODERATION: 'bg-red-100 text-red-800',
  WELCOME: 'bg-green-100 text-green-800',
  AUTOMATION: 'bg-blue-100 text-blue-800',
  UTILITY: 'bg-gray-100 text-gray-800',
  TICKETS: 'bg-yellow-100 text-yellow-800',
  LOGGING: 'bg-indigo-100 text-indigo-800',
  FUN: 'bg-pink-100 text-pink-800',
  MUSIC: 'bg-purple-100 text-purple-800',
  ECONOMY: 'bg-green-100 text-green-800',
  LEVELING: 'bg-orange-100 text-orange-800',
  CUSTOM: 'bg-teal-100 text-teal-800',
};

export default function BrowseModulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchModules();
    }
  }, [user, selectedCategory, searchQuery]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/modules?${params.toString()}`
      );
      setModules(response.data);
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredModules = modules.filter((module) => {
    if (selectedCategory && module.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        module.name.toLowerCase().includes(query) ||
        module.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const featuredModules = filteredModules.filter((m) => m.isCore || m.downloads > 5000);
  const regularModules = filteredModules.filter((m) => !m.isCore && m.downloads <= 5000);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={designTokens.typography.h1}>Module Marketplace</h1>
          <p className={designTokens.typography.body + ' text-gray-500 mt-2'}>
            Discover and install modules to extend your bot&apos;s capabilities
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Featured Modules */}
        {featuredModules.length > 0 && (
          <div>
            <h2 className={designTokens.typography.h3 + ' mb-4'}>Featured Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredModules.map((module) => (
                <ModuleCard key={module.id} module={module} />
              ))}
            </div>
          </div>
        )}

        {/* All Modules */}
        {regularModules.length > 0 && (
          <div>
            <h2 className={designTokens.typography.h3 + ' mb-4'}>All Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularModules.map((module) => (
                <ModuleCard key={module.id} module={module} />
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredModules.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className={designTokens.typography.h3 + ' mb-2'}>No modules found</h3>
            <p className={designTokens.typography.body + ' text-gray-500'}>
              Try adjusting your search or filters
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ModuleCard({ module }: { module: Module }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/browse/${module.slug}`)}
      className="bg-white rounded-xl p-6 border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl">{module.icon}</div>
        {module.isCore && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
            Core
          </span>
        )}
        {!module.isCore && module.price === 0 && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
            Free
          </span>
        )}
        {!module.isCore && module.price > 0 && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
            {module.price} credits
          </span>
        )}
      </div>

      <h3 className={designTokens.typography.h4 + ' mb-2 group-hover:text-primary-600 transition-colors'}>
        {module.name}
      </h3>

      <p className={designTokens.typography.small + ' text-gray-500 mb-4 line-clamp-2'}>
        {module.description}
      </p>

      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 text-xs font-medium rounded ${CATEGORY_COLORS[module.category] || 'bg-gray-100 text-gray-800'}`}>
          {CATEGORY_LABELS[module.category] || module.category}
        </span>
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <span>{module.downloads.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
