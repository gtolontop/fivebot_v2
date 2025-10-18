'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card, PanelCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { designTokens } from '@/styles/design-tokens';

export default function CreateBotPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    token: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await botsAPI.create(formData);
      toast.success('Bot created successfully!');
      router.push('/bots');
    } catch (error: any) {
      console.error('Error creating bot:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create bot';

      // Check if error is about duplicate token
      if (errorMessage.includes('already have a bot with this token') ||
          errorMessage.includes('already in use')) {
        // Show the actual error message from backend
        toast.error(errorMessage);
        // Redirect to bots overview page
        setTimeout(() => {
          router.push('/bots');
        }, 2000);
        return;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
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
    <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Bot</h1>
              <p className="text-gray-500 mt-1">Set up your Discord bot in minutes</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Form Section - Takes up more space */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full">
              <div className="p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Bot Configuration</h2>
                  <p className="text-sm text-gray-500 mt-1">Enter your bot details to get started</p>
                </div>

                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                      </svg>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-8">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                        Bot Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="My Awesome Bot"
                        className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                      <p className="mt-2 text-sm text-gray-500">Choose a unique name to identify your bot</p>
                    </div>

                    <div>
                      <label htmlFor="token" className="block text-sm font-semibold text-gray-900 mb-2">
                        Discord Bot Token
                      </label>
                      <input
                        type="password"
                        id="token"
                        name="token"
                        value={formData.token}
                        onChange={handleChange}
                        required
                        placeholder="MTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-mono"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Get your token from the{' '}
                        <a
                          href="https://discord.com/developers/applications"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
                        >
                          Discord Developer Portal
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="ghost"
                      fullWidth
                      onClick={() => router.push('/bots')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      loading={isSubmitting}
                      disabled={!formData.name || !formData.token}
                      icon={
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                        </svg>
                      }
                    >
                      Create Bot
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Sidebar - More compact */}
          <div className="xl:col-span-2 space-y-6">
            {/* Quick Guide */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                <h3 className="text-base font-semibold text-gray-900">Quick Setup Guide</h3>
              </div>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                  <span className="pt-0.5">Visit <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium">Discord Developer Portal</a></span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                  <span className="pt-0.5">Create a "New Application"</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                  <span className="pt-0.5">Go to "Bot" tab and click "Add Bot"</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">4</span>
                  <span className="pt-0.5">Copy the bot token</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">5</span>
                  <span className="pt-0.5">Enable necessary intents (Server Members, Message Content)</span>
                </li>
              </ol>
            </div>

            {/* Requirements & Cost */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-5 h-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <h3 className="text-base font-semibold text-gray-900">Requirements</h3>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-success-500 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-700"><span className="font-semibold text-gray-900">{user.credits}</span> Credits available</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-success-500 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-700">Valid Discord Bot Token</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-success-500 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-700">Server Members Intent enabled</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="bg-gradient-to-br from-purple-50 to-primary-50 rounded-lg border border-purple-200 p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                    </svg>
                    <h4 className="text-sm font-semibold text-gray-900">Cost: 10 Credits</h4>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Your bot will be hosted 24/7 with premium features.
                  </p>
                  <div className="text-xs text-purple-700 bg-purple-100 rounded-lg p-2 font-medium">
                    💡 Tip: Inactive bots are automatically paused to save credits.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
