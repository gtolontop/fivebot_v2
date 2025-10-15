'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usersAPI, utilsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  LinkIcon,
  PhotoIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';

type TabType = 'account' | 'privacy' | 'usage' | 'connectors';

export default function SettingsPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('account');
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

  const tabs = [
    { id: 'account' as const, name: 'Account', icon: UserCircleIcon },
    { id: 'privacy' as const, name: 'Privacy', icon: ShieldCheckIcon },
    { id: 'usage' as const, name: 'Usage', icon: ChartBarIcon },
    { id: 'connectors' as const, name: 'Connectors', icon: LinkIcon, badge: 'Soon' },
  ];

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
            <button className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors">
              Account
            </button>
            <button className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors">
              Privacy
            </button>
            <button
              onClick={() => router.push('/settings/billing')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Billing
            </button>
            <button className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors">
              Usage
            </button>
            <button className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors">
              Connectors
            </button>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-gray-200/50">
                <nav className="flex gap-1 p-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      disabled={tab.badge === 'Soon'}
                      className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                        activeTab === tab.id
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-200'
                          : tab.badge === 'Soon'
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      <span>{tab.name}</span>
                      {tab.badge && (
                        <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Account Tab */}
                {activeTab === 'account' && (
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
                            {new Date(user.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
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
                )}

                {/* Privacy Tab */}
                {activeTab === 'privacy' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Privacy Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-semibold text-gray-900">Profile Visibility</p>
                            <p className="text-sm text-gray-500">Control who can see your profile</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-semibold text-gray-900">Show Online Status</p>
                            <p className="text-sm text-gray-500">Let others see when you're online</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                          </label>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold text-amber-900">Privacy Settings</p>
                            <p className="text-xs text-amber-700 mt-1">
                              These settings are currently being configured and will be available soon.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Usage Tab */}
                {activeTab === 'usage' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Usage Statistics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">Credits Used</span>
                            <ChartBarIcon className="w-5 h-5 text-primary-600" />
                          </div>
                          <p className="text-2xl font-bold text-primary-600">Coming Soon</p>
                          <p className="text-xs text-gray-500 mt-1">This month</p>
                        </div>

                        <div className="p-4 bg-gradient-to-br from-success-50 to-green-50 rounded-xl border border-success-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">Bots Active</span>
                            <svg className="w-5 h-5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-2xl font-bold text-success-600">Coming Soon</p>
                          <p className="text-xs text-gray-500 mt-1">Currently running</p>
                        </div>
                      </div>

                      <div className="mt-6 flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-purple-900">New Usage System Coming</p>
                          <p className="text-xs text-purple-700 mt-1">
                            We're redesigning the entire usage calculation system. Detailed statistics will be available soon.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Connectors Tab */}
                {activeTab === 'connectors' && (
                  <div className="text-center py-12">
                    <LinkIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Connectors Coming Soon</h3>
                    <p className="text-sm text-gray-500">
                      Connect your favorite services and integrations
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
