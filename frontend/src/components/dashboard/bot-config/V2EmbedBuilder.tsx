import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  TrashIcon,
  PlusIcon,
  PhotoIcon,
  Bars3Icon,
  Square3Stack3DIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  PaintBrushIcon,
  Bars3BottomLeftIcon,
  Bars2Icon
} from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';

interface V2EmbedBuilderProps {
  commandName: string;
  embedData: any[];
  onSave: (data: any[]) => void;
  onClose: () => void;
}

const V2_COMPONENT_TYPES = {
  CONTAINER: 17,
  MEDIA_GALLERY: 12,
  TEXT: 10,
  DIVIDER: 14,
  ACTION_ROW: 1,
  BUTTON: 2
};

const TEXT_STYLES = [
  { value: 0, label: 'Default' },
  { value: 1, label: 'Small' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Large' },
  { value: 4, label: 'Bold' },
  { value: 16, label: 'Italic' },
  { value: 20, label: 'Bold + Italic' }
];

const BUTTON_STYLES = [
  { value: 1, label: 'Primary', color: 'bg-blue-500' },
  { value: 2, label: 'Secondary', color: 'bg-gray-500' },
  { value: 3, label: 'Success', color: 'bg-green-500' },
  { value: 4, label: 'Danger', color: 'bg-red-500' },
  { value: 5, label: 'Link', color: 'bg-gray-400' }
];

export default function V2EmbedBuilder({ commandName, embedData, onSave, onClose }: V2EmbedBuilderProps) {
  const [containers, setContainers] = useState<any[]>(embedData || []);
  const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // Templates
  const templates = {
    rules: {
      name: 'Server Rules',
      containers: [
        {
          id: 1,
          type: V2_COMPONENT_TYPES.CONTAINER,
          components: [
            { id: 100, type: V2_COMPONENT_TYPES.MEDIA_GALLERY, items: [{ media: { url: 'https://example.com/banner.png' }, description: 'Rules Banner' }] },
            { id: 101, type: V2_COMPONENT_TYPES.TEXT, content: '# 📜 Server Rules', style: 3 },
            { id: 102, type: V2_COMPONENT_TYPES.DIVIDER },
            { id: 103, type: V2_COMPONENT_TYPES.TEXT, content: '**1. Be respectful** - Treat everyone with respect', style: 0 },
            { id: 104, type: V2_COMPONENT_TYPES.TEXT, content: '**2. No spam** - Avoid repetitive messages', style: 0 },
            { id: 105, type: V2_COMPONENT_TYPES.TEXT, content: '**3. Stay on topic** - Keep discussions relevant', style: 0 }
          ]
        }
      ]
    },
    welcome: {
      name: 'Welcome Message',
      containers: [
        {
          id: 1,
          type: V2_COMPONENT_TYPES.CONTAINER,
          components: [
            { id: 200, type: V2_COMPONENT_TYPES.MEDIA_GALLERY, items: [{ media: { url: 'https://example.com/welcome.png' }, description: 'Welcome' }] },
            { id: 201, type: V2_COMPONENT_TYPES.TEXT, content: '# 🎉 Welcome to our Server!', style: 3 },
            { id: 202, type: V2_COMPONENT_TYPES.TEXT, content: 'We\'re glad to have you here!', style: 1 },
            {
              id: 203,
              type: V2_COMPONENT_TYPES.ACTION_ROW,
              components: [
                { id: 204, type: V2_COMPONENT_TYPES.BUTTON, style: 1, label: 'Rules', emoji: { name: '📜' }, custom_id: 'rules_button' },
                { id: 205, type: V2_COMPONENT_TYPES.BUTTON, style: 5, label: 'Website', url: 'https://example.com' }
              ]
            }
          ]
        }
      ]
    }
  };

  const addContainer = () => {
    const newContainer = {
      id: Date.now(),
      type: V2_COMPONENT_TYPES.CONTAINER,
      components: []
    };
    setContainers([...containers, newContainer]);
    setSelectedContainer(containers.length);
  };

  const deleteContainer = (index: number) => {
    const newContainers = containers.filter((_, i) => i !== index);
    setContainers(newContainers);
    if (selectedContainer === index) {
      setSelectedContainer(null);
    }
  };

  const addComponent = (containerIndex: number, type: number) => {
    const newComponent: any = {
      id: Date.now(),
      type
    };

    switch (type) {
      case V2_COMPONENT_TYPES.TEXT:
        newComponent.content = 'New text content';
        newComponent.style = 0;
        break;
      case V2_COMPONENT_TYPES.MEDIA_GALLERY:
        newComponent.items = [{ media: { url: '' }, description: '' }];
        break;
      case V2_COMPONENT_TYPES.ACTION_ROW:
        newComponent.components = [];
        break;
      case V2_COMPONENT_TYPES.BUTTON:
        newComponent.style = 1;
        newComponent.label = 'Button';
        break;
    }

    const newContainers = [...containers];
    newContainers[containerIndex].components.push(newComponent);
    setContainers(newContainers);
  };

  const updateComponent = (containerIndex: number, componentIndex: number, updates: any) => {
    const newContainers = [...containers];
    newContainers[containerIndex].components[componentIndex] = {
      ...newContainers[containerIndex].components[componentIndex],
      ...updates
    };
    setContainers(newContainers);
  };

  const deleteComponent = (containerIndex: number, componentIndex: number) => {
    const newContainers = [...containers];
    newContainers[containerIndex].components.splice(componentIndex, 1);
    setContainers(newContainers);
  };

  const addButtonToActionRow = (containerIndex: number, actionRowIndex: number) => {
    const newButton = {
      id: Date.now(),
      type: V2_COMPONENT_TYPES.BUTTON,
      style: 1,
      label: 'New Button'
    };

    const newContainers = [...containers];
    if (!newContainers[containerIndex].components[actionRowIndex].components) {
      newContainers[containerIndex].components[actionRowIndex].components = [];
    }
    newContainers[containerIndex].components[actionRowIndex].components.push(newButton);
    setContainers(newContainers);
  };

  const handleDragEnd = (result: any, containerIndex: number) => {
    if (!result.destination) return;

    const newContainers = [...containers];
    const items = Array.from(newContainers[containerIndex].components);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    newContainers[containerIndex].components = items;
    setContainers(newContainers);
  };

  const applyTemplate = (templateKey: string) => {
    const template = templates[templateKey as keyof typeof templates];
    if (template) {
      setContainers(template.containers);
      setShowTemplateDialog(false);
      toast.success(`Applied ${template.name} template`);
    }
  };

  const handleSave = () => {
    onSave(containers);
    toast.success('Embed configuration saved!');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(containers, null, 2));
    toast.success('Copied to clipboard!');
  };

  const renderComponent = (component: any, containerIndex: number, componentIndex: number) => {
    switch (component.type) {
      case V2_COMPONENT_TYPES.TEXT:
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Bars3BottomLeftIcon className="w-4 h-4" />
                <span>Text</span>
              </div>
              <button
                onClick={() => deleteComponent(containerIndex, componentIndex)}
                className="text-red-500 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
            <textarea
              className="w-full p-2 border border-gray-300 rounded"
              rows={3}
              value={component.content || ''}
              onChange={(e) => updateComponent(containerIndex, componentIndex, { content: e.target.value })}
              placeholder="Text content (supports markdown)"
            />
            <select
              className="mt-2 w-full p-2 border border-gray-300 rounded"
              value={component.style || 0}
              onChange={(e) => updateComponent(containerIndex, componentIndex, { style: parseInt(e.target.value) })}
            >
              {TEXT_STYLES.map(style => (
                <option key={style.value} value={style.value}>{style.label}</option>
              ))}
            </select>
          </div>
        );

      case V2_COMPONENT_TYPES.MEDIA_GALLERY:
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <PhotoIcon className="w-4 h-4" />
                <span>Media Gallery</span>
              </div>
              <button
                onClick={() => deleteComponent(containerIndex, componentIndex)}
                className="text-red-500 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
            {component.items?.map((item: any, idx: number) => (
              <div key={idx} className="mb-2">
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded mb-1"
                  value={item.media?.url || item.url || ''}
                  onChange={(e) => {
                    const newItems = [...(component.items || [])];
                    if (item.media) {
                      newItems[idx] = { ...newItems[idx], media: { ...newItems[idx].media, url: e.target.value } };
                    } else {
                      newItems[idx] = { ...newItems[idx], url: e.target.value };
                    }
                    updateComponent(containerIndex, componentIndex, { items: newItems });
                  }}
                  placeholder="Image URL"
                />
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={item.description || ''}
                  onChange={(e) => {
                    const newItems = [...(component.items || [])];
                    newItems[idx] = { ...newItems[idx], description: e.target.value };
                    updateComponent(containerIndex, componentIndex, { items: newItems });
                  }}
                  placeholder="Description (Alt Text)"
                />
              </div>
            ))}
            <button
              onClick={() => {
                const newItems = [...(component.items || []), { media: { url: '' }, description: '' }];
                updateComponent(containerIndex, componentIndex, { items: newItems });
              }}
              className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <PlusIcon className="w-4 h-4" />
              Add Image
            </button>
          </div>
        );

      case V2_COMPONENT_TYPES.DIVIDER:
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Bars2Icon className="w-4 h-4" />
                <span>Divider</span>
              </div>
              <button
                onClick={() => deleteComponent(containerIndex, componentIndex)}
                className="text-red-500 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="border-t border-gray-300 my-2"></div>
          </div>
        );

      case V2_COMPONENT_TYPES.ACTION_ROW:
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CursorArrowRaysIcon className="w-4 h-4" />
                <span>Action Row</span>
              </div>
              <button
                onClick={() => deleteComponent(containerIndex, componentIndex)}
                className="text-red-500 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
            {component.components?.map((button: any, btnIdx: number) => (
              <div key={btnIdx} className="mb-2 p-2 border border-dashed border-gray-300 rounded">
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded mb-2"
                  value={button.label || ''}
                  onChange={(e) => {
                    const newButtons = [...(component.components || [])];
                    newButtons[btnIdx] = { ...newButtons[btnIdx], label: e.target.value };
                    updateComponent(containerIndex, componentIndex, { components: newButtons });
                  }}
                  placeholder="Button Label"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="p-2 border border-gray-300 rounded"
                    value={button.style || 1}
                    onChange={(e) => {
                      const newButtons = [...(component.components || [])];
                      newButtons[btnIdx] = { ...newButtons[btnIdx], style: parseInt(e.target.value) };
                      updateComponent(containerIndex, componentIndex, { components: newButtons });
                    }}
                  >
                    {BUTTON_STYLES.map(style => (
                      <option key={style.value} value={style.value}>{style.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="p-2 border border-gray-300 rounded"
                    value={button.emoji?.name || ''}
                    onChange={(e) => {
                      const newButtons = [...(component.components || [])];
                      newButtons[btnIdx] = { ...newButtons[btnIdx], emoji: { name: e.target.value } };
                      updateComponent(containerIndex, componentIndex, { components: newButtons });
                    }}
                    placeholder="Emoji"
                  />
                </div>
                {button.style === 5 ? (
                  <input
                    type="text"
                    className="w-full mt-2 p-2 border border-gray-300 rounded"
                    value={button.url || ''}
                    onChange={(e) => {
                      const newButtons = [...(component.components || [])];
                      newButtons[btnIdx] = { ...newButtons[btnIdx], url: e.target.value };
                      updateComponent(containerIndex, componentIndex, { components: newButtons });
                    }}
                    placeholder="URL"
                  />
                ) : (
                  <input
                    type="text"
                    className="w-full mt-2 p-2 border border-gray-300 rounded"
                    value={button.custom_id || ''}
                    onChange={(e) => {
                      const newButtons = [...(component.components || [])];
                      newButtons[btnIdx] = { ...newButtons[btnIdx], custom_id: e.target.value };
                      updateComponent(containerIndex, componentIndex, { components: newButtons });
                    }}
                    placeholder="Custom ID"
                  />
                )}
                <button
                  onClick={() => {
                    const newButtons = component.components.filter((_: any, i: number) => i !== btnIdx);
                    updateComponent(containerIndex, componentIndex, { components: newButtons });
                  }}
                  className="mt-2 text-red-500 hover:text-red-700 text-sm"
                >
                  Remove Button
                </button>
              </div>
            ))}
            <button
              onClick={() => addButtonToActionRow(containerIndex, componentIndex)}
              disabled={(component.components?.length || 0) >= 5}
              className="w-full mt-2 p-2 border border-dashed border-gray-300 rounded text-gray-600 hover:border-gray-400 hover:text-gray-800 disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4 inline mr-1" />
              Add Button (Max 5)
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderPreview = () => {
    // Discord-style preview with V2 embed appearance
    return (
      <div className="max-w-[600px] mx-auto">
        <div className="bg-[#313338] rounded-lg overflow-hidden shadow-2xl">
          {/* Discord Poll-style header for V2 embeds */}
          <div className="bg-[#2b2d31] px-4 py-3 border-b border-[#1e1f22]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#5865f2] rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">Embed Preview</div>
                <div className="text-[#949ba4] text-sm">Discord V2 Embed</div>
              </div>
            </div>
          </div>

          {/* Containers */}
          <div className="bg-[#2b2d31]">
            {containers.map((container, containerIdx) => (
              <div key={container.id} className={`${containerIdx > 0 ? 'border-t border-[#1e1f22]' : ''}`}>
                <div className="p-4">
                  {container.components.map((component: any, componentIdx: number) => {
                    switch (component.type) {
                      case V2_COMPONENT_TYPES.TEXT:
                        let textClass = 'text-[#dbdee1]';
                        let textSize = 'text-base';
                        let textWeight = '';
                        
                        // Handle different text styles
                        if (component.style === 1) textSize = 'text-sm';
                        else if (component.style === 2) textSize = 'text-lg';
                        else if (component.style === 3) textSize = 'text-2xl font-bold';
                        else if (component.style === 4) textWeight = 'font-bold';
                        else if (component.style === 16) textClass += ' italic';
                        else if (component.style === 20) textClass += ' font-bold italic';

                        // Parse markdown-style formatting
                        let content = component.content || '';
                        let isSubtext = false;
                        let hasInlineCode = false;
                        
                        // Handle headers
                        if (content.startsWith('# ')) {
                          content = content.substring(2);
                          textSize = 'text-2xl font-bold';
                        } else if (content.startsWith('## ')) {
                          content = content.substring(3);
                          textSize = 'text-xl font-semibold';
                        } else if (content.startsWith('### ')) {
                          content = content.substring(4);
                          textSize = 'text-lg font-semibold';
                        }

                        // Handle quotes
                        const isQuote = content.startsWith('>>>') || content.startsWith('>');
                        if (content.startsWith('>>>')) {
                          content = content.substring(3).trim();
                        } else if (content.startsWith('> ')) {
                          content = content.substring(2);
                        }

                        // Split by lines to handle -# subtext
                        let lines = content.split('\n');
                        let processedLines: string[] = [];
                        
                        for (let i = 0; i < lines.length; i++) {
                          let line = lines[i];
                          
                          // Check if next line is a subtext
                          if (i + 1 < lines.length && lines[i + 1].startsWith('-# ')) {
                            // Process main line with backticks
                            if (line.startsWith('`') && line.endsWith('`') && line.length > 2) {
                              line = `<span class="bg-[#1e1f22] px-1.5 py-0.5 rounded text-[#e3e5e8] font-mono text-sm">${line.slice(1, -1)}</span>`;
                              hasInlineCode = true;
                            }
                            processedLines.push(line);
                            
                            // Process subtext
                            let subtext = lines[i + 1].substring(3);
                            subtext = subtext.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                            processedLines.push(`<div class="text-xs text-[#949ba4] mt-0.5">${subtext}</div>`);
                            i++; // Skip next line since we processed it
                          } else {
                            // Regular line processing
                            // Handle inline code
                            line = line.replace(/`([^`]+)`/g, '<span class="bg-[#1e1f22] px-1.5 py-0.5 rounded text-[#e3e5e8] font-mono text-sm">$1</span>');
                            // Handle bold
                            line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
                            // Handle italic
                            line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
                            
                            if (line.startsWith('-# ')) {
                              line = `<div class="text-xs text-[#949ba4] mt-0.5">${line.substring(3)}</div>`;
                            }
                            
                            processedLines.push(line);
                          }
                        }
                        
                        content = processedLines.join('<br/>');

                        return (
                          <div
                            key={component.id}
                            className={`${componentIdx > 0 && !isQuote ? 'mt-2' : ''} ${isQuote ? 'pl-3 border-l-4 border-[#4e5058] mt-2' : ''}`}
                          >
                            <div
                              className={`${textClass} ${textSize} ${textWeight} whitespace-pre-wrap break-words`}
                              dangerouslySetInnerHTML={{ __html: content }}
                            />
                          </div>
                        );

                      case V2_COMPONENT_TYPES.MEDIA_GALLERY:
                        return (
                          <div key={component.id} className={`${componentIdx > 0 ? 'mt-3' : ''} -mx-4`}>
                            {component.items?.map((item: any, i: number) => (
                              <div key={i} className="relative">
                                <img
                                  src={item.media?.url || item.url || 'https://via.placeholder.com/600x300/5865f2/ffffff?text=Image+Placeholder'}
                                  alt={item.description || ''}
                                  className="w-full"
                                  onError={(e: any) => {
                                    e.target.src = 'https://via.placeholder.com/600x300/5865f2/ffffff?text=Image+Failed+to+Load';
                                  }}
                                />
                                {item.description && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-sm p-2">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );

                      case V2_COMPONENT_TYPES.DIVIDER:
                        return (
                          <div
                            key={component.id}
                            className={`border-t border-[#3f4147] ${
                              component.spacing === 2 ? 'my-4' : component.spacing === 1 ? 'my-2' : 'my-3'
                            }`}
                          />
                        );

                      case V2_COMPONENT_TYPES.ACTION_ROW:
                        return (
                          <div key={component.id} className="flex flex-wrap gap-2 mt-3">
                            {component.components?.map((button: any) => {
                              let btnClass = 'px-4 py-2 rounded font-medium text-sm transition-all ';
                              let isDisabled = button.disabled;
                              
                              switch (button.style) {
                                case 1: // Primary
                                  btnClass += isDisabled ? 'bg-[#404249] text-[#96989d]' : 'bg-[#5865f2] hover:bg-[#4752c4] text-white';
                                  break;
                                case 2: // Secondary
                                  btnClass += isDisabled ? 'bg-[#2b2d31] text-[#96989d]' : 'bg-[#4e5058] hover:bg-[#6d6f78] text-white';
                                  break;
                                case 3: // Success
                                  btnClass += isDisabled ? 'bg-[#1e3a29] text-[#96989d]' : 'bg-[#248046] hover:bg-[#1a6334] text-white';
                                  break;
                                case 4: // Danger
                                  btnClass += isDisabled ? 'bg-[#4d2d2f] text-[#96989d]' : 'bg-[#da373c] hover:bg-[#a12828] text-white';
                                  break;
                                case 5: // Link
                                  btnClass = 'px-4 py-2 rounded font-medium text-sm text-[#00a8fc] hover:underline';
                                  break;
                              }

                              if (isDisabled) {
                                btnClass += ' cursor-not-allowed opacity-60';
                              }

                              return (
                                <button
                                  key={button.id}
                                  className={btnClass}
                                  disabled={isDisabled}
                                >
                                  <span className="flex items-center gap-1.5">
                                    {button.emoji?.name && (
                                      <span className="text-base">{button.emoji.name}</span>
                                    )}
                                    {button.label}
                                    {button.style === 5 && (
                                      <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                      </svg>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );

                      default:
                        return null;
                    }
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer timestamp */}
          <div className="bg-[#2b2d31] px-4 pb-3 text-[#949ba4] text-xs">
            Today at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">V2 Embed Builder - {commandName}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-3 py-2 border rounded hover:bg-gray-50"
            >
              <EyeIcon className="w-5 h-5 inline mr-1" />
              {previewMode ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={() => setShowTemplateDialog(true)}
              className="px-3 py-2 border rounded hover:bg-gray-50"
            >
              <PaintBrushIcon className="w-5 h-5 inline mr-1" />
              Templates
            </button>
            <button
              onClick={copyToClipboard}
              className="px-3 py-2 border rounded hover:bg-gray-50"
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {previewMode ? (
            <div className="h-full overflow-y-auto p-6 bg-[#36393f]">
              {renderPreview()}
            </div>
          ) : (
            <div className="flex h-full">
              {/* Containers List */}
              <div className="w-1/4 border-r p-4 overflow-y-auto">
                <h3 className="font-semibold mb-4">Containers</h3>
                {containers.map((container, idx) => (
                  <div
                    key={container.id}
                    onClick={() => setSelectedContainer(idx)}
                    className={`mb-2 p-3 border rounded cursor-pointer ${
                      selectedContainer === idx ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Container {idx + 1}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteContainer(idx);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-sm text-gray-600">
                      {container.components.length} components
                    </span>
                  </div>
                ))}
                <button
                  onClick={addContainer}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-gray-400"
                >
                  <PlusIcon className="w-5 h-5 inline mr-1" />
                  Add Container
                </button>
              </div>

              {/* Components Editor */}
              <div className="flex-1 p-4 overflow-y-auto">
                {selectedContainer !== null && containers[selectedContainer] ? (
                  <>
                    <h3 className="font-semibold mb-4">Container {selectedContainer + 1} Components</h3>
                    
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => addComponent(selectedContainer, V2_COMPONENT_TYPES.TEXT)}
                        className="px-3 py-2 border rounded hover:bg-gray-50"
                      >
                        <Bars3BottomLeftIcon className="w-4 h-4 inline mr-1" />
                        Text
                      </button>
                      <button
                        onClick={() => addComponent(selectedContainer, V2_COMPONENT_TYPES.MEDIA_GALLERY)}
                        className="px-3 py-2 border rounded hover:bg-gray-50"
                      >
                        <PhotoIcon className="w-4 h-4 inline mr-1" />
                        Media
                      </button>
                      <button
                        onClick={() => addComponent(selectedContainer, V2_COMPONENT_TYPES.DIVIDER)}
                        className="px-3 py-2 border rounded hover:bg-gray-50"
                      >
                        <Bars2Icon className="w-4 h-4 inline mr-1" />
                        Divider
                      </button>
                      <button
                        onClick={() => addComponent(selectedContainer, V2_COMPONENT_TYPES.ACTION_ROW)}
                        className="px-3 py-2 border rounded hover:bg-gray-50"
                      >
                        <CursorArrowRaysIcon className="w-4 h-4 inline mr-1" />
                        Buttons
                      </button>
                    </div>

                    <DragDropContext onDragEnd={(result) => handleDragEnd(result, selectedContainer)}>
                      <Droppable droppableId="components">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef}>
                            {containers[selectedContainer].components.map((component: any, idx: number) => (
                              <Draggable key={component.id} draggableId={String(component.id)} index={idx}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                  >
                                    <div className="flex items-start">
                                      <div {...provided.dragHandleProps} className="mr-2 mt-4 cursor-grab">
                                        <Bars3Icon className="w-5 h-5 text-gray-400" />
                                      </div>
                                      <div className="flex-1">
                                        {renderComponent(component, selectedContainer, idx)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Select a container or create a new one
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Dialog */}
      {showTemplateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Choose a Template</h3>
            <div className="space-y-2">
              {Object.entries(templates).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key)}
                  className="w-full p-4 border rounded-lg hover:bg-gray-50 text-left"
                >
                  <h4 className="font-semibold">{template.name}</h4>
                  <p className="text-sm text-gray-600">{template.containers.length} container(s)</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTemplateDialog(false)}
              className="mt-4 w-full px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}