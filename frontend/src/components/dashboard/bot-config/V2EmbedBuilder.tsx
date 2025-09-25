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
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
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
    return (
      <div className="max-w-2xl mx-auto">
        {containers.map((container, idx) => (
          <div key={container.id} className="mb-4 bg-[#2f3136] text-white rounded-lg p-4">
            {container.components.map((component: any) => {
              switch (component.type) {
                case V2_COMPONENT_TYPES.TEXT:
                  const fontSize = component.style === 3 ? 'text-2xl' : component.style === 2 ? 'text-xl' : component.style === 1 ? 'text-sm' : 'text-base';
                  const fontWeight = component.style === 4 || component.style === 20 ? 'font-bold' : 'font-normal';
                  const fontStyle = component.style === 16 || component.style === 20 ? 'italic' : '';
                  return (
                    <p
                      key={component.id}
                      className={`mb-2 ${fontSize} ${fontWeight} ${fontStyle}`}
                      dangerouslySetInnerHTML={{ __html: component.content?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || '' }}
                    />
                  );
                case V2_COMPONENT_TYPES.MEDIA_GALLERY:
                  return (
                    <div key={component.id} className="mb-4">
                      {component.items?.map((item: any, i: number) => (
                        <img
                          key={i}
                          src={item.media?.url || item.url || 'https://via.placeholder.com/600x200'}
                          alt={item.description}
                          className="w-full rounded-lg mb-2"
                        />
                      ))}
                    </div>
                  );
                case V2_COMPONENT_TYPES.DIVIDER:
                  return <hr key={component.id} className="my-4 border-[#40444b]" />;
                case V2_COMPONENT_TYPES.ACTION_ROW:
                  return (
                    <div key={component.id} className="flex gap-2 mt-4">
                      {component.components?.map((button: any) => {
                        const btnStyle = BUTTON_STYLES.find(s => s.value === button.style);
                        return (
                          <button
                            key={button.id}
                            className={`px-4 py-2 rounded ${btnStyle?.color || 'bg-blue-500'} text-white font-medium`}
                          >
                            {button.emoji?.name && <span className="mr-1">{button.emoji.name}</span>}
                            {button.label}
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
        ))}
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
            <div className="h-full overflow-y-auto p-6 bg-gray-100">
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