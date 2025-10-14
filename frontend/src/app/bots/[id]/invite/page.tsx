'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { designTokens } from '@/styles/design-tokens';

export default function BotInvitePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params.id as string;

  const [bot, setBot] = useState<any>(null);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchBot();
      fetchGuilds();
    }
  }, [user, botId]);

  const fetchBot = async () => {
    try {
      const response = await botsAPI.getById(botId);
      setBot(response.data);

      // Generate invite link
      const linkResponse = await botsAPI.getInviteLink(botId);
      setInviteLink(linkResponse.data.inviteLink);
    } catch (error: any) {
      console.error('Error fetching bot:', error);
      toast.error('Failed to load bot details');
    }
  };

  const fetchGuilds = async () => {
    try {
      const response = await botsAPI.getGuilds(botId);
      setGuilds(response.data || []);
    } catch (error: any) {
      console.error('Error fetching guilds:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied to clipboard!');
  };

  const getGuildIcon = (guild: any) => {
    if (guild.icon) {
      return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
    }
    // Default Discord icon
    return `https://api.dicebear.com/7.x/initials/svg?seed=${guild.name}`;
  };

  const isBotInGuild = (guildId: string) => {
    return bot?.guilds?.some((g: any) => g.id === guildId);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !bot) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <button
              onClick={() => router.push(`/bots/${botId}`)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={designTokens.typography.h1}>Invite {bot.name}</h1>
          </div>
          <p className={designTokens.typography.body + ' text-gray-500'}>
            Invite your bot to Discord servers
          </p>
        </div>

        {/* Invite Link Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bot Invite Link
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm font-mono"
                />
                <button
                  onClick={copyInviteLink}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                </button>
                <a
                  href={inviteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>Open</span>
                </a>
              </div>
            </div>
          </div>
        </Card>

        {/* User's Guilds */}
        <div>
          <h2 className={designTokens.typography.h2 + ' mb-4'}>Your Discord Servers</h2>
          <p className="text-sm text-gray-600 mb-4">
            Click on a server to invite the bot. Servers where the bot is already present are highlighted.
          </p>

          {guilds.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-gray-400 text-5xl mb-4">🏠</div>
              <h3 className={designTokens.typography.h3 + ' mb-2'}>No servers found</h3>
              <p className="text-gray-500">
                You need to be a server administrator to invite bots
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guilds.map((guild) => {
                const botPresent = isBotInGuild(guild.id);
                return (
                  <a
                    key={guild.id}
                    href={botPresent ? '#' : `${inviteLink}&guild_id=${guild.id}`}
                    target={botPresent ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className={`
                      block p-4 rounded-lg border-2 transition-all duration-200
                      ${botPresent
                        ? 'border-green-200 bg-green-50 cursor-default'
                        : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-md cursor-pointer'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`
                        relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0
                        ${botPresent ? 'ring-2 ring-green-400' : 'ring-2 ring-gray-200'}
                      `}>
                        <img
                          src={getGuildIcon(guild)}
                          alt={guild.name}
                          className="w-full h-full object-cover"
                        />
                        {botPresent && (
                          <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`
                          font-semibold truncate
                          ${botPresent ? 'text-green-900' : 'text-gray-900'}
                        `}>
                          {guild.name}
                        </h3>
                        <p className={`
                          text-sm truncate
                          ${botPresent ? 'text-green-600' : 'text-gray-500'}
                        `}>
                          {botPresent ? (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Bot is here
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Click to invite
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
