'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI, usersAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  PlusCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface Bot {
  id: string;
  name: string;
  avatar?: string;
  guilds?: any[];
}

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  owner: boolean;
  permissions: string;
}

export default function BotServersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params.id as string;

  const [bot, setBot] = useState<Bot | null>(null);
  const [botGuilds, setBotGuilds] = useState<Guild[]>([]);
  const [userGuilds, setUserGuilds] = useState<Guild[]>([]);
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
      setInviteLink(linkResponse.data.inviteUrl);
    } catch (error: any) {
      console.error('Error fetching bot:', error);
      toast.error('Failed to load bot details');
    }
  };

  const fetchGuilds = async () => {
    try {
      // Fetch both bot guilds and user guilds in parallel
      const [botGuildsResponse, userGuildsResponse] = await Promise.all([
        botsAPI.getGuilds(botId),
        usersAPI.getMyGuilds(),
      ]);

      setBotGuilds(botGuildsResponse.data || []);
      setUserGuilds(userGuildsResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching guilds:', error);
      toast.error('Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const getGuildIcon = (guild: Guild) => {
    if (guild.icon) {
      return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
    }
    return `https://api.dicebear.com/7.x/initials/svg?seed=${guild.name}`;
  };

  const handleInviteToServer = (guildId?: string) => {
    if (inviteLink) {
      const url = guildId
        ? `${inviteLink}&guild_id=${guildId}&disable_guild_select=true`
        : inviteLink;
      window.open(url, '_blank');
      toast.success('Opening Discord invite page...');
    }
  };

  // Separate servers into two categories
  const botGuildIds = new Set(botGuilds.map(g => g.id));
  const serversWithBot = botGuilds;
  const serversWithoutBot = userGuilds.filter(g => !botGuildIds.has(g.id));

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading servers...</p>
          </div>
        </div>
    );
  }

  if (!user || !bot) return null;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
          <div className="flex items-center gap-4">
            {bot.avatar && (
              <img src={bot.avatar} alt={bot.name} className="w-12 h-12 rounded-xl" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{bot.name} Servers</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage servers where your bot is present
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600">
                {serversWithBot.length}
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Active Servers</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <PlusCircleIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {serversWithoutBot.length}
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Available Servers</p>
          </div>
        </div>

        {/* Active Servers */}
        {serversWithBot.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Active Servers</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Servers where {bot.name} is currently active
                </p>
              </div>
              <button
                onClick={() => handleInviteToServer()}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Invite to New Server
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serversWithBot.map((guild) => (
                <div
                  key={guild.id}
                  className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <img
                        src={getGuildIcon(guild)}
                        alt={guild.name}
                        className="w-16 h-16 rounded-xl"
                      />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <CheckCircleIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">
                        {guild.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {guild.memberCount?.toLocaleString() || 0} members
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-md text-xs font-semibold">
                          <CheckCircleIcon className="w-3 h-3" />
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-12 text-center">
            <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <PlusCircleIcon className="w-10 h-10 text-primary-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No servers yet</h3>
            <p className="text-gray-500 mb-4">
              {bot.name} is not in any servers yet. Invite it to get started!
            </p>
            <button
              onClick={() => handleInviteToServer()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              <PlusCircleIcon className="w-5 h-5" />
              Invite to Server
            </button>
          </div>
        )}

        {/* Available Servers */}
        {serversWithoutBot.length > 0 && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">Available Servers</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Click on a server to invite {bot.name}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serversWithoutBot.map((guild) => (
                <button
                  key={guild.id}
                  onClick={() => handleInviteToServer(guild.id)}
                  className="bg-gradient-to-br from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 rounded-xl p-5 border border-gray-200 hover:border-gray-300 shadow-sm transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <img
                        src={getGuildIcon(guild)}
                        alt={guild.name}
                        className="w-16 h-16 rounded-xl opacity-75 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center group-hover:scale-110 transition-transform">
                        <PlusCircleIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                        {guild.name}
                      </h3>
                      {guild.memberCount && (
                        <p className="text-sm text-gray-600 mt-0.5">
                          {guild.memberCount.toLocaleString()} members
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700 rounded-md text-xs font-semibold transition-colors">
                          <PlusCircleIcon className="w-3 h-3" />
                          Click to invite
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
  );
}
