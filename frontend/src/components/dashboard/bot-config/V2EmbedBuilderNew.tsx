'use client';

import React, { useState, useCallback } from 'react';
import {
  XMarkIcon,
  TrashIcon,
  PlusIcon,
  PhotoIcon,
  Bars3Icon,
  EyeIcon,
  EyeSlashIcon,
  DocumentDuplicateIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowsUpDownIcon,
  SparklesIcon,
  CheckIcon,
  LinkIcon,
  ChatBubbleBottomCenterTextIcon,
  Squares2X2Icon,
  MinusIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface V2EmbedBuilderProps {
  commandName: string;
  embedData: any[];
  onSave: (data: any[]) => void;
  onClose: () => void;
}

interface Container {
  id: number;
  type: number;
  accent_color?: number;
  components: Component[];
}

interface Component {
  id: number;
  type: number;
  content?: string;
  style?: number;
  items?: MediaItem[];
  components?: ButtonComponent[];
  divider?: boolean;
  spacing?: number;
}

interface MediaItem {
  media: { url: string };
  description?: string;
  spoiler?: boolean;
}

interface ButtonComponent {
  id: number;
  type: number;
  style: number;
  label: string;
  url?: string;
  custom_id?: string;
  emoji?: { id: string | null; name: string };
  disabled?: boolean;
}

const COMPONENT_TYPES = {
  CONTAINER: 17,
  MEDIA_GALLERY: 12,
  TEXT: 10,
  DIVIDER: 14,
  ACTION_ROW: 1,
  BUTTON: 2,
};

const BUTTON_STYLES = [
  { value: 1, label: 'Primary', color: 'bg-indigo-500', textColor: 'text-white' },
  { value: 2, label: 'Secondary', color: 'bg-gray-500', textColor: 'text-white' },
  { value: 3, label: 'Success', color: 'bg-green-500', textColor: 'text-white' },
  { value: 4, label: 'Danger', color: 'bg-red-500', textColor: 'text-white' },
  { value: 5, label: 'Link', color: 'bg-gray-600', textColor: 'text-white' },
];

// ============================================================================
// TEMPLATES
// ============================================================================

const TEMPLATES = {
  blank: {
    name: 'Blank',
    icon: '📝',
    description: 'Start from scratch',
    containers: [],
  },
  rules: {
    name: 'Server Rules',
    icon: '📋',
    description: 'Classic server rules layout',
    containers: [
      {
        id: 1,
        type: COMPONENT_TYPES.CONTAINER,
        components: [
          { id: 2, type: COMPONENT_TYPES.TEXT, content: '# 📜 __Server Rules__' },
          { id: 3, type: COMPONENT_TYPES.TEXT, content: '>>> **Welcome to our server!**\n\nPlease read and follow these rules to ensure a great experience for everyone.' },
          { id: 4, type: COMPONENT_TYPES.DIVIDER, divider: true, spacing: 1 },
          { id: 5, type: COMPONENT_TYPES.TEXT, content: '`1. Be Respectful`\n-# Treat all members with kindness and respect.' },
          { id: 6, type: COMPONENT_TYPES.TEXT, content: '`2. No Spam`\n-# Avoid repetitive messages, links, or content.' },
          { id: 7, type: COMPONENT_TYPES.TEXT, content: '`3. Stay On Topic`\n-# Keep discussions relevant to each channel.' },
          { id: 8, type: COMPONENT_TYPES.TEXT, content: '`4. No NSFW Content`\n-# Keep all content appropriate and safe.' },
          { id: 9, type: COMPONENT_TYPES.DIVIDER, divider: true, spacing: 1 },
        ],
      },
    ],
  },
  welcome: {
    name: 'Welcome',
    icon: '👋',
    description: 'Welcome new members',
    containers: [
      {
        id: 1,
        type: COMPONENT_TYPES.CONTAINER,
        components: [
          {
            id: 2,
            type: COMPONENT_TYPES.MEDIA_GALLERY,
            items: [{ media: { url: 'https://cdn.discordapp.com/attachments/placeholder/banner.png' }, description: 'Welcome Banner' }],
          },
          { id: 3, type: COMPONENT_TYPES.TEXT, content: '# 🎉 __Welcome to Our Server!__' },
          { id: 4, type: COMPONENT_TYPES.TEXT, content: '>>> We\'re so glad to have you here! Make yourself at home and explore our community.\n\n**Here\'s what you can do:**\n• Introduce yourself\n• Check out our channels\n• Join the conversation' },
          { id: 5, type: COMPONENT_TYPES.DIVIDER, divider: true, spacing: 1 },
          {
            id: 6,
            type: COMPONENT_TYPES.ACTION_ROW,
            components: [
              { id: 7, type: COMPONENT_TYPES.BUTTON, style: 1, label: '📜 Rules', custom_id: 'view_rules' },
              { id: 8, type: COMPONENT_TYPES.BUTTON, style: 2, label: '🎭 Get Roles', custom_id: 'get_roles' },
              { id: 9, type: COMPONENT_TYPES.BUTTON, style: 5, label: '🌐 Website', url: 'https://example.com' },
            ],
          },
        ],
      },
    ],
  },
  info: {
    name: 'Info Panel',
    icon: 'ℹ️',
    description: 'Information display',
    containers: [
      {
        id: 1,
        type: COMPONENT_TYPES.CONTAINER,
        components: [
          { id: 2, type: COMPONENT_TYPES.TEXT, content: '# 📊 __Server Information__' },
          { id: 3, type: COMPONENT_TYPES.DIVIDER, divider: true, spacing: 1 },
          { id: 4, type: COMPONENT_TYPES.TEXT, content: '`Server Name`\n-# **{server.name}**' },
          { id: 5, type: COMPONENT_TYPES.TEXT, content: '`Members`\n-# **{server.memberCount}** members' },
          { id: 6, type: COMPONENT_TYPES.TEXT, content: '`Created`\n-# **{server.createdAt}**' },
          { id: 7, type: COMPONENT_TYPES.DIVIDER, divider: true, spacing: 1 },
        ],
      },
    ],
  },
  pricing: {
    name: 'Pricing',
    icon: '💰',
    description: 'Pricing tiers display',
    containers: [
      {
        id: 1,
        type: COMPONENT_TYPES.CONTAINER,
        components: [
          { id: 2, type: COMPONENT_TYPES.TEXT, content: '# 💎 __Pricing Plans__' },
          { id: 3, type: COMPONENT_TYPES.TEXT, content: '>>> Choose the plan that fits your needs!' },
          { id: 4, type: COMPONENT_TYPES.DIVIDER, divider: true, spacing: 1 },
        ],
      },
      {
        id: 10,
        type: COMPONENT_TYPES.CONTAINER,
        components: [
          { id: 11, type: COMPONENT_TYPES.TEXT, content: '## 🆓 Free Plan' },
          { id: 12, type: COMPONENT_TYPES.TEXT, content: '`• 5 Projects`\n`• Community Support`\n`• Basic Features`' },
          { id: 13, type: COMPONENT_TYPES.DIVIDER, divider: true, spacing: 1 },
        ],
      },
      {
        id: 20,
        type: COMPONENT_TYPES.CONTAINER,
        components: [
          { id: 21, type: COMPONENT_TYPES.TEXT, content: '## ⭐ Premium Plan' },
          { id: 22, type: COMPONENT_TYPES.TEXT, content: '`• Unlimited Projects`\n`• Priority Support`\n`• Advanced Features`\n`• API Access`' },
          { id: 23, type: COMPONENT_TYPES.DIVIDER, divider: true, spacing: 1 },
        ],
      },
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = () => Date.now() + Math.random();

const getComponentIcon = (type: number) => {
  switch (type) {
    case COMPONENT_TYPES.TEXT:
      return <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />;
    case COMPONENT_TYPES.MEDIA_GALLERY:
      return <PhotoIcon className="w-4 h-4" />;
    case COMPONENT_TYPES.DIVIDER:
      return <MinusIcon className="w-4 h-4" />;
    case COMPONENT_TYPES.ACTION_ROW:
      return <CursorArrowRaysIcon className="w-4 h-4" />;
    default:
      return <Squares2X2Icon className="w-4 h-4" />;
  }
};

const getComponentLabel = (type: number) => {
  switch (type) {
    case COMPONENT_TYPES.TEXT:
      return 'Text';
    case COMPONENT_TYPES.MEDIA_GALLERY:
      return 'Image';
    case COMPONENT_TYPES.DIVIDER:
      return 'Divider';
    case COMPONENT_TYPES.ACTION_ROW:
      return 'Buttons';
    default:
      return 'Component';
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function V2EmbedBuilderNew({ commandName, embedData, onSave, onClose }: V2EmbedBuilderProps) {
  const [containers, setContainers] = useState<Container[]>(embedData?.length > 0 ? embedData : []);
  const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<{ containerIdx: number; componentIdx: number } | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showTemplates, setShowTemplates] = useState(embedData?.length === 0);

  // ============================================================================
  // CONTAINER OPERATIONS
  // ============================================================================

  const addContainer = useCallback(() => {
    const newContainer: Container = {
      id: generateId(),
      type: COMPONENT_TYPES.CONTAINER,
      components: [],
    };
    setContainers(prev => [...prev, newContainer]);
    setSelectedContainer(containers.length);
    setSelectedComponent(null);
  }, [containers.length]);

  const deleteContainer = useCallback((index: number) => {
    setContainers(prev => prev.filter((_, i) => i !== index));
    if (selectedContainer === index) {
      setSelectedContainer(null);
      setSelectedComponent(null);
    }
  }, [selectedContainer]);

  const moveContainer = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= containers.length) return;

    setContainers(prev => {
      const newContainers = [...prev];
      [newContainers[index], newContainers[newIndex]] = [newContainers[newIndex], newContainers[index]];
      return newContainers;
    });

    if (selectedContainer === index) {
      setSelectedContainer(newIndex);
    } else if (selectedContainer === newIndex) {
      setSelectedContainer(index);
    }
  }, [containers.length, selectedContainer]);

  // ============================================================================
  // COMPONENT OPERATIONS
  // ============================================================================

  const addComponent = useCallback((containerIndex: number, type: number) => {
    const newComponent: Component = {
      id: generateId(),
      type,
    };

    switch (type) {
      case COMPONENT_TYPES.TEXT:
        newComponent.content = 'Your text here...';
        break;
      case COMPONENT_TYPES.MEDIA_GALLERY:
        newComponent.items = [{ media: { url: '' }, description: '' }];
        break;
      case COMPONENT_TYPES.DIVIDER:
        newComponent.divider = true;
        newComponent.spacing = 1;
        break;
      case COMPONENT_TYPES.ACTION_ROW:
        newComponent.components = [];
        break;
    }

    setContainers(prev => {
      const newContainers = [...prev];
      newContainers[containerIndex].components.push(newComponent);
      return newContainers;
    });

    setSelectedComponent({ containerIdx: containerIndex, componentIdx: containers[containerIndex].components.length });
  }, [containers]);

  const updateComponent = useCallback((containerIdx: number, componentIdx: number, updates: Partial<Component>) => {
    setContainers(prev => {
      const newContainers = [...prev];
      newContainers[containerIdx].components[componentIdx] = {
        ...newContainers[containerIdx].components[componentIdx],
        ...updates,
      };
      return newContainers;
    });
  }, []);

  const deleteComponent = useCallback((containerIdx: number, componentIdx: number) => {
    setContainers(prev => {
      const newContainers = [...prev];
      newContainers[containerIdx].components.splice(componentIdx, 1);
      return newContainers;
    });

    if (selectedComponent?.containerIdx === containerIdx && selectedComponent?.componentIdx === componentIdx) {
      setSelectedComponent(null);
    }
  }, [selectedComponent]);

  // ============================================================================
  // BUTTON OPERATIONS
  // ============================================================================

  const addButton = useCallback((containerIdx: number, componentIdx: number) => {
    const newButton: ButtonComponent = {
      id: generateId(),
      type: COMPONENT_TYPES.BUTTON,
      style: 1,
      label: 'Button',
    };

    setContainers(prev => {
      const newContainers = [...prev];
      if (!newContainers[containerIdx].components[componentIdx].components) {
        newContainers[containerIdx].components[componentIdx].components = [];
      }
      newContainers[containerIdx].components[componentIdx].components!.push(newButton);
      return newContainers;
    });
  }, []);

  const updateButton = useCallback((containerIdx: number, componentIdx: number, buttonIdx: number, updates: Partial<ButtonComponent>) => {
    setContainers(prev => {
      const newContainers = [...prev];
      const actionRow = newContainers[containerIdx].components[componentIdx];
      if (actionRow.components && actionRow.components[buttonIdx]) {
        actionRow.components[buttonIdx] = { ...actionRow.components[buttonIdx], ...updates };
      }
      return newContainers;
    });
  }, []);

  const deleteButton = useCallback((containerIdx: number, componentIdx: number, buttonIdx: number) => {
    setContainers(prev => {
      const newContainers = [...prev];
      const actionRow = newContainers[containerIdx].components[componentIdx];
      if (actionRow.components) {
        actionRow.components.splice(buttonIdx, 1);
      }
      return newContainers;
    });
  }, []);

  // ============================================================================
  // DRAG & DROP
  // ============================================================================

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'containers') {
      const newContainers = [...containers];
      const [removed] = newContainers.splice(source.index, 1);
      newContainers.splice(destination.index, 0, removed);
      setContainers(newContainers);
    } else if (type.startsWith('components-')) {
      const containerIdx = parseInt(type.replace('components-', ''));
      const newContainers = [...containers];
      const [removed] = newContainers[containerIdx].components.splice(source.index, 1);
      newContainers[containerIdx].components.splice(destination.index, 0, removed);
      setContainers(newContainers);
    }
  }, [containers]);

  // ============================================================================
  // TEMPLATE & SAVE
  // ============================================================================

  const applyTemplate = useCallback((templateKey: string) => {
    const template = TEMPLATES[templateKey as keyof typeof TEMPLATES];
    if (template) {
      // Deep clone to avoid reference issues
      const clonedContainers = JSON.parse(JSON.stringify(template.containers));
      setContainers(clonedContainers);
      setShowTemplates(false);
      setSelectedContainer(null);
      setSelectedComponent(null);
      if (templateKey !== 'blank') {
        toast.success(`Applied "${template.name}" template`);
      }
    }
  }, []);

  const handleSave = useCallback(() => {
    onSave(containers);
    toast.success('Embed saved!');
    onClose();
  }, [containers, onSave, onClose]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(containers, null, 2));
    toast.success('Copied to clipboard!');
  }, [containers]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderDiscordPreview = () => {
    if (containers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <Squares2X2Icon className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">No containers yet</p>
          <p className="text-xs mt-1">Add a container to see the preview</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {containers.map((container, containerIdx) => (
          <div
            key={container.id}
            className="bg-[#2b2d31] rounded-lg p-4 border-l-4 border-[#5865f2]"
          >
            {container.components.map((component, componentIdx) => (
              <div key={component.id} className="mb-2 last:mb-0">
                {component.type === COMPONENT_TYPES.TEXT && (
                  <div className="text-white whitespace-pre-wrap text-sm">
                    {renderMarkdown(component.content || '')}
                  </div>
                )}
                {component.type === COMPONENT_TYPES.MEDIA_GALLERY && component.items?.[0]?.media?.url && (
                  <img
                    src={component.items[0].media.url}
                    alt={component.items[0].description || ''}
                    className="rounded-lg max-h-64 object-cover w-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                {component.type === COMPONENT_TYPES.DIVIDER && (
                  <hr className="border-[#3f4147] my-2" />
                )}
                {component.type === COMPONENT_TYPES.ACTION_ROW && component.components && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {component.components.map((btn, btnIdx) => (
                      <button
                        key={btn.id || btnIdx}
                        className={`px-4 py-1.5 rounded text-sm font-medium ${
                          BUTTON_STYLES.find(s => s.value === btn.style)?.color || 'bg-gray-500'
                        } text-white hover:opacity-90 transition-opacity`}
                      >
                        {btn.emoji?.name && <span className="mr-1">{btn.emoji.name}</span>}
                        {btn.label}
                        {btn.style === 5 && <LinkIcon className="w-3 h-3 ml-1 inline" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown rendering for preview
    let html = text
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-white">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-white">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white">$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Underline (Discord style)
      .replace(/__(.+?)__/g, '<u>$1</u>')
      // Code blocks
      .replace(/`([^`]+)`/g, '<code class="bg-[#1e1f22] px-1 rounded text-[#eb459e]">$1</code>')
      // Blockquotes
      .replace(/^>>> (.+)$/gm, '<div class="border-l-4 border-[#4e5058] pl-3 text-[#b5bac1]">$1</div>')
      .replace(/^> (.+)$/gm, '<div class="border-l-2 border-[#4e5058] pl-2 text-[#b5bac1]">$1</div>')
      // Small text (Discord subtext)
      .replace(/^-# (.+)$/gm, '<span class="text-xs text-[#949ba4]">$1</span>')
      // Line breaks
      .replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // ============================================================================
  // TEMPLATE SELECTOR
  // ============================================================================

  if (showTemplates) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Choose a Template</h2>
              <p className="text-sm text-gray-500 mt-1">Start with a template or create from scratch</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Templates Grid */}
          <div className="p-6 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
            {Object.entries(TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => applyTemplate(key)}
                className="text-left p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{template.icon}</span>
                  <span className="font-semibold text-gray-900 group-hover:text-indigo-600">{template.name}</span>
                </div>
                <p className="text-sm text-gray-500">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN BUILDER UI
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              V2 Embed Builder
              {commandName && <span className="text-indigo-600 ml-2">/{commandName}</span>}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <SparklesIcon className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showPreview ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              Copy JSON
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <CheckIcon className="w-4 h-4" />
              Save & Close
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Editor */}
          <div className={`flex-1 flex flex-col overflow-hidden ${showPreview ? 'border-r border-gray-200' : ''}`}>
            {/* Toolbar */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 shrink-0">
              <button
                onClick={addContainer}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-lg hover:bg-indigo-200 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Container
              </button>
              <span className="text-sm text-gray-500 ml-auto">
                {containers.length} container{containers.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Containers List */}
            <div className="flex-1 overflow-y-auto p-4">
              {containers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Squares2X2Icon className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium text-gray-500">No containers yet</p>
                  <p className="text-sm mt-1">Click "Add Container" to get started</p>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="containers" type="containers">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                        {containers.map((container, containerIdx) => (
                          <Draggable key={container.id} draggableId={`container-${container.id}`} index={containerIdx}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`border-2 rounded-xl overflow-hidden transition-all ${
                                  selectedContainer === containerIdx
                                    ? 'border-indigo-400 shadow-lg'
                                    : 'border-gray-200 hover:border-gray-300'
                                } ${snapshot.isDragging ? 'shadow-xl' : ''}`}
                              >
                                {/* Container Header */}
                                <div
                                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer ${
                                    selectedContainer === containerIdx ? 'bg-indigo-50' : 'bg-gray-50'
                                  }`}
                                  onClick={() => {
                                    setSelectedContainer(selectedContainer === containerIdx ? null : containerIdx);
                                    setSelectedComponent(null);
                                  }}
                                >
                                  <div {...provided.dragHandleProps} className="cursor-grab hover:bg-gray-200 p-1 rounded">
                                    <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />
                                  </div>
                                  <span className="font-semibold text-gray-900">Container {containerIdx + 1}</span>
                                  <span className="text-xs text-gray-500">
                                    {container.components.length} component{container.components.length !== 1 ? 's' : ''}
                                  </span>
                                  <div className="ml-auto flex items-center gap-1">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); moveContainer(containerIdx, 'up'); }}
                                      disabled={containerIdx === 0}
                                      className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-30"
                                    >
                                      <ChevronUpIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); moveContainer(containerIdx, 'down'); }}
                                      disabled={containerIdx === containers.length - 1}
                                      className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-30"
                                    >
                                      <ChevronDownIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteContainer(containerIdx); }}
                                      className="p-1.5 hover:bg-red-100 text-red-500 rounded"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Container Content (Expanded) */}
                                {selectedContainer === containerIdx && (
                                  <div className="p-4 bg-white">
                                    {/* Add Component Buttons */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                      <button
                                        onClick={() => addComponent(containerIdx, COMPONENT_TYPES.TEXT)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                      >
                                        <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                                        Text
                                      </button>
                                      <button
                                        onClick={() => addComponent(containerIdx, COMPONENT_TYPES.MEDIA_GALLERY)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                      >
                                        <PhotoIcon className="w-4 h-4" />
                                        Image
                                      </button>
                                      <button
                                        onClick={() => addComponent(containerIdx, COMPONENT_TYPES.DIVIDER)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                      >
                                        <MinusIcon className="w-4 h-4" />
                                        Divider
                                      </button>
                                      <button
                                        onClick={() => addComponent(containerIdx, COMPONENT_TYPES.ACTION_ROW)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                      >
                                        <CursorArrowRaysIcon className="w-4 h-4" />
                                        Buttons
                                      </button>
                                    </div>

                                    {/* Components List */}
                                    <Droppable droppableId={`components-${containerIdx}`} type={`components-${containerIdx}`}>
                                      {(provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                                          {container.components.map((component, componentIdx) => (
                                            <Draggable
                                              key={component.id}
                                              draggableId={`component-${component.id}`}
                                              index={componentIdx}
                                            >
                                              {(provided, snapshot) => (
                                                <div
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  className={`border rounded-lg overflow-hidden transition-all ${
                                                    selectedComponent?.containerIdx === containerIdx &&
                                                    selectedComponent?.componentIdx === componentIdx
                                                      ? 'border-indigo-400 shadow-md'
                                                      : 'border-gray-200'
                                                  } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                                                >
                                                  {/* Component Header */}
                                                  <div
                                                    className="px-3 py-2 bg-gray-50 flex items-center gap-2 cursor-pointer"
                                                    onClick={() =>
                                                      setSelectedComponent(
                                                        selectedComponent?.containerIdx === containerIdx &&
                                                        selectedComponent?.componentIdx === componentIdx
                                                          ? null
                                                          : { containerIdx, componentIdx }
                                                      )
                                                    }
                                                  >
                                                    <div {...provided.dragHandleProps} className="cursor-grab">
                                                      <Bars3Icon className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                    {getComponentIcon(component.type)}
                                                    <span className="text-sm font-medium text-gray-700">
                                                      {getComponentLabel(component.type)}
                                                    </span>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteComponent(containerIdx, componentIdx);
                                                      }}
                                                      className="ml-auto p-1 hover:bg-red-100 text-red-500 rounded"
                                                    >
                                                      <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>

                                                  {/* Component Editor */}
                                                  {selectedComponent?.containerIdx === containerIdx &&
                                                    selectedComponent?.componentIdx === componentIdx && (
                                                      <div className="p-3 bg-white">
                                                        {component.type === COMPONENT_TYPES.TEXT && (
                                                          <div>
                                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                              Content (Markdown supported)
                                                            </label>
                                                            <textarea
                                                              value={component.content || ''}
                                                              onChange={(e) =>
                                                                updateComponent(containerIdx, componentIdx, {
                                                                  content: e.target.value,
                                                                })
                                                              }
                                                              rows={4}
                                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                              placeholder="# Heading\n**Bold** *Italic* `code`"
                                                            />
                                                            <p className="text-xs text-gray-400 mt-1">
                                                              Supports: # Headers, **bold**, *italic*, `code`, -# (small text), {'>'} quotes
                                                            </p>
                                                          </div>
                                                        )}

                                                        {component.type === COMPONENT_TYPES.MEDIA_GALLERY && (
                                                          <div>
                                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                              Image URL
                                                            </label>
                                                            <input
                                                              type="text"
                                                              value={component.items?.[0]?.media?.url || ''}
                                                              onChange={(e) =>
                                                                updateComponent(containerIdx, componentIdx, {
                                                                  items: [
                                                                    {
                                                                      media: { url: e.target.value },
                                                                      description: component.items?.[0]?.description || '',
                                                                    },
                                                                  ],
                                                                })
                                                              }
                                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                              placeholder="https://example.com/image.png"
                                                            />
                                                          </div>
                                                        )}

                                                        {component.type === COMPONENT_TYPES.ACTION_ROW && (
                                                          <div className="space-y-3">
                                                            {component.components?.map((btn, btnIdx) => (
                                                              <div
                                                                key={btn.id || btnIdx}
                                                                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                                                              >
                                                                <div className="flex items-center gap-2 mb-3">
                                                                  <span className="text-sm font-medium text-gray-700">
                                                                    Button {btnIdx + 1}
                                                                  </span>
                                                                  <button
                                                                    onClick={() => deleteButton(containerIdx, componentIdx, btnIdx)}
                                                                    className="ml-auto p-1 hover:bg-red-100 text-red-500 rounded"
                                                                  >
                                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                                  </button>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                  <div>
                                                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                                                      Label
                                                                    </label>
                                                                    <input
                                                                      type="text"
                                                                      value={btn.label}
                                                                      onChange={(e) =>
                                                                        updateButton(containerIdx, componentIdx, btnIdx, {
                                                                          label: e.target.value,
                                                                        })
                                                                      }
                                                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                                    />
                                                                  </div>
                                                                  <div>
                                                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                                                      Style
                                                                    </label>
                                                                    <select
                                                                      value={btn.style}
                                                                      onChange={(e) =>
                                                                        updateButton(containerIdx, componentIdx, btnIdx, {
                                                                          style: parseInt(e.target.value),
                                                                        })
                                                                      }
                                                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                                    >
                                                                      {BUTTON_STYLES.map((style) => (
                                                                        <option key={style.value} value={style.value}>
                                                                          {style.label}
                                                                        </option>
                                                                      ))}
                                                                    </select>
                                                                  </div>
                                                                  <div className="col-span-2">
                                                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                                                      {btn.style === 5 ? 'URL' : 'Custom ID'}
                                                                    </label>
                                                                    <input
                                                                      type="text"
                                                                      value={btn.style === 5 ? btn.url || '' : btn.custom_id || ''}
                                                                      onChange={(e) =>
                                                                        updateButton(containerIdx, componentIdx, btnIdx, {
                                                                          ...(btn.style === 5
                                                                            ? { url: e.target.value }
                                                                            : { custom_id: e.target.value }),
                                                                        })
                                                                      }
                                                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                                      placeholder={btn.style === 5 ? 'https://...' : 'button_action'}
                                                                    />
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            ))}
                                                            <button
                                                              onClick={() => addButton(containerIdx, componentIdx)}
                                                              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                                                            >
                                                              <PlusIcon className="w-4 h-4 inline mr-1" />
                                                              Add Button
                                                            </button>
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                </div>
                                              )}
                                            </Draggable>
                                          ))}
                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>

                                    {container.components.length === 0 && (
                                      <div className="text-center py-8 text-gray-400">
                                        <p className="text-sm">No components yet</p>
                                        <p className="text-xs mt-1">Use the buttons above to add content</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          {showPreview && (
            <div className="w-[450px] flex flex-col bg-[#313338] shrink-0">
              <div className="px-4 py-3 border-b border-[#3f4147] flex items-center">
                <span className="text-sm font-medium text-white">Discord Preview</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {renderDiscordPreview()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
