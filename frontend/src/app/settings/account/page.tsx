'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleLogout = () => {
    logout();
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // TODO: Implement account deletion
      alert('Account deletion will be implemented soon');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading account...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
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
            <button className="w-full text-left px-4 py-2.5 rounded-lg bg-gray-800 text-white font-medium">
              Account
            </button>
            <button
              onClick={() => router.push('/settings/privacy')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Privacy
            </button>
            <button
              onClick={() => router.push('/settings/billing')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Billing
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
            {/* Account Section */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Account</h3>

              {/* Log out */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <span className="text-gray-700">Log out of all devices</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Log out
                </button>
              </div>

              {/* Delete account */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <span className="text-gray-700">To delete your account, please cancel your Claude Pro subscription first.</span>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Delete account
                </button>
              </div>

              {/* User ID */}
              <div className="flex items-center justify-between py-4">
                <span className="text-gray-700">User ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-gray-600 font-mono">{user.id}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.id);
                      alert('User ID copied!');
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
