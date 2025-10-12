'use client';

import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  WrenchScrewdriverIcon,
  CodeBracketIcon,
  ShieldExclamationIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import {
  BotCollaborator,
  CollaboratorRole,
  CollaboratorStatus,
  CollaboratorPermissions,
  InviteCollaboratorForm
} from '@/types';
import toast from 'react-hot-toast';

interface CollaboratorManagementProps {
  botId: string;
  isOwner: boolean;
}

const roleConfig: Record<CollaboratorRole, {
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  icon: any;
  description: string
}> = {
  [CollaboratorRole.VIEWER]: {
    label: 'Viewer',
    color: 'text-gray-300',
    borderColor: 'border-gray-600',
    bgColor: 'bg-gray-700/50',
    icon: EyeIcon,
    description: 'View dashboard, logs, and analytics only'
  },
  [CollaboratorRole.MODERATOR]: {
    label: 'Moderator',
    color: 'text-blue-400',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-500/10',
    icon: ShieldCheckIcon,
    description: 'Manage moderation, tickets, and logs'
  },
  [CollaboratorRole.DEVELOPER]: {
    label: 'Developer',
    color: 'text-purple-400',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-500/10',
    icon: CodeBracketIcon,
    description: 'Manage commands, configuration, and bot control'
  },
  [CollaboratorRole.ADMIN]: {
    label: 'Administrator',
    color: 'text-red-400',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-500/10',
    icon: ShieldExclamationIcon,
    description: 'Full access except deleting the bot'
  },
};

const statusConfig: Record<CollaboratorStatus, { label: string; color: string; icon: any }> = {
  [CollaboratorStatus.PENDING]: {
    label: 'Pending',
    color: 'text-yellow-400',
    icon: ClockIcon
  },
  [CollaboratorStatus.ACTIVE]: {
    label: 'Active',
    color: 'text-green-400',
    icon: CheckCircleIcon
  },
  [CollaboratorStatus.SUSPENDED]: {
    label: 'Suspended',
    color: 'text-orange-400',
    icon: XCircleIcon
  },
  [CollaboratorStatus.REVOKED]: {
    label: 'Revoked',
    color: 'text-red-400',
    icon: XCircleIcon
  },
};

const permissionGroups = {
  'Dashboard & Monitoring': [
    { key: 'viewDashboard', label: 'View Dashboard', description: 'Access bot dashboard' },
    { key: 'viewLogs', label: 'View Logs', description: 'Read bot logs and console' },
    { key: 'viewAnalytics', label: 'View Analytics', description: 'Access analytics and metrics' },
    { key: 'viewMetrics', label: 'View Metrics', description: 'View performance metrics' },
  ],
  'Bot Control': [
    { key: 'startBot', label: 'Start Bot', description: 'Start the bot instance' },
    { key: 'stopBot', label: 'Stop Bot', description: 'Stop the bot instance' },
    { key: 'restartBot', label: 'Restart Bot', description: 'Restart the bot' },
  ],
  'Configuration': [
    { key: 'editWelcome', label: 'Edit Welcome', description: 'Configure welcome messages' },
    { key: 'editAutoRoles', label: 'Edit Auto Roles', description: 'Manage automatic role assignment' },
    { key: 'editModeration', label: 'Edit Moderation', description: 'Configure moderation settings' },
    { key: 'editLogging', label: 'Edit Logging', description: 'Configure logging channels' },
    { key: 'editCustomCommands', label: 'Edit Commands', description: 'Manage custom commands' },
    { key: 'editStatusRotation', label: 'Edit Status', description: 'Configure status rotation' },
    { key: 'editEmbedCommands', label: 'Edit Embeds', description: 'Manage embed commands' },
  ],
  'Ticket System': [
    { key: 'viewTickets', label: 'View Tickets', description: 'View support tickets' },
    { key: 'manageTickets', label: 'Manage Tickets', description: 'Respond to and manage tickets' },
    { key: 'closeTickets', label: 'Close Tickets', description: 'Close support tickets' },
    { key: 'deleteTickets', label: 'Delete Tickets', description: 'Delete ticket records' },
    { key: 'configureTickets', label: 'Configure Tickets', description: 'Configure ticket system settings' },
    { key: 'editTicketSystem', label: 'Edit Ticket System', description: 'Full ticket system configuration' },
  ],
  'Advanced': [
    { key: 'manageCollaborators', label: 'Manage Collaborators', description: 'Invite and manage other collaborators' },
    { key: 'deleteBot', label: 'Delete Bot', description: 'Permanently delete the bot (owner only)' },
  ],
};

