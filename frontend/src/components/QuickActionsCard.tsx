'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface QuickActionsCardProps {
  botId: string;
  botStatus: string;
  onStart: () => void;
  onStop: () => void;
  onGenerateInvite: () => void;
  actionLoading: string | null;
}

export default function QuickActionsCard({
  botId,
  botStatus,
  onStart,
  onStop,
  onGenerateInvite,
  actionLoading
}: QuickActionsCardProps) {
  const router = useRouter();

  const primaryActions = [
    {
      label: 'Configuration',
      icon: '⚙️',
      action: () => router.push(`/bots/${botId}/config`),
      variant: 'primary' as const,
      disabled: false,
    },
    {
      label: 'Generate Invite',
      icon: '🔗',
      action: onGenerateInvite,
      variant: 'secondary' as const,
      disabled: false,
    },
    {
      label: 'Analytics',
      icon: '📊',
      action: () => router.push(`/bots/${botId}/analytics`),
      variant: 'secondary' as const,
      disabled: false,
    },
  ];

  const controlActions = [
    {
      label: botStatus === 'OFFLINE' ? 'Start Bot' : 'Stop Bot',
      icon: botStatus === 'OFFLINE' ? '▶️' : '⏹️',
      action: botStatus === 'OFFLINE' ? onStart : onStop,
      variant: (botStatus === 'OFFLINE' ? 'success' : 'danger') as 'success' | 'danger',
      disabled: actionLoading === 'start' || actionLoading === 'stop',
      loading: actionLoading === 'start' || actionLoading === 'stop',
    },
  ];

  const getButtonClasses = (variant: 'primary' | 'secondary' | 'success' | 'danger', disabled: boolean) => {
    const baseClasses = 'w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200',
      success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
    };

    return `${baseClasses} ${variants[variant]}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm">⚡</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
      </div>

      <div className="space-y-3">
        {/* Control Actions */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Bot Control</h4>
          {controlActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              disabled={action.disabled}
              className={getButtonClasses(action.variant, action.disabled)}
            >
              {action.loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>
                    {actionLoading === 'start' ? 'Starting...' : 'Stopping...'}
                  </span>
                </>
              ) : (
                <>
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Primary Actions */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Management</h4>
          <div className="space-y-2">
            {primaryActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                disabled={action.disabled}
                className={getButtonClasses(action.variant, action.disabled)}
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Actions */}
        <div className="border-t border-gray-100 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push(`/bots/${botId}/logs`)}
              className="flex items-center justify-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span>📄</span>
              <span>Logs</span>
            </button>
            <button
              onClick={() => router.push(`/bots/${botId}/playground`)}
              className="flex items-center justify-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span>🎮</span>
              <span>Playground</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}