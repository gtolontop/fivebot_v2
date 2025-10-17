'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { designTokens } from '@/styles/design-tokens';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Module {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  category: string;
  price: number;
  icon: string;
  banner: string;
  version: string;
  author: string;
  downloads: number;
  isCore: boolean;
  tags: string;
  features: string;
  dependencies: string;
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

export default function ModuleDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [owned, setOwned] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && slug) {
      fetchModule();
      checkOwnership();
    }
  }, [user, slug]);

  const fetchModule = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/modules/${slug}`);
      setModule(response.data);
    } catch (error) {
      console.error('Error fetching module:', error);
      toast.error('Module not found');
      router.push('/browse');
    } finally {
      setLoading(false);
    }
  };

  const checkOwnership = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/modules/user/owned`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ownedModules = response.data;
      const moduleData = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/modules/${slug}`);
      const isOwned = ownedModules.some((m: any) => m.moduleId === moduleData.data.id);
      setOwned(isOwned || moduleData.data.isCore || moduleData.data.price === 0);
    } catch (error) {
      console.error('Error checking ownership:', error);
    }
  };

  const handlePurchase = async () => {
    if (!module) return;

    if (module.isCore) {
      toast.error('Core modules are included by default');
      return;
    }

    if (module.price === 0) {
      toast.success('This module is free!');
      setOwned(true);
      return;
    }

    try {
      setPurchasing(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/modules/${module.id}/purchase`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Successfully purchased ${module.name}!`);
      setOwned(true);
      checkOwnership();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to purchase module';
      toast.error(message);
    } finally {
      setPurchasing(false);
    }
  };

  if (authLoading || loading || !module) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  const features = module.features ? JSON.parse(module.features) : [];
  const tags = module.tags ? JSON.parse(module.tags) : [];
  const dependencies = module.dependencies ? JSON.parse(module.dependencies) : [];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to marketplace</span>
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <div className="text-6xl">{module.icon}</div>
              <div>
                <h1 className={designTokens.typography.h1 + ' mb-2'}>{module.name}</h1>
                <p className={designTokens.typography.body + ' text-gray-500 mb-4'}>
                  {module.description}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <span>{module.downloads.toLocaleString()} downloads</span>
                  </span>
                  <span>•</span>
                  <span>v{module.version}</span>
                  <span>•</span>
                  <span>{module.author}</span>
                  <span>•</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                    {CATEGORY_LABELS[module.category] || module.category}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end space-y-3">
              {module.isCore && (
                <span className="px-3 py-1.5 bg-purple-100 text-purple-800 text-sm font-medium rounded">
                  Core Module
                </span>
              )}
              {!module.isCore && module.price === 0 && (
                <span className="px-3 py-1.5 bg-green-100 text-green-800 text-sm font-medium rounded">
                  Free
                </span>
              )}
              {!module.isCore && module.price > 0 && (
                <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded">
                  {module.price} credits
                </span>
              )}

              {owned ? (
                <button
                  onClick={() => router.push('/installed/modules')}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✓ Owned
                </button>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchasing ? 'Purchasing...' : module.price === 0 ? 'Get Module' : 'Purchase'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: string, index: number) => (
              <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className={designTokens.typography.h3 + ' mb-4'}>About this module</h2>
              <div className="prose prose-sm max-w-none">
                {module.longDescription ? (
                  <div dangerouslySetInnerHTML={{ __html: module.longDescription.replace(/\n/g, '<br/>') }} />
                ) : (
                  <p>{module.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Features */}
            {features.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className={designTokens.typography.h4 + ' mb-4'}>Features</h3>
                <ul className="space-y-2">
                  {features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dependencies */}
            {dependencies.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className={designTokens.typography.h4 + ' mb-4'}>Dependencies</h3>
                <p className="text-sm text-gray-600 mb-3">This module requires:</p>
                <ul className="space-y-2">
                  {dependencies.map((dep: string, index: number) => (
                    <li key={index} className="flex items-center space-x-2 text-sm text-gray-700">
                      <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                      <span className="font-medium">{dep}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
