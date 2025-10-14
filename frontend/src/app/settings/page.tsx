'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, PanelCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { designTokens } from '@/styles/design-tokens';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    botStatusAlerts: true,
    weeklyReports: false,
    marketingEmails: false,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [user, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNotificationChange = (key: string) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof notifications],
    }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profile updated successfully!');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    toast.success('Password changed successfully!');
    setFormData({
      ...formData,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion coming soon');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={designTokens.typography.h1}>Settings</h1>
          <p className={designTokens.typography.body + ' text-gray-500'}>
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar Navigation */}
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2 rounded-lg bg-primary-50 text-primary-600 font-medium">
              Profile
            </button>
            <button
              onClick={() => router.push('/settings/billing')}
              className="w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
            >
              Billing
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium">
              Notifications
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium">
              Security
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium">
              API Keys
            </button>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information */}
            <PanelCard title="Profile Information" subtitle="Update your account details">
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                    size="xl"
                    fallback={user.username?.substring(0, 2) || 'U'}
                  />
                  <div>
                    <Button variant="outline" size="sm">
                      Change Avatar
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>

                <Input
                  label="Username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  helperText="We'll never share your email with anyone else"
                />

                <div className="flex justify-end">
                  <Button type="submit" variant="primary">
                    Save Changes
                  </Button>
                </div>
              </form>
            </PanelCard>

            {/* Change Password */}
            <PanelCard title="Change Password" subtitle="Update your password">
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <Input
                  label="Current Password"
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="New Password"
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  helperText="Must be at least 8 characters"
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />

                <div className="flex justify-end">
                  <Button type="submit" variant="primary">
                    Update Password
                  </Button>
                </div>
              </form>
            </PanelCard>

            {/* Notification Preferences */}
            <PanelCard title="Notification Preferences" subtitle="Manage how you receive notifications">
              <div className="space-y-4">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive email notifications for important events' },
                  { key: 'botStatusAlerts', label: 'Bot Status Alerts', desc: 'Get notified when your bots go offline' },
                  { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Receive weekly analytics reports' },
                  { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Receive updates about new features and promotions' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                    <div>
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-sm text-gray-500">{desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNotificationChange(key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications[key as keyof typeof notifications] ? 'bg-success-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications[key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </PanelCard>

            {/* Danger Zone */}
            <Card className="border-red-200 bg-red-50 p-6">
              <h3 className={designTokens.typography.h3 + ' text-red-900 mb-2'}>Danger Zone</h3>
              <p className="text-sm text-red-700 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button variant="danger" onClick={handleDeleteAccount}>
                Delete Account
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
