'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';

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
    } catch (error: any) {
      console.error('Error fetching bot:', error);
      toast.error('Failed to load bot details');
    } finally {
      setLoading(false);
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/bots/${botId}/config`)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Embed Builder
              </h1>
              <p className="text-gray-400 text-sm">
                Create beautiful Discord embeds with our V2 visual editor
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowBuilder(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
          >
            <SparklesIcon className="w-5 h-5" />
            Create New Embed
          </button>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">📋</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No embeds yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create your first embed using our visual V2 editor. Design beautiful messages with containers, buttons, and media galleries.
            </p>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowBuilder(true);
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
            >
              Create Your First Embed
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{template.name}</h3>
                    <p className="text-sm text-gray-400">{template.description}</p>
                  </div>
                  <span className="text-2xl">📝</span>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowBuilder(true);
                    }}
                    className="flex-1 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">V2 Embed Builder Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-indigo-400">✓</span>
              <span className="text-gray-300">Drag-and-drop container system</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-indigo-400">✓</span>
              <span className="text-gray-300">Live Discord preview</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-indigo-400">✓</span>
              <span className="text-gray-300">Template library (Rules, Welcome, etc.)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-indigo-400">✓</span>
              <span className="text-gray-300">Media galleries support</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-indigo-400">✓</span>
              <span className="text-gray-300">Button customization (styles, URLs)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-indigo-400">✓</span>
              <span className="text-gray-300">Rich markdown support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
