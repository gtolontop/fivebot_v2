'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CreateBotPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    token: '',
    prefix: '!',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/bots');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erreur lors de la création du bot');
      }
    } catch (error) {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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
              <h1 className="text-2xl font-bold text-gray-900">Créer un Bot</h1>
              <p className="text-gray-600">Configurez votre nouveau bot Discord</p>
            </div>
            <button
              onClick={() => router.push('/bots')}
              className="btn-secondary"
            >
              Retour
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="card p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Erreur
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        {error}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du bot
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Mon Super Bot"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Donnez un nom à votre bot pour l'identifier facilement
                </p>
              </div>

              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                  Token Discord
                </label>
                <input
                  type="password"
                  id="token"
                  name="token"
                  value={formData.token}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Collez votre token Discord ici"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Récupérez le token depuis le Discord Developer Portal
                </p>
              </div>

              <div>
                <label htmlFor="prefix" className="block text-sm font-medium text-gray-700 mb-2">
                  Préfixe des commandes
                </label>
                <input
                  type="text"
                  id="prefix"
                  name="prefix"
                  value={formData.prefix}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="!"
                  maxLength={3}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Caractère(s) qui précèdent les commandes (ex: !help)
                </p>
              </div>

              <div className="border-t pt-6">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push('/bots')}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="discord-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Création...
                      </>
                    ) : (
                      'Créer le bot'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Instructions */}
          <div className="mt-8 card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Comment créer un bot Discord ?</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Allez sur <a href="https://discord.com/developers/applications" target="_blank" className="text-discord-600 hover:underline">Discord Developer Portal</a></li>
              <li>Cliquez sur "New Application" et donnez un nom à votre application</li>
              <li>Dans l'onglet "Bot", cliquez sur "Add Bot"</li>
              <li>Copiez le token dans la section "Token"</li>
              <li>Activez les intents nécessaires (Server Members Intent, Message Content Intent)</li>
              <li>Collez le token ci-dessus et configurez votre bot</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}