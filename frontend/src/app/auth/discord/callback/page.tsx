'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

function DiscordCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams?.get('token');
      const error = searchParams?.get('error');

      if (error) {
        toast.error('Erreur lors de la connexion: ' + error);
        router.push('/auth/login');
        return;
      }

      if (token) {
        try {
          const user = await login(token);
          toast.success(`Bienvenue, ${user.username}!`);
          // Small delay to ensure state is updated
          setTimeout(() => {
            router.push('/dashboard');
          }, 100);
        } catch (error) {
          console.error('Login error:', error);
          router.push('/auth/login');
        }
      } else {
        toast.error('Token manquant dans la réponse');
        router.push('/auth/login');
      }
    };

    handleCallback();
  }, [searchParams, login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="discord-spinner w-12 h-12 border-4 border-discord-200 border-t-discord-500 rounded-full mx-auto mb-4 animate-spin"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Connexion en cours...
        </h2>
        <p className="text-gray-600">
          Veuillez patienter pendant que nous vous connectons.
        </p>
      </div>
    </div>
  );
}

export default function DiscordCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-500 rounded-full mx-auto mb-4 animate-spin"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Chargement...
            </h2>
          </div>
        </div>
      }
    >
      <DiscordCallbackContent />
    </Suspense>
  );
}