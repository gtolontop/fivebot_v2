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
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon
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

const roleLabels: Record<CollaboratorRole, { label: string; color: string; description: string }> = {
  [CollaboratorRole.VIEWER]: {
    label: 'Spectateur',
    color: 'bg-gray-100 text-gray-800',
    description: 'Peut uniquement voir les statistiques et logs'
  },
  [CollaboratorRole.MODERATOR]: {
    label: 'Modérateur',
    color: 'bg-blue-100 text-blue-800',
    description: 'Gère la modération, tickets et logs'
  },
  [CollaboratorRole.DEVELOPER]: {
    label: 'Développeur',
    color: 'bg-purple-100 text-purple-800',
    description: 'Gère les commandes et la configuration'
  },
  [CollaboratorRole.ADMIN]: {
    label: 'Administrateur',
    color: 'bg-red-100 text-red-800',
    description: 'Tous les droits sauf supprimer le bot'
  },
};

const statusLabels: Record<CollaboratorStatus, { label: string; color: string; icon: any }> = {
  [CollaboratorStatus.PENDING]: {
    label: 'En attente',
    color: 'text-yellow-600',
    icon: ClockIcon
  },
  [CollaboratorStatus.ACTIVE]: {
    label: 'Actif',
    color: 'text-green-600',
    icon: CheckCircleIcon
  },
  [CollaboratorStatus.SUSPENDED]: {
    label: 'Suspendu',
    color: 'text-orange-600',
    icon: XCircleIcon
  },
  [CollaboratorStatus.REVOKED]: {
    label: 'Révoqué',
    color: 'text-red-600',
    icon: XCircleIcon
  },
};

export default function CollaboratorManagement({ botId, isOwner }: CollaboratorManagementProps) {
  const [collaborators, setCollaborators] = useState<BotCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<BotCollaborator | null>(null);
  const [expandedCollaborators, setExpandedCollaborators] = useState<Set<string>>(new Set());

  // Invite form state
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
      console.error('Erreur lors du chargement des collaborateurs:', error);
      toast.error('Erreur lors du chargement des collaborateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.userDiscordId.trim()) {
      toast.error('Veuillez entrer un Discord ID');
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
        body: JSON.stringify(inviteForm),
      });

      if (response.ok) {
        toast.success('Invitation envoyée avec succès');
        setShowInviteModal(false);
        setInviteForm({
          userDiscordId: '',
          role: CollaboratorRole.VIEWER,
          permissions: {},
        });
        fetchCollaborators();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de l\'invitation');
      }
    } catch (error) {
      console.error('Erreur lors de l\'invitation:', error);
      toast.error('Erreur lors de l\'invitation');
    }
  };

  const handleUpdateCollaborator = async (collaboratorId: string, updates: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/bots/${botId}/collaborators/${collaboratorId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        toast.success('Collaborateur mis à jour');
        fetchCollaborators();
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce collaborateur ?')) {
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
        toast.success('Collaborateur retiré');
        fetchCollaborators();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
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

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <UserGroupIcon className="h-6 w-6 text-blue-400" />
          <h3 className="text-xl font-bold text-white">Gestion des Collaborateurs</h3>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Inviter</span>
          </button>
        )}
      </div>

      {collaborators.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <UserGroupIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Aucun collaborateur pour le moment</p>
          {isOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Inviter votre première personne
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {collaborators.map((collaborator) => {
            const StatusIcon = statusLabels[collaborator.status].icon;
            const isExpanded = expandedCollaborators.has(collaborator.id);

            return (
              <div key={collaborator.id} className="bg-gray-750 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {collaborator.user?.avatar ? (
                      <img
                        src={`https://cdn.discordapp.com/avatars/${collaborator.user.discordId}/${collaborator.user.avatar}.png`}
                        alt={collaborator.user.username}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                        <UserGroupIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-white font-medium">
                          {collaborator.user?.username || 'Utilisateur inconnu'}
                        </h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${roleLabels[collaborator.role].color}`}>
                          {roleLabels[collaborator.role].label}
                        </span>
                        <StatusIcon className={`h-5 w-5 ${statusLabels[collaborator.status].color}`} />
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {roleLabels[collaborator.role].description}
                      </p>
                      {collaborator.lastAccessAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Dernier accès: {new Date(collaborator.lastAccessAt).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isOwner && (
                      <>
                        <button
                          onClick={() => toggleExpanded(collaborator.id)}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title="Voir les permissions"
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="h-5 w-5" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveCollaborator(collaborator.id)}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          title="Retirer"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && collaborator.permissions && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h5 className="text-sm font-medium text-gray-300 mb-3">Permissions personnalisées:</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(collaborator.permissions).map(([key, value]) => (
                        value && (
                          <div key={key} className="flex items-center space-x-2 text-xs text-gray-400">
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            <span>{key}</span>
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

      {/* Modal d'invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Inviter un collaborateur</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Discord ID de l'utilisateur
                </label>
                <input
                  type="text"
                  value={inviteForm.userDiscordId}
                  onChange={(e) => setInviteForm({ ...inviteForm, userDiscordId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="123456789012345678"
                />
                <p className="text-xs text-gray-500 mt-1">
                  L'utilisateur doit avoir un compte sur la plateforme
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rôle
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as CollaboratorRole })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(roleLabels).map(([value, { label, description }]) => (
                    <option key={value} value={value}>
                      {label} - {description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message d'invitation (optionnel)
                </label>
                <textarea
                  value={inviteForm.message || ''}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  rows={3}
                  placeholder="Un message personnalisé pour accompagner l'invitation..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleInvite}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Envoyer l'invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
