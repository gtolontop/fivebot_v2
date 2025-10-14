'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { designTokens } from '@/styles/design-tokens';

interface Log {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export default function ConsolePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params.id as string;

  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);
  const [command, setCommand] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchBot();
      // Simulate log streaming
      const interval = setInterval(() => {
        addMockLog();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user, botId]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const fetchBot = async () => {
    try {
      const response = await botsAPI.getById(botId);
      setBot(response.data);
    } catch (error: any) {
      console.error('Error fetching bot:', error);
      toast.error('Failed to load bot details');
    } finally {
      setLoading(false);
    }
  };

  const addMockLog = () => {
    const levels: Array<'info' | 'warn' | 'error' | 'debug'> = ['info', 'warn', 'error', 'debug'];
    const messages = [
      'Command executed successfully',
      'User joined server',
      'Message processed',
      'Database query completed',
      'API request received',
      'Event handler triggered',
      'Cache updated',
      'Warning: Rate limit approaching',
      'Error: Failed to connect to voice channel',
      'Debug: Processing message content',
    ];

    const newLog: Log = {
      id: Date.now().toString(),
      timestamp: new Date(),
      level: levels[Math.floor(Math.random() * levels.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
    };

    setLogs(prev => [...prev, newLog].slice(-100)); // Keep last 100 logs
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const newLog: Log = {
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: `> ${command}`,
    };

    setLogs(prev => [...prev, newLog]);
    setCommand('');
    toast.success('Command sent');
  };

  const clearLogs = () => {
    setLogs([]);
    toast.success('Console cleared');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'text-blue-400';
      case 'warn':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      case 'debug':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'info':
        return 'bg-blue-500/10';
      case 'warn':
        return 'bg-yellow-500/10';
      case 'error':
        return 'bg-red-500/10';
      case 'debug':
        return 'bg-gray-500/10';
      default:
        return 'bg-gray-500/10';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user || !bot) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => router.push(`/bots/${botId}`)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className={designTokens.typography.h1}>{bot.name} - Console</h1>
              <Badge status={bot.status} dot />
            </div>
            <p className={designTokens.typography.body + ' text-gray-500'}>
              Real-time bot console and logs
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/bots/${botId}`)}
            >
              Back to Bot
            </Button>
          </div>
        </div>

        {/* Console */}
        <Card className="bg-gray-900 border-gray-700 h-[600px] flex flex-col">
          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-12">
                No logs yet. Waiting for events...
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start space-x-3 py-1 px-2 rounded ${getLevelBg(log.level)}`}
                  >
                    <span className="text-gray-500 text-xs flex-shrink-0 w-20">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className={`text-xs font-semibold uppercase flex-shrink-0 w-14 ${getLevelColor(log.level)}`}>
                      [{log.level}]
                    </span>
                    <span className="text-gray-300 flex-1">{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>

          {/* Command Input */}
          <form onSubmit={handleCommandSubmit} className="border-t border-gray-700 p-4">
            <div className="flex items-center space-x-3">
              <span className="text-green-400 font-mono text-sm flex-shrink-0">$</span>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Enter command..."
                className="flex-1 bg-transparent border-none focus:outline-none text-gray-300 font-mono text-sm placeholder-gray-600"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!command.trim()}
              >
                Send
              </Button>
            </div>
          </form>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Total Logs</div>
            <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Errors</div>
            <div className="text-2xl font-bold text-red-600">
              {logs.filter(l => l.level === 'error').length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Warnings</div>
            <div className="text-2xl font-bold text-yellow-600">
              {logs.filter(l => l.level === 'warn').length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Uptime</div>
            <div className="text-2xl font-bold text-green-600">99.9%</div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
