import React, { useState } from 'react';
import { ChartBarIcon, PlusIcon, TrashIcon, PlayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface StatusItem {
  text: string;
  type: 'playing' | 'streaming' | 'listening' | 'watching' | 'competing';
  url?: string;
  status?: 'online' | 'idle' | 'dnd' | 'invisible';
}

interface StatusRotationConfig {
  enabled: boolean;
  interval: number;
  statuses: StatusItem[];
}

interface Props {
  config: {
    statusRotation?: StatusRotationConfig;
  };
  updateConfig: (updates: any) => void;
}

const DEFAULT_STATUSES: StatusItem[] = [
  { text: '{guilds} servers | {users} users', type: 'watching', status: 'online' },
  { text: '/help for commands', type: 'playing', status: 'online' },
  { text: 'Version 2.0', type: 'playing', status: 'online' },
  { text: '{members} members', type: 'watching', status: 'online' },
  { text: 'with {channels} channels', type: 'playing', status: 'online' },
];

const AVAILABLE_VARIABLES = [
  { name: '{guilds}', description: 'Number of servers' },
  { name: '{users}', description: 'Number of cached users' },
  { name: '{members}', description: 'Total members across all servers' },
  { name: '{channels}', description: 'Total channels' },
  { name: '{voice}', description: 'Active voice connections' },
  { name: '{uptime}', description: 'Bot uptime (e.g., 2d 5h)' },
  { name: '{ping}', description: 'WebSocket ping' },
  { name: '{version}', description: 'Bot version' },
];

export default function StatusRotationConfig({ config, updateConfig }: Props) {
  const statusConfig: StatusRotationConfig = {
    enabled: config.statusRotation?.enabled || false,
    interval: config.statusRotation?.interval || 60,
    statuses: config.statusRotation?.statuses || DEFAULT_STATUSES
  };

  const [newStatus, setNewStatus] = useState<StatusItem>({
    text: '',
    type: 'playing',
    status: 'online'
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const updateStatusRotation = (updates: Partial<StatusRotationConfig>) => {
    updateConfig({
      statusRotation: {
        ...statusConfig,
        ...updates
      }
    });
  };

  const addStatus = () => {
    if (!newStatus.text.trim()) {
      toast.error('Status text is required');
      return;
    }

    const updatedStatuses = [...statusConfig.statuses, newStatus];
    updateStatusRotation({ statuses: updatedStatuses });
    
    setNewStatus({ text: '', type: 'playing', status: 'online' });
    setShowAddForm(false);
    toast.success('Status added successfully');
  };

  const removeStatus = (index: number) => {
    const updatedStatuses = statusConfig.statuses.filter((_, i) => i !== index);
    updateStatusRotation({ statuses: updatedStatuses });
    toast.success('Status removed');
  };

  const moveStatus = (index: number, direction: 'up' | 'down') => {
    const statuses = [...statusConfig.statuses];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= statuses.length) return;
    
    [statuses[index], statuses[newIndex]] = [statuses[newIndex], statuses[index]];
    updateStatusRotation({ statuses });
  };

  const resetToDefaults = () => {
    if (!confirm('Reset all statuses to defaults?')) return;
    updateStatusRotation({ statuses: DEFAULT_STATUSES });
    toast.success('Statuses reset to defaults');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'playing': return '🎮';
      case 'streaming': return '📺';
      case 'listening': return '🎵';
      case 'watching': return '👀';
      case 'competing': return '🏆';
      default: return '🎮';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'text-green-600';
      case 'idle': return 'text-yellow-600';
      case 'dnd': return 'text-red-600';
      case 'invisible': return 'text-gray-600';
      default: return 'text-green-600';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Status Rotation</h2>
            <p className="text-gray-600">Configure rotating bot status messages</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={statusConfig.enabled}
              onChange={(e) => updateStatusRotation({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-900">
              {statusConfig.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
      </div>

      {statusConfig.enabled && (
        <div className="space-y-6">
          {/* Rotation Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rotation Interval (seconds)
            </label>
            <input
              type="number"
              min="10"
              max="3600"
              value={statusConfig.interval}
              onChange={(e) => updateStatusRotation({ interval: parseInt(e.target.value) || 60 })}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              How often to change the status (10-3600 seconds)
            </p>
          </div>

          {/* Status List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Status Messages</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={resetToDefaults}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Reset to defaults
                </button>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Status
                </button>
              </div>
            </div>

            {/* Status Items */}
            <div className="space-y-3">
              {statusConfig.statuses.map((status, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">{getActivityIcon(status.type)}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700 capitalize">{status.type}</span>
                          {status.status && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className={`text-sm font-medium ${getStatusColor(status.status)}`}>
                                {status.status}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="font-mono text-sm text-gray-900 mb-1">{status.text}</p>
                      {status.url && (
                        <p className="text-xs text-gray-500">Stream URL: {status.url}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 ml-4">
                      <button
                        onClick={() => moveStatus(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveStatus(index, 'down')}
                        disabled={index === statusConfig.statuses.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeStatus(index)}
                        className="p-1 text-red-400 hover:text-red-600"
                        title="Remove"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {statusConfig.statuses.length === 0 && (
                <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Status Messages</h3>
                  <p className="text-gray-600 mb-4">Add status messages for your bot to display</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add First Status
                  </button>
                </div>
              )}
            </div>

            {/* Add Status Form */}
            {showAddForm && (
              <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Add New Status</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status Text
                    </label>
                    <input
                      type="text"
                      value={newStatus.text}
                      onChange={(e) => setNewStatus({ ...newStatus, text: e.target.value })}
                      placeholder="Playing with {guilds} servers"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Activity Type
                      </label>
                      <select
                        value={newStatus.type}
                        onChange={(e) => setNewStatus({ ...newStatus, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="playing">🎮 Playing</option>
                        <option value="streaming">📺 Streaming</option>
                        <option value="listening">🎵 Listening to</option>
                        <option value="watching">👀 Watching</option>
                        <option value="competing">🏆 Competing in</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={newStatus.status || 'online'}
                        onChange={(e) => setNewStatus({ ...newStatus, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="online">🟢 Online</option>
                        <option value="idle">🟡 Idle</option>
                        <option value="dnd">🔴 Do Not Disturb</option>
                        <option value="invisible">⚫ Invisible</option>
                      </select>
                    </div>
                  </div>

                  {newStatus.type === 'streaming' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stream URL
                      </label>
                      <input
                        type="url"
                        value={newStatus.url || ''}
                        onChange={(e) => setNewStatus({ ...newStatus, url: e.target.value })}
                        placeholder="https://twitch.tv/username"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewStatus({ text: '', type: 'playing', status: 'online' });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addStatus}
                      className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Add Status
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Available Variables */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Available Variables</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {AVAILABLE_VARIABLES.map(variable => (
                  <div key={variable.name} className="text-blue-800">
                    <code className="font-mono">{variable.name}</code>
                    <div className="text-xs text-blue-600">{variable.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!statusConfig.enabled && (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Status Rotation Disabled</h3>
          <p className="text-gray-600 mb-4">Enable status rotation to show dynamic status messages.</p>
          <button
            onClick={() => updateStatusRotation({ enabled: true })}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Enable Status Rotation
          </button>
        </div>
      )}
    </div>
  );
}