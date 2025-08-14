'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function DiscordCallbackPage() {
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
          await login(token);
          // La redirection vers /dashboard est gérée par la fonction login
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
        <div className="discord-spinner w-12 h-12 border-4 border-discord-200 border-t-discord-500 rounded-full mx-auto mb-4"></div>
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