'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { designTokens } from '@/styles/design-tokens';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';

interface Bot {
  id: string;
  name: string;
  token: string;
  prefix: string;
  clientId?: string;
  status: string;
  avatar?: string;
  banner?: string;
}

export default function FrameworkConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchBot();
    }
  }, [user, botId]);

  const fetchBot = async () => {
    try {
      setLoading(true);
      const response = await botsAPI.getById(botId);
      setBot(response.data);
      setName(response.data.name);
      setToken(response.data.token || '');
    } catch (error) {
      console.error('Error fetching bot:', error);
      toast.error('Failed to load bot');
      router.push('/bots');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await botsAPI.updateConfig(botId, { name });
      toast.success('Bot settings saved successfully!');
      fetchBot();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save settings';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateToken = async () => {
    if (!token || token === bot?.token) {
      toast.error('Please enter a new token');
      return;
    }

    if (!confirm('Are you sure you want to update the bot token? The bot will be restarted.')) {
      return;
    }

    try {
      setSaving(true);
      await botsAPI.updateToken(botId, token);
      toast.success('Bot token updated successfully!');
      fetchBot();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update token';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmText = prompt(
      'This action cannot be undone. Type "DELETE" to confirm:'
    );

    if (confirmText !== 'DELETE') {
      toast.error('Deletion cancelled');
      return;
    }

    try {
      setDeleting(true);
      await botsAPI.delete(botId);
      toast.success('Bot deleted successfully');
      router.push('/bots');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete bot';
      toast.error(message);
      setDeleting(false);
    }
  };

  if (authLoading || loading || !bot) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/bots/${botId}/config`)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to configuration</span>
        </button>

        <div className="flex items-center space-x-3">
          <div className="text-4xl">⚙️</div>
          <div>
            <h1 className={designTokens.typography.h1}>Framework Settings</h1>
            <p className={designTokens.typography.body + ' text-gray-500'}>
              Manage bot name, token, and basic configuration
            </p>
          </div>
        </div>
      </div>

      {/* Bot Information */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
        <div>
          <h2 className={designTokens.typography.h3 + ' mb-4'}>Bot Information</h2>

          {/* Bot Name */}
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Bot Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="My Discord Bot"
            />
          </div>

          {/* Client ID (read-only) */}
          {bot.clientId && (
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Client ID
              </label>
              <input
                type="text"
                value={bot.clientId}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Bot Token */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
        <div>
          <h2 className={designTokens.typography.h3 + ' mb-4'}>Bot Token</h2>

          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Discord Bot Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter new token..."
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Updating the token will restart your bot
            </p>
          </div>

          <button
            onClick={handleUpdateToken}
            disabled={saving}
            className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Updating...' : 'Update Token'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl p-6 border border-red-200 space-y-4">
        <div>
          <h2 className={designTokens.typography.h3 + ' mb-2 text-red-900'}>Danger Zone</h2>
          <p className="text-sm text-red-700 mb-4">
            Irreversible and destructive actions
          </p>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting...' : 'Delete Bot'}
          </button>
          <p className="text-sm text-red-600 mt-2">
            This will permanently delete your bot and all its data. This action cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
}