export default function CollaboratorManagement({ botId, isOwner }: CollaboratorManagementProps) {
  const [collaborators, setCollaborators] = useState<BotCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [expandedCollaborators, setExpandedCollaborators] = useState<Set<string>>(new Set());
  const [showCustomPermissions, setShowCustomPermissions] = useState(false);

  const [inviteForm, setInviteForm] = useState<InviteCollaboratorForm>({
    userDiscordId: '',
    role: CollaboratorRole.VIEWER,
    permissions: {},
  });

  useEffect(() => {
    fetchCollaborators();
  }, [botId]);

  const fetchCollaborators = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bots/${botId}/collaborators`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCollaborators(data);
      }
    } catch (error) {
      console.error('Error loading collaborators:', error);
      toast.error('Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.userDiscordId.trim()) {
      toast.error('Please enter a Discord ID');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bots/${botId}/collaborators/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userDiscordId: inviteForm.userDiscordId,
          role: inviteForm.role,
          permissions: inviteForm.permissions,
        }),
      });

      if (response.ok) {
        setShowInviteModal(false);
        setShowCustomPermissions(false);
        setInviteForm({
          userDiscordId: '',
          role: CollaboratorRole.VIEWER,
          permissions: {},
        });
        fetchCollaborators();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/bots/${botId}/collaborators/${collaboratorId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Collaborator removed');
        fetchCollaborators();
      } else {
        toast.error('Failed to remove collaborator');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedCollaborators);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedCollaborators(newSet);
  };

  const togglePermission = (key: string) => {
    setInviteForm({
      ...inviteForm,
      permissions: {
        ...inviteForm.permissions,
        [key]: !inviteForm.permissions?.[key],
      },
    });
  };

  const selectAllInGroup = (groupPerms: any[]) => {
    const newPermissions = { ...inviteForm.permissions };
    groupPerms.forEach((perm) => {
      newPermissions[perm.key] = true;
    });
    setInviteForm({ ...inviteForm, permissions: newPermissions });
  };

  const deselectAllInGroup = (groupPerms: any[]) => {
    const newPermissions = { ...inviteForm.permissions };
    groupPerms.forEach((perm) => {
      newPermissions[perm.key] = false;
    });
    setInviteForm({ ...inviteForm, permissions: newPermissions });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-700/50 rounded-xl"></div>
            <div className="h-20 bg-gray-700/50 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Collaborators</h2>
          </div>
          <p className="text-gray-400 text-sm">Manage who has access to your bot</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="font-medium">Invite</span>
          </button>
        )}
      </div>

      {/* Collaborators List */}
      {collaborators.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
            <UserGroupIcon className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No collaborators yet</h3>
          <p className="text-gray-600 mb-6">Start by inviting someone to help manage your bot</p>
          {isOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
            >
              Invite your first collaborator
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {collaborators.map((collaborator) => {
            const roleInfo = roleConfig[collaborator.role];
            const statusInfo = statusConfig[collaborator.status];
            const StatusIcon = statusInfo.icon;
            const RoleIcon = roleInfo.icon;
            const isExpanded = expandedCollaborators.has(collaborator.id);

            return (
              <div
                key={collaborator.id}
                className={`bg-white border ${roleInfo.borderColor} rounded-xl p-5 hover:shadow-md transition-all duration-200`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Avatar */}
                    <div className="relative">
                      {collaborator.user?.avatar ? (
                        <img
                          src={`https://cdn.discordapp.com/avatars/${collaborator.user.discordId}/${collaborator.user.avatar}.png?size=128`}
                          alt={collaborator.user.username}
                          className="w-14 h-14 rounded-full ring-2 ring-gray-200"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ring-2 ring-gray-200">
                          <UserGroupIcon className="h-7 w-7 text-gray-400" />
                        </div>
                      )}
                      <StatusIcon className={`absolute -bottom-1 -right-1 h-5 w-5 ${statusInfo.color} bg-white rounded-full p-0.5`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h4 className="text-gray-900 font-semibold truncate">
                          {collaborator.user?.username || 'Unknown User'}
                        </h4>
                        <div className={`flex items-center space-x-1.5 px-3 py-1 ${roleInfo.bgColor} border ${roleInfo.borderColor} rounded-lg`}>
                          <RoleIcon className={`h-3.5 w-3.5 ${roleInfo.color}`} />
                          <span className={`text-xs font-medium ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {roleInfo.description}
                      </p>
                      {collaborator.lastAccessAt && (
                        <p className="text-xs text-gray-500">
                          Last active: {new Date(collaborator.lastAccessAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {isOwner && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleExpanded(collaborator.id)}
                        className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View permissions"
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="h-5 w-5" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveCollaborator(collaborator.id)}
                        className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Permissions */}
                {isExpanded && collaborator.permissions && (
                  <div className="mt-5 pt-5 border-t border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3">Custom Permissions</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(collaborator.permissions).map(([key, value]) => (
                        value && (
                          <div key={key} className="flex items-center space-x-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="truncate">{key}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Invite Collaborator</h3>
            </div>

            <div className="space-y-5">
              {/* Discord ID Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  User Discord ID
                </label>
                <input
                  type="text"
                  value={inviteForm.userDiscordId}
                  onChange={(e) => setInviteForm({ ...inviteForm, userDiscordId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="123456789012345678"
                />
                <p className="text-xs text-gray-500 mt-2">
                  User must have an account on the platform
                </p>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(roleConfig).map(([value, config]) => {
                    const RoleIcon = config.icon;
                    const isSelected = inviteForm.role === value;

                    return (
                      <button
                        key={value}
                        onClick={() => setInviteForm({ ...inviteForm, role: value as CollaboratorRole })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? `${config.borderColor} ${config.bgColor}`
                            : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <RoleIcon className={`h-5 w-5 ${isSelected ? config.color : 'text-gray-400'}`} />
                          <span className={`font-medium ${isSelected ? config.color : 'text-gray-400'}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {config.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Permissions Toggle */}
              <div className="border-t border-gray-700 pt-5">
                <button
                  onClick={() => setShowCustomPermissions(!showCustomPermissions)}
                  className="flex items-center justify-between w-full p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-xl transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <AdjustmentsHorizontalIcon className="h-5 w-5 text-purple-400" />
                    <div className="text-left">
                      <h4 className="font-medium text-white">Custom Permissions</h4>
                      <p className="text-xs text-gray-400">Override role defaults with specific permissions</p>
                    </div>
                  </div>
                  <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${showCustomPermissions ? 'rotate-180' : ''}`} />
                </button>

                {/* Custom Permissions Editor */}
                {showCustomPermissions && (
                  <div className="mt-4 space-y-4">
                    {Object.entries(permissionGroups).map(([groupName, permissions]) => (
                      <div key={groupName} className="bg-gray-700/20 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-white">{groupName}</h5>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => selectAllInGroup(permissions)}
                              className="text-xs px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors"
                            >
                              All
                            </button>
                            <button
                              onClick={() => deselectAllInGroup(permissions)}
                              className="text-xs px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                            >
                              None
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {permissions.map((perm) => (
                            <button
                              key={perm.key}
                              onClick={() => togglePermission(perm.key)}
                              className={`p-3 rounded-lg border-2 transition-all text-left ${
                                inviteForm.permissions?.[perm.key]
                                  ? 'border-green-500 bg-green-500/10'
                                  : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <span className={`text-sm font-medium ${
                                  inviteForm.permissions?.[perm.key] ? 'text-green-400' : 'text-gray-300'
                                }`}>
                                  {perm.label}
                                </span>
                                <CheckCircleIcon className={`h-5 w-5 flex-shrink-0 ${
                                  inviteForm.permissions?.[perm.key] ? 'text-green-400' : 'text-gray-600'
                                }`} />
                              </div>
                              <p className="text-xs text-gray-500">{perm.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional Message */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={inviteForm.message || ''}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  rows={3}
                  placeholder="Add a personal message to your invitation..."
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setShowCustomPermissions(false);
                }}
                className="px-5 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-lg shadow-blue-500/20"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
