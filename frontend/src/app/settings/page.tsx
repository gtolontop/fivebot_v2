'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usersAPI, utilsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      const response = await utilsAPI.uploadImage(file);
      const imageUrl = response.data.url;

      await usersAPI.updateMe({ avatar: imageUrl });
      await refreshUser();

      toast.success('Avatar updated successfully');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload avatar');
      setAvatarPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="space-y-1">
            <button className="w-full text-left px-4 py-2.5 rounded-lg bg-gray-800 text-white font-medium">
              Profile
            </button>
            <button
              onClick={() => router.push('/settings/account')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
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

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
              <div className="p-6">
                <div className="space-y-6">
                    {/* Avatar Section */}
                    <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-6 border border-primary-100">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Profile Picture</h3>
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          {avatarPreview || user.avatar ? (
                            <img
                              src={avatarPreview || user.avatar || ''}
                              alt="Avatar"
                              className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center border-4 border-white shadow-lg">
                              <span className="text-3xl font-bold text-white">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-all border-2 border-primary-200 hover:border-primary-300">
                            <PhotoIcon className="w-5 h-5" />
                            <span>Change Avatar</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarUpload}
                              disabled={isUploading}
                              className="hidden"
                            />
                          </label>
                          <p className="text-sm text-gray-500 mt-2">JPG, PNG or GIF. Max 5MB.</p>
                        </div>
                      </div>
                    </div>

                    {/* Discord Info */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Discord Account</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                            <UserCircleIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-900 font-medium">{user.username}</span>
                            <span className="ml-auto px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-lg font-semibold">
                              Via Discord
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Your Discord username is synced automatically</p>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-900 font-medium">{user.email || 'Not provided'}</span>
                            <span className="ml-auto px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-lg font-semibold">
                              Via Discord
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Your Discord email is synced automatically</p>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Discord ID</label>
                          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <code className="text-gray-900 font-mono text-sm">{user.discordId}</code>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold text-blue-900">Authenticated via Discord</p>
                            <p className="text-xs text-blue-700 mt-1">
                              Your account is linked to Discord. Username and email are automatically synced and cannot be changed here.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Info */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Account Details</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-semibold text-gray-700">Account Created</span>
                          <span className="text-sm text-gray-900">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-semibold text-gray-700">Role</span>
                          <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm font-semibold rounded-lg">
                            {user.role}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-semibold text-gray-700">Credits Balance</span>
                          <span className="text-sm font-bold text-gray-900">{user.credits} credits</span>
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
