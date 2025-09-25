import React, { useState } from 'react';
import { DocumentTextIcon, PlusIcon, TrashIcon, EyeIcon, PencilIcon, CheckIcon, XMarkIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const V2EmbedBuilder = dynamic(() => import('./dashboard/bot-config/V2EmbedBuilder'), { ssr: false });

interface V2Command {
  name: string;
  description: string;
  enabled: boolean;
  useEmbedV2: boolean;
  embedV2Data?: any[];
}

interface Props {
  config: {
    embedV2Commands?: Record<string, V2Command>;
  };
  updateConfig: (updates: any) => void;
}

const PRESET_COMMANDS = {
  rules: {
    name: 'rules',
    description: 'Display server rules with beautiful V2 embed',
    enabled: false,
    useEmbedV2: true,
    embedV2Data: [] // Would contain the actual embed data
  },
  pricing: {
    name: 'pricing',
    description: 'Show pricing plans with interactive buttons',
    enabled: false,
    useEmbedV2: true,
    embedV2Data: []
  },
  'server-info': {
    name: 'server-info',
    description: 'Display detailed server information',
    enabled: false,
    useEmbedV2: true,
    embedV2Data: []
  },
  'user-profile': {
    name: 'user-profile',
    description: 'Show beautiful user profile cards',
    enabled: false,
    useEmbedV2: true,
    embedV2Data: []
  },
  team: {
    name: 'team',
    description: 'Display your team members',
    enabled: false,
    useEmbedV2: true,
    embedV2Data: []
  },
  announcement: {
    name: 'announcement',
    description: 'Create announcements with V2 embeds',
    enabled: false,
    useEmbedV2: true,
    embedV2Data: []
  },
  'embed-builder': {
    name: 'embed-builder',
    description: 'Interactive V2 embed builder',
    enabled: false,
    useEmbedV2: true,
    embedV2Data: []
  }
};

export default function V2CommandsConfig({ config, updateConfig }: Props) {
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const [editingCommand, setEditingCommand] = useState<string | null>(null);
  const [commandEdit, setCommandEdit] = useState<Partial<V2Command>>({});
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderCommand, setBuilderCommand] = useState<string | null>(null);
  
  const commands = config.embedV2Commands || {};

  const updateCommands = (updates: Record<string, V2Command>) => {
    updateConfig({ embedV2Commands: updates });
  };

  const toggleCommand = (commandName: string) => {
    const command = commands[commandName] || PRESET_COMMANDS[commandName as keyof typeof PRESET_COMMANDS];
    if (!command) return;

    const updated = {
      ...commands,
      [commandName]: {
        ...command,
        enabled: !command.enabled
      }
    };
    
    updateCommands(updated);
    toast.success(`${commandName} ${!command.enabled ? 'enabled' : 'disabled'}`);
  };

  const enablePresetCommand = (commandName: string) => {
    const preset = PRESET_COMMANDS[commandName as keyof typeof PRESET_COMMANDS];
    if (!preset) return;

    const updated = {
      ...commands,
      [commandName]: {
        ...preset,
        enabled: true
      }
    };
    
    updateCommands(updated);
    toast.success(`${commandName} command added and enabled`);
  };

  const startEditing = (commandName: string) => {
    const command = commands[commandName];
    if (!command) return;
    
    setEditingCommand(commandName);
    setCommandEdit({
      description: command.description
    });
  };

  const saveEdit = () => {
    if (!editingCommand) return;

    const updated = {
      ...commands,
      [editingCommand]: {
        ...commands[editingCommand],
        ...commandEdit
      }
    };
    
    updateCommands(updated);
    setEditingCommand(null);
    setCommandEdit({});
    toast.success('Command updated');
  };

  const deleteCommand = (commandName: string) => {
    if (!confirm(`Delete ${commandName} command?`)) return;

    const updated = { ...commands };
    delete updated[commandName];
    
    updateCommands(updated);
    toast.success(`${commandName} command removed`);
  };

  const openEmbedBuilder = (commandName: string) => {
    setBuilderCommand(commandName);
    setBuilderOpen(true);
  };

  const saveEmbedData = (embedData: any[]) => {
    if (!builderCommand) return;

    const command = commands[builderCommand] || PRESET_COMMANDS[builderCommand as keyof typeof PRESET_COMMANDS];
    if (!command) return;

    const updated = {
      ...commands,
      [builderCommand]: {
        ...command,
        embedV2Data: embedData,
        enabled: true
      }
    };
    
    updateCommands(updated);
    toast.success(`${builderCommand} embed updated successfully`);
  };

  const allCommands = { ...PRESET_COMMANDS };
  Object.keys(commands).forEach(key => {
    allCommands[key] = commands[key];
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">V2 Embed Commands</h2>
        <p className="text-gray-600">
          Advanced embed commands using Discord's V2 embed format with containers, images, and interactive components.
        </p>
      </div>

      <div className="space-y-4">
        {/* Info Box */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-start">
            <DocumentTextIcon className="w-5 h-5 text-indigo-600 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-indigo-900 mb-1">V2 Embeds</h4>
              <p className="text-sm text-indigo-800">
                V2 embeds support multiple containers, image galleries, progress bars, buttons, and much more.
                Enable the commands you want to use and customize them as needed.
              </p>
            </div>
          </div>
        </div>

        {/* Commands Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(allCommands).map(([key, command]) => {
            const isEditing = editingCommand === key;
            const isEnabled = command.enabled;
            
            return (
              <div
                key={key}
                className={`border rounded-lg p-4 transition-all ${
                  isEnabled ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white'
                } ${selectedCommand === key ? 'ring-2 ring-indigo-500' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isEnabled ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      <DocumentTextIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">/{command.name}</h4>
                      {isEditing ? (
                        <input
                          type="text"
                          value={commandEdit.description}
                          onChange={(e) => setCommandEdit({ ...commandEdit, description: e.target.value })}
                          className="mt-1 text-sm text-gray-600 border-b border-gray-300 focus:border-indigo-500 focus:outline-none"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{command.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Save"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCommand(null);
                            setCommandEdit({});
                          }}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Cancel"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setSelectedCommand(key === selectedCommand ? null : key)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Preview"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {isEnabled && (
                          <>
                            <button
                              onClick={() => openEmbedBuilder(key)}
                              className="p-1 text-indigo-400 hover:text-indigo-600"
                              title="Customize Embed"
                            >
                              <Cog6ToothIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => startEditing(key)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Edit Description"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isEnabled && !Object.keys(PRESET_COMMANDS).includes(key) && (
                          <button
                            onClick={() => deleteCommand(key)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => isEnabled ? toggleCommand(key) : enablePresetCommand(key)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>

                  {/* Command Tags */}
                  <div className="flex items-center space-x-2">
                    {command.useEmbedV2 && (
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        V2 Embed
                      </span>
                    )}
                    {Object.keys(PRESET_COMMANDS).includes(key) && (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        Preset
                      </span>
                    )}
                  </div>
                </div>

                {/* Preview Panel */}
                {selectedCommand === key && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Command Features:</h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      {key === 'rules' && (
                        <>
                          <p>• Multiple containers with images</p>
                          <p>• Formatted rules with numbering</p>
                          <p>• Interactive buttons for links</p>
                          <p>• Custom dividers and spacing</p>
                        </>
                      )}
                      {key === 'pricing' && (
                        <>
                          <p>• Pricing tiers in separate containers</p>
                          <p>• Interactive purchase buttons</p>
                          <p>• Feature comparison lists</p>
                          <p>• Color-coded plans</p>
                        </>
                      )}
                      {key === 'server-info' && (
                        <>
                          <p>• Live server statistics</p>
                          <p>• Member and channel counts</p>
                          <p>• Boost information</p>
                          <p>• Server features display</p>
                        </>
                      )}
                      {key === 'user-profile' && (
                        <>
                          <p>• User avatar and badges</p>
                          <p>• Account age and join date</p>
                          <p>• Current activities</p>
                          <p>• Role display</p>
                        </>
                      )}
                      {key === 'team' && (
                        <>
                          <p>• Team member profiles</p>
                          <p>• Role descriptions</p>
                          <p>• Social media links</p>
                          <p>• Application button</p>
                        </>
                      )}
                      {key === 'announcement' && (
                        <>
                          <p>• Multiple announcement types</p>
                          <p>• Timestamp display</p>
                          <p>• Reaction buttons</p>
                          <p>• Channel targeting</p>
                        </>
                      )}
                      {key === 'embed-builder' && (
                        <>
                          <p>• Interactive builder interface</p>
                          <p>• Live preview</p>
                          <p>• Template gallery</p>
                          <p>• Export functionality</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom Command Builder */}
        <div className="mt-6 border-t pt-6">
          <button
            onClick={() => toast('Custom V2 command builder coming soon!', { icon: 'ℹ️' })}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400 transition-colors"
          >
            <PlusIcon className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium">Create Custom V2 Command</p>
            <p className="text-sm">Build your own V2 embed commands with the visual builder</p>
          </button>
        </div>
      </div>

      {/* V2 Embed Builder Dialog */}
      {builderOpen && builderCommand && (
        <V2EmbedBuilder
          commandName={builderCommand}
          embedData={(commands[builderCommand] || PRESET_COMMANDS[builderCommand as keyof typeof PRESET_COMMANDS])?.embedV2Data || []}
          onSave={saveEmbedData}
          onClose={() => {
            setBuilderOpen(false);
            setBuilderCommand(null);
          }}
        />
      )}
    </div>
  );
}