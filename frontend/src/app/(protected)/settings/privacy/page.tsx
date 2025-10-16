'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
export default function PrivacyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [includeLocationMetadata, setIncludeLocationMetadata] = useState(false);
  const [helpImprove, setHelpImprove] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading privacy settings...</p>
          </div>
        </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
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
            <button className="w-full text-left px-4 py-2.5 rounded-lg bg-gray-800 text-white font-medium">
              Privacy
            </button>
            <button
              onClick={() => router.push('/settings/billing')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Billing
            </button>
            <button
              onClick={() => router.push('/profile/notifications')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Notifications
            </button>
            <button
              onClick={() => router.push('/settings/usage')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Usage
            </button>
            <button
              onClick={() => router.push('/settings/connectors')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Connectors
            </button>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {/* Privacy Section */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Privacy</h3>

              {/* Export data */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <span className="text-gray-700">Export data</span>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Request
                </button>
              </div>

              {/* Manage shared chats */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <span className="text-gray-700">Manage shared chats</span>
                <button
                  onClick={() => alert('Shared chats management coming soon')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Manage
                </button>
              </div>

              {/* Location metadata toggle */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex-1">
                  <div className="text-gray-700">Include location metadata</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Allow FiveBot to use your location to provide more relevant responses
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={includeLocationMetadata}
                    onChange={(e) => setIncludeLocationMetadata(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Help improve toggle */}
              <div className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <div className="text-gray-700">Help improve FiveBot</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Allow FiveBot to use your conversations to train and improve our models
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={helpImprove}
                    onChange={(e) => setHelpImprove(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
