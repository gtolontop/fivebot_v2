'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { designTokens } from '@/styles/design-tokens';

export default function InstalledModulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h1 className={designTokens.typography.h1 + ' mb-2'}>Coming Soon</h1>
          <p className={designTokens.typography.body + ' text-gray-500 max-w-md'}>
            Installed modules page is under construction. Manage your modules from the bot configuration page.
          </p>
        </div>
        <button
          onClick={() => router.push('/bots')}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Go to Bots
        </button>
      </div>
    </DashboardLayout>
  );
}

/*
const MOCK_INSTALLED_MODULES_OLD: InstalledModule[] = [
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
*/
