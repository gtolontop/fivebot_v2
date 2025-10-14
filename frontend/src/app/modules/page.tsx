'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { designTokens } from '@/styles/design-tokens';

export default function ModulesPage() {
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
            Module marketplace is under construction. Configure your bot modules from the bot configuration page.
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
const MOCK_MODULES_OLD: Module[] = [
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
*/
