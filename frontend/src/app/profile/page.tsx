'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  BellIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  const profileCategories = [
    {
      icon: BellIcon,
      title: 'Notifications',
      description: 'Manage your notifications and alerts',
      href: '/profile/notifications',
      badge: 3,
      color: 'blue',
    },
    {
      icon: UserCircleIcon,
      title: 'Account Settings',
      description: 'Update your profile and preferences',
      href: '/settings',
      color: 'purple',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Privacy & Security',
      description: 'Control your privacy settings',
      href: '/settings/privacy',
      color: 'green',
    },
    {
      icon: CreditCardIcon,
      title: 'Billing & Credits',
      description: 'Manage your subscription and credits',
      href: '/settings/billing',
      color: 'yellow',
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-100',
          icon: 'text-blue-600',
          border: 'border-blue-200',
          hover: 'hover:bg-blue-50',
        };
      case 'purple':
        return {
          bg: 'bg-purple-100',
          icon: 'text-purple-600',
          border: 'border-purple-200',
          hover: 'hover:bg-purple-50',
        };
      case 'green':
        return {
          bg: 'bg-green-100',
          icon: 'text-green-600',
          border: 'border-green-200',
          hover: 'hover:bg-green-50',
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-100',
          icon: 'text-yellow-600',
          border: 'border-yellow-200',
          hover: 'hover:bg-yellow-50',
        };
      default:
        return {
          bg: 'bg-gray-100',
          icon: 'text-gray-600',
          border: 'border-gray-200',
          hover: 'hover:bg-gray-50',
        };
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
          <div className="flex items-center gap-4">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt="Avatar"
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-3xl font-bold text-white">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.username}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-lg">
                  {user.role}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
                  {user.credits} credits
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profileCategories.map((category) => {
            const Icon = category.icon;
            const colors = getColorClasses(category.color);

            return (
              <button
                key={category.href}
                onClick={() => router.push(category.href)}
                className={`bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 text-left transition-all ${colors.hover} hover:shadow-lg`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  {category.badge && (
                    <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                      {category.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {category.title}
                </h3>
                <p className="text-sm text-gray-500">{category.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
