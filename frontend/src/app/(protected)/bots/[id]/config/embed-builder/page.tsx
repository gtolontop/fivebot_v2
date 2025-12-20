'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI, api } from '@/utils/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { 
  ArrowLeftIcon, 
  SparklesIcon, 
  PaperAirplaneIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  HashtagIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

// Dynamic import for the V2 Embed Builder
const V2EmbedBuilder = dynamic(
  () => import('@/components/dashboard/bot-config/V2EmbedBuilderNew'),
  { ssr: false }
);

interface EmbedTemplate {
  id: string;
  name: string;
  description: string;
  data: any[];
  createdAt: string;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export default function EmbedBuilderPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params.id as string;

  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmbedTemplate | null>(null);
  const [templates, setTemplates] = useState<EmbedTemplate[]>([]);
  
  // Send modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState<EmbedTemplate | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [guilds, setGuilds] = useState<any[]>([]);

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
      const response = await botsAPI.getById(botId);
      setBot(response.data);
      
      // Load saved templates from config (stored as JSON string)
      const savedTemplatesRaw = response.data.config?.embedTemplates;
      const savedTemplates = savedTemplatesRaw ? 
        (typeof savedTemplatesRaw === 'string' ? JSON.parse(savedTemplatesRaw) : savedTemplatesRaw) 
        : [];
      setTemplates(savedTemplates);
      
      // Load guilds
      if (response.data.guilds) {
        setGuilds(response.data.guilds);
      }
    } catch (error: any) {
      console.error('Error fetching bot:', error);
      toast.error('Failed to load bot details');
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async (guildId: string) => {
    if (!guildId) return;
    setLoadingChannels(true);
    try {
      const response = await api.get(`/bots/${botId}/guilds/${guildId}/channels`);
      // Filter to text channels only (type 0)
      const textChannels = response.data.filter((c: DiscordChannel) => c.type === 0);
      setChannels(textChannels);
    } catch (error: any) {
      console.error('Error fetching channels:', error);
      toast.error('Failed to load channels');
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleSaveEmbed = async (data: any[]) => {
    try {
      const templateName = editingTemplate?.name || `Embed ${templates.length + 1}`;
      const newTemplate: EmbedTemplate = {
        id: editingTemplate?.id || `embed_${Date.now()}`,
        name: templateName,
        description: `Created on ${new Date().toLocaleDateString()}`,
        data,
        createdAt: editingTemplate?.createdAt || new Date().toISOString(),
      };

      let updatedTemplates: EmbedTemplate[];
      if (editingTemplate) {
        updatedTemplates = templates.map(t => t.id === editingTemplate.id ? newTemplate : t);
      } else {
        updatedTemplates = [...templates, newTemplate];
      }

      // Serialize templates to JSON string for storage
      await botsAPI.updateConfig(botId, { embedTemplates: JSON.stringify(updatedTemplates) });
      setTemplates(updatedTemplates);
      setShowBuilder(false);
      setEditingTemplate(null);
      toast.success('Embed saved successfully!');
    } catch (error: any) {
      console.error('Error saving embed:', error);
      toast.error('Failed to save embed');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      // Serialize templates to JSON string for storage
      await botsAPI.updateConfig(botId, { embedTemplates: JSON.stringify(updatedTemplates) });
      setTemplates(updatedTemplates);
      toast.success('Template deleted');
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (template: EmbedTemplate) => {
    const newTemplate: EmbedTemplate = {
      ...template,
      id: `embed_${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
    };
    const updatedTemplates = [...templates, newTemplate];
    await botsAPI.updateConfig(botId, { embedTemplates: JSON.stringify(updatedTemplates) });
    setTemplates(updatedTemplates);
    toast.success('Template duplicated!');
  };

  const openSendModal = (template: EmbedTemplate) => {
    setSendingTemplate(template);
    setShowSendModal(true);
    setSelectedChannel('');
    setSelectedGuild('');
    setChannels([]);
  };

  const handleSendEmbed = async () => {
    if (!selectedChannel || !sendingTemplate) {
      toast.error('Please select a channel');
      return;
    }
    
    setSending(true);
    try {
      await api.post(`/bots/${botId}/send-embed`, {
        channelId: selectedChannel,
        embedData: sendingTemplate.data,
      });
      toast.success('Embed sent successfully!');
      setShowSendModal(false);
      setSendingTemplate(null);
    } catch (error: any) {
      console.error('Error sending embed:', error);
      toast.error(error.response?.data?.message || 'Failed to send embed');
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading Embed Builder...</p>
        </div>
      </div>
    );
  }

  if (!user || !bot) return null;

  // Show the builder in fullscreen mode
  if (showBuilder) {
    return (
      <V2EmbedBuilder
        commandName={editingTemplate?.name || 'New Embed'}
        embedData={editingTemplate?.data || []}
        onSave={handleSaveEmbed}
        onClose={() => {
          setShowBuilder(false);
          setEditingTemplate(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Gradient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/bots/${botId}/config`)}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-200 hover:scale-105"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <span className="text-2xl">📋</span>
                </div>
                Embed Builder
              </h1>
              <p className="text-gray-400 mt-1">
                Create and send beautiful Discord embeds with V2 components
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowBuilder(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105"
          >
            <SparklesIcon className="w-5 h-5" />
            Create New Embed
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Total Embeds</p>
            <p className="text-2xl font-bold text-white">{templates.length}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Connected Servers</p>
            <p className="text-2xl font-bold text-white">{guilds.length}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Bot Status</p>
            <p className="text-2xl font-bold text-green-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Online
            </p>
          </div>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-20 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/20">
              <span className="text-5xl">📋</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No embeds yet</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg">
              Create your first embed using our visual V2 editor with containers, buttons, and media galleries.
            </p>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowBuilder(true);
              }}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl transition-all duration-200 font-semibold text-lg shadow-lg shadow-indigo-500/25"
            >
              Create Your First Embed
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-300"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/20">
                      <span className="text-lg">📝</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg group-hover:text-indigo-300 transition-colors">{template.name}</h3>
                      <p className="text-sm text-gray-500">{template.description}</p>
                    </div>
                  </div>
                </div>

                {/* Preview placeholder */}
                <div className="bg-[#2f3136] rounded-xl p-4 mb-4 min-h-[80px] border border-white/5">
                  <p className="text-gray-400 text-sm">
                    {template.data.length} container{template.data.length !== 1 ? 's' : ''}
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openSendModal(template)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-green-500/20"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Send
                  </button>
                  <button
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowBuilder(true);
                    }}
                    className="p-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl transition-colors"
                    title="Edit"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicateTemplate(template)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors"
                    title="Duplicate"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Features Section */}
        <div className="mt-16 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-white mb-6">V2 Embed Builder Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🎨', title: 'Visual Editor', desc: 'Drag-and-drop interface' },
              { icon: '👁️', title: 'Live Preview', desc: 'See changes in real-time' },
              { icon: '📚', title: 'Templates', desc: 'Pre-made designs to start with' },
              { icon: '🖼️', title: 'Media Support', desc: 'Images and galleries' },
              { icon: '🔘', title: 'Buttons', desc: 'Interactive button components' },
              { icon: '📤', title: 'Send Anywhere', desc: 'Send to any channel' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-lg">
                  {feature.icon}
                </div>
                <div>
                  <p className="font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-gray-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && sendingTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <PaperAirplaneIcon className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Send Embed</h3>
                  <p className="text-sm text-gray-400">{sendingTemplate.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Server Select */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Server
                </label>
                <select
                  value={selectedGuild}
                  onChange={(e) => {
                    setSelectedGuild(e.target.value);
                    setSelectedChannel('');
                    fetchChannels(e.target.value);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Choose a server...</option>
                  {guilds.map((guild) => (
                    <option key={guild.id} value={guild.id}>
                      {guild.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel Select */}
              {selectedGuild && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Channel
                  </label>
                  {loadingChannels ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <select
                      value={selectedChannel}
                      onChange={(e) => setSelectedChannel(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="">Choose a channel...</option>
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          # {channel.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 p-6 border-t border-white/10">
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmbed}
                disabled={!selectedChannel || sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-200"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Send Embed
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
