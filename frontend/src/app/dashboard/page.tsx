'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

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
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Bienvenue, {user.username}!</p>
            </div>
            <button
              onClick={logout}
              className="btn-secondary"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Crédits</h3>
              <p className="text-3xl font-bold text-discord-600">{user.credits}</p>
              <p className="text-sm text-gray-600">crédits disponibles</p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Bots</h3>
              <p className="text-3xl font-bold text-success-600">0</p>
              <p className="text-sm text-gray-600">bots actifs</p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Statut</h3>
              <p className="text-lg font-semibold text-success-600">Actif</p>
              <p className="text-sm text-gray-600">compte vérifié</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Actions rapides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="card p-6 text-left hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Créer un bot</h3>
                <p className="text-gray-600">Déployez un nouveau bot Discord en quelques clics</p>
              </button>
              
              <button className="card p-6 text-left hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Gérer les bots</h3>
                <p className="text-gray-600">Consultez et modifiez vos bots existants</p>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}