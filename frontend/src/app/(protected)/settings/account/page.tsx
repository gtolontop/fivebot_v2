'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usersAPI } from '@/utils/api';
import toast from 'react-hot-toast';

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleLogout = () => {
    logout();
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      await usersAPI.deleteAccount();
      toast.success('Account deleted successfully');
      logout();
      router.push('/auth/login');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading account...</p>
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
                <div>
                  <span className="text-gray-700 font-medium">Delete Account</span>
                  <p className="text-sm text-gray-500 mt-1">Permanently delete your account and all associated data including bots, configurations, and history.</p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
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

        {/* Delete Account Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Account</h3>
                  <p className="text-sm text-gray-500">This action is irreversible</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This will permanently delete:
                </p>
                <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                  <li>All your Discord bots and their configurations</li>
                  <li>All bot modules and settings</li>
                  <li>Your credits and transaction history</li>
                  <li>All collaboration invitations</li>
                  <li>Your complete account data</li>
                </ul>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-mono bg-gray-100 px-1 rounded">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Type DELETE here"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmText('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || confirmText !== 'DELETE'}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    'Delete Forever'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
