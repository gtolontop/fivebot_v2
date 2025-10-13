'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Invitation {
  id: string;
  botId: string;
  invitedAt: string;
  permissions: Record<string, boolean>;
  bot: {
    id: string;
    name: string;
    status: string;
  };
}

export default function PendingInvitations({ onAccept }: { onAccept?: () => void }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bots/collaborators/my-invitations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitation: Invitation) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${invitation.botId}/collaborators/${invitation.id}/accept`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success(`Accepted invitation to ${invitation.bot.name}!`);
        fetchInvitations();
        if (onAccept) onAccept();
      } else {
        toast.error('Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to accept invitation');
    }
  };

  const handleDecline = async (invitation: Invitation) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${invitation.botId}/collaborators/${invitation.id}/decline`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Invitation declined');
        fetchInvitations();
      } else {
        toast.error('Failed to decline invitation');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to decline invitation');
    }
  };

  if (loading || invitations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              Invitation to collaborate on <span className="text-blue-600">{invitation.bot.name}</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {Object.keys(invitation.permissions || {}).length} permission(s) granted
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleAccept(invitation)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <CheckIcon className="h-4 w-4" />
              <span>Accept</span>
            </button>
            <button
              onClick={() => handleDecline(invitation)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
              <span>Decline</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
