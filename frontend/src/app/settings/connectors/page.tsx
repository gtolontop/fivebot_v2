'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LinkIcon } from '@heroicons/react/24/outline';

export default function ConnectorsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading connectors...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Connectors</h1>
          <p className="text-sm text-gray-500 mt-1">Connect your favorite services and integrations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <button
              onClick={() => router.push('/settings')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Profile
            </button>
            <button
              onClick={() => router.push('/settings/account')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Account
            </button>
            <button
              onClick={() => router.push('/settings/privacy')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Privacy
            </button>
            <button
              onClick={() => router.push('/settings/billing')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Billing
            </button>
            <button
              onClick={() => router.push('/settings/usage')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Usage
            </button>
            <button className="w-full text-left px-4 py-2.5 rounded-lg bg-gray-800 text-white font-medium">
              Connectors
            </button>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-12 text-center">
              <LinkIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Connectors Coming Soon</h3>
              <p className="text-sm text-gray-500">
                Connect your favorite services and integrations to enhance your bot experience
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
