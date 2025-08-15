'use client';

import { useState, useEffect } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  botId: string;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

interface NotificationsCenterProps {
  botId: string;
  botStatus: string;
  onNotificationUpdate?: (count: number) => void;
}

export default function NotificationsCenter({ 
  botId, 
  botStatus, 
  onNotificationUpdate 
}: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState({
    enablePush: true,
    enableDiscordWebhook: false,
    webhookUrl: '',
    alertOnCrash: true,
    alertOnHighUsage: true,
    alertOnNewMember: false,
    alertOnSpam: true,
  });
  const [showSettings, setShowSettings] = useState(false);

  // Generate realistic notifications
  useEffect(() => {
    const generateNotifications = () => {
      const notificationTypes = [
        {
          type: 'info' as const,
          title: 'New Member Joined',
          message: `User @NewUser#1234 joined server "My Cool Server"`,
          weight: 0.3,
        },
        {
          type: 'success' as const,
          title: 'Command Executed',
          message: 'User successfully used /welcome command',
          weight: 0.4,
        },
        {
          type: 'warning' as const,
          title: 'High Memory Usage',
          message: 'Bot memory usage reached 85%. Consider optimizing.',
          weight: 0.15,
        },
        {
          type: 'error' as const,
          title: 'Connection Lost',
          message: 'Temporary disconnection from Discord API. Reconnecting...',
          weight: 0.1,
        },
        {
          type: 'warning' as const,
          title: 'Spam Detected',
          message: 'User @SpammerUser#5678 sent 10 messages in 5 seconds',
          weight: 0.05,
        },
      ];

      if (botStatus === 'ONLINE' && Math.random() < 0.3) {
        const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
        
        const newNotification: Notification = {
          id: Date.now().toString(),
          type: randomType.type,
          title: randomType.title,
          message: randomType.message,
          timestamp: new Date(),
          read: false,
          botId,
          actions: randomType.type === 'warning' ? [
            {
              label: 'View Details',
              action: () => toast.info('Opening detailed view...'),
            },
            {
              label: 'Optimize',
              action: () => toast.success('Optimization started'),
            }
          ] : undefined,
        };

        setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50

        // Send push notification if enabled
        if (settings.enablePush && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`FiveBot - ${randomType.title}`, {
            body: randomType.message,
            icon: '/logo.png',
          });
        }
      }
    };

    if (botStatus === 'ONLINE') {
      const interval = setInterval(generateNotifications, 8000 + Math.random() * 12000); // 8-20 seconds
      return () => clearInterval(interval);
    }
  }, [botStatus, botId, settings.enablePush]);

  // Update parent component with unread count
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    onNotificationUpdate?.(unreadCount);
  }, [notifications, onNotificationUpdate]);

  // Request notification permission
  useEffect(() => {
    if (settings.enablePush && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [settings.enablePush]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error': return '🔴';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const getNotificationBg = (type: string, read: boolean) => {
    const opacity = read ? 'bg-opacity-30' : 'bg-opacity-100';
    switch (type) {
      case 'error': return `bg-red-50 border-red-200 ${opacity}`;
      case 'warning': return `bg-yellow-50 border-yellow-200 ${opacity}`;
      case 'success': return `bg-green-50 border-green-200 ${opacity}`;
      case 'info': return `bg-blue-50 border-blue-200 ${opacity}`;
      default: return `bg-gray-50 border-gray-200 ${opacity}`;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">🔔 Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-500 hover:text-gray-700 p-1"
            title="Notification Settings"
          >
            ⚙️
          </button>
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
              <button
                onClick={clearAll}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Notification Settings</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enablePush}
                onChange={(e) => setSettings(prev => ({ ...prev, enablePush: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">Enable browser notifications</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.alertOnCrash}
                onChange={(e) => setSettings(prev => ({ ...prev, alertOnCrash: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">Alert on bot crashes</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.alertOnHighUsage}
                onChange={(e) => setSettings(prev => ({ ...prev, alertOnHighUsage: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">Alert on high resource usage</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.alertOnNewMember}
                onChange={(e) => setSettings(prev => ({ ...prev, alertOnNewMember: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">Alert on new members</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.alertOnSpam}
                onChange={(e) => setSettings(prev => ({ ...prev, alertOnSpam: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">Alert on spam detection</span>
            </label>
            
            <div className="border-t pt-3">
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={settings.enableDiscordWebhook}
                  onChange={(e) => setSettings(prev => ({ ...prev, enableDiscordWebhook: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">Send alerts to Discord webhook</span>
              </label>
              {settings.enableDiscordWebhook && (
                <input
                  type="url"
                  placeholder="Discord webhook URL"
                  value={settings.webhookUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  className="w-full text-sm border rounded px-2 py-1"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🔕</div>
            <p>No notifications yet</p>
            <p className="text-sm">Notifications will appear here when events occur</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${getNotificationBg(notification.type, notification.read)}`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className={`text-sm font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {notification.timestamp.toLocaleTimeString()}
                    </p>
                    
                    {/* Action Buttons */}
                    {notification.actions && (
                      <div className="flex space-x-2 mt-2">
                        {notification.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.action();
                            }}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}