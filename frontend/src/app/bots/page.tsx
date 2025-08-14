'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Bot {
  id: string;
  name: string;
  status: string;
  isActive: boolean;
  createdAt: string;
}

export default function BotsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchBots();
    }
  }, [user]);

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/bots', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBots(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des bots:', error);
    } finally {
      setBotsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="discord-spinner w-8 h-8 border-4 border-discord-200 border-t-discord-500 rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mes Bots</h1>
              <p className="text-gray-600">Gérez vos bots Discord</p>
            </div>
            <button
              onClick={() => router.push('/bots/create')}
              className="btn-primary"
            >
              Créer un bot
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {botsLoading ? (
            <div className="text-center py-12">
              <div className="discord-spinner w-8 h-8 border-4 border-discord-200 border-t-discord-500 rounded-full mx-auto"></div>
              <p className="text-gray-600 mt-4">Chargement des bots...</p>
            </div>
          ) : bots.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun bot</h3>
              <p className="text-gray-600 mb-4">Vous n'avez pas encore créé de bot</p>
              <button
                onClick={() => router.push('/bots/create')}
                className="btn-primary"
              >
                Créer votre premier bot
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bots.map((bot) => (
                <div key={bot.id} className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{bot.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bot.status === 'ONLINE' ? 'bg-green-100 text-green-800' :
                      bot.status === 'OFFLINE' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {bot.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Créé le {new Date(bot.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex space-x-2">
                    <button className="btn-secondary text-sm">
                      Configurer
                    </button>
                    <button className="btn-outline text-sm">
                      Logs
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}