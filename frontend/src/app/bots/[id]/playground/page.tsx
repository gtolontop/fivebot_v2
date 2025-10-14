'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import BotPlayground from '@/components/BotPlayground';

interface Bot {
  id: string;
  name: string;
  status: string;
}

export default function PlaygroundPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<Bot | null>(null);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchBot();
    }
  }, [user, botId]);

  const fetchBot = async () => {
    try {
      const response = await botsAPI.getById(botId);
      setBot(response.data);
      
      // Fetch guilds if bot is online
      if (response.data.status === 'ONLINE') {
        try {
          const guildsResponse = await botsAPI.getGuilds(botId);
          setGuilds(guildsResponse.data || []);
        } catch (error) {
          console.log('Could not fetch guilds data');
        }
      }
    } catch (error) {
      console.error('Error loading bot:', error);
      toast.error('Failed to load bot information');
      router.push('/bots');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading playground...</span>
        </div>
      </div>
    );
  }

  if (!user || !bot) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <button
                onClick={() => router.push(`/bots/${botId}`)}
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span>←</span>
                <span className="text-sm sm:text-base font-medium">Back to Dashboard</span>
              </button>
              <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">{bot.name} - Playground</h1>
                <p className="text-xs sm:text-sm text-gray-500">Interactive testing environment</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                bot.status === 'ONLINE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <div className="w-1.5 h-1.5 bg-current rounded-full mr-1.5"></div>
                {bot.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        <BotPlayground
          botId={botId}
          botStatus={bot.status}
          guilds={guilds}
        />
      </main>
    </div>
  );
}