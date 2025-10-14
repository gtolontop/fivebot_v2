'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import V2CommandsConfig from '@/components/V2CommandsConfig';
import { designTokens } from '@/styles/design-tokens';

export default function CommandsConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params.id as string;

  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      setBot(response.data);
    } catch (error: any) {
      console.error('Error fetching bot:', error);
      toast.error('Failed to load bot details');
    } finally {
      setLoading(false);
    }
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
              onClick={() => router.push(`/bots/${botId}/config`)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={designTokens.typography.h1}>⚡ Custom Commands & Embeds</h1>
          </div>
          <p className={designTokens.typography.body + ' text-gray-500'}>
            Create and manage custom commands with embeds and buttons
          </p>
        </div>

        {/* Commands Config Component */}
        <V2CommandsConfig
          config={bot.config || {}}
          updateConfig={async (updates: any) => {
            try {
              await botsAPI.update(botId, { config: { ...bot.config, ...updates } });
              setBot({ ...bot, config: { ...bot.config, ...updates } });
              toast.success('Configuration updated successfully!');
            } catch (error: any) {
              console.error('Error updating config:', error);
              toast.error('Failed to update configuration');
            }
          }}
        />
      </div>
    </DashboardLayout>
  );
}
