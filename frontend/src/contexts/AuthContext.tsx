'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { api } from '@/utils/api';

interface User {
  id: string;
  discordId: string;
  username: string;
  email?: string;
  avatar?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  credits: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = Cookies.get('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // S'assurer que le token est bien configuré pour l'API
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      Cookies.remove('token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (token: string) => {
    try {
      setLoading(true);
      
      // Store token - use secure only in production
      const isProduction = process.env.NODE_ENV === 'production';
      Cookies.set('token', token, { 
        expires: 7, 
        secure: isProduction, 
        sameSite: 'strict',
        path: '/'
      });
      
      // Set token for API requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user data
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      
      toast.success(`Bienvenue, ${response.data.user.username}!`);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      Cookies.remove('token');
      toast.error('Échec de la connexion');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    Cookies.remove('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Déconnexion réussie');
    router.push('/');
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}