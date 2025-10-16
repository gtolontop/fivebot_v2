'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';

interface BotLogsProps {
  botId: string;
  botStatus: string;
  className?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  message: string;
  category?: string;
}

export default function BotLogs({ botId, botStatus, className = '' }: BotLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const lastFetchedLogsRef = useRef<string[]>([]);
  const hasLoadedHistoryRef = useRef(false);

  // Load history once on mount
  useEffect(() => {
    if (!hasLoadedHistoryRef.current) {
      loadHistoricalLogs();
      hasLoadedHistoryRef.current = true;
    }
  }, [botId]);

  // Fetch logs when bot status changes or component mounts
  useEffect(() => {
    if (botStatus !== 'ONLINE') {
      // Don't clear logs when bot goes offline - keep the history
      setIsConnected(false);
      return;
    }

    // Start polling for new logs
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    setIsConnected(true);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, [botId, botStatus]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isAutoScroll]);

  const loadHistoricalLogs = async () => {
    setIsLoadingHistory(true);
    try {
      const token = Cookies.get('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/bots/${botId}/logs/history`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.logs && data.logs.length > 0) {
          // Convert raw log strings to structured LogEntry objects
          const structuredLogs: LogEntry[] = data.logs.map((logString: string, index: number) => {
            const id = `history-${Date.now()}-${index}`;

            // Extract timestamp from log string
            const timestampMatch = logString.match(/\[(\d{2}:\d{2}:\d{2})\]/);
            const timestamp = timestampMatch ? timestampMatch[1] : new Date().toLocaleTimeString();

            // Parse log level from message
            let level: LogEntry['level'] = 'info';
            let message = logString;
            let category = 'Bot';

            if (logString.includes('✅') || logString.toLowerCase().includes('success')) {
              level = 'success';
            } else if (logString.includes('❌') || logString.toLowerCase().includes('error')) {
              level = 'error';
            } else if (logString.includes('⚠️') || logString.toLowerCase().includes('warn')) {
              level = 'warn';
            } else if (logString.includes('🔄') || logString.toLowerCase().includes('debug')) {
              level = 'debug';
            }

            // Extract category from message patterns
            if (logString.includes('discord@')) category = 'Discord';
            else if (logString.includes('cmd@')) category = 'Commands';
            else if (logString.includes('container@')) category = 'System';

            return { id, timestamp, level, message, category };
          });

          setLogs(structuredLogs);
          lastFetchedLogsRef.current = structuredLogs.map(log => log.message);
        } else {
          // No logs found - add a placeholder
          const placeholderLog: LogEntry = {
            id: `placeholder-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: 'info',
            message: 'No recent logs available. Logs from the last hour will appear here.',
            category: 'System'
          };
          setLogs([placeholderLog]);
        }
      }
    } catch (error) {
      console.log('Could not fetch historical logs:', error);
      // Add error log
      const errorLog: LogEntry = {
        id: `error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: 'Failed to load log history',
        category: 'System'
      };
      setLogs([errorLog]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/bots/${botId}/logs/live`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.logs && data.logs.length > 0) {
          // Convert raw log strings to structured LogEntry objects
          const structuredLogs: LogEntry[] = data.logs.map((logString: string, index: number) => {
            const id = `${Date.now()}-${index}`;
            const timestamp = new Date().toLocaleTimeString();
            
            // Parse log level from message
            let level: LogEntry['level'] = 'info';
            let message = logString;
            let category = 'Bot';

            if (logString.includes('✅') || logString.toLowerCase().includes('success')) {
              level = 'success';
            } else if (logString.includes('❌') || logString.toLowerCase().includes('error')) {
              level = 'error';
            } else if (logString.includes('⚠️') || logString.toLowerCase().includes('warn')) {
              level = 'warn';
            } else if (logString.includes('🔄') || logString.toLowerCase().includes('debug')) {
              level = 'debug';
            }

            // Extract category from message patterns
            if (logString.includes('Discord')) category = 'Discord';
            else if (logString.includes('Command')) category = 'Commands';
            else if (logString.includes('Guild') || logString.includes('Server')) category = 'Guilds';
            else if (logString.includes('Database') || logString.includes('DB')) category = 'Database';

            return { id, timestamp, level, message, category };
          });

          // Only add new logs that we haven't seen before
          const newLogs = structuredLogs.filter(log => 
            !lastFetchedLogsRef.current.includes(log.message)
          );
          
          if (newLogs.length > 0) {
            setLogs(prev => [...prev, ...newLogs].slice(-500)); // Keep last 500 logs
            lastFetchedLogsRef.current = structuredLogs.map(log => log.message);
          }
        }
      }
    } catch (error) {
      console.log('Could not fetch bot logs:', error);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    lastFetchedLogsRef.current = [];
  };

  const downloadLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bot-${botId}-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setIsAutoScroll(isAtBottom);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.category && log.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'debug': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getLevelBadgeColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'warn': return 'bg-yellow-100 text-yellow-800';
      case 'debug': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Don't show offline message - always show the console

  return (
    <div className={`card p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">🔍 Bot Logs</h3>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 font-medium">Live</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-500">Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              isAutoScroll 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Auto-scroll: {isAutoScroll ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={downloadLogs}
            disabled={logs.length === 0}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Download
          </button>
          <button
            onClick={clearLogs}
            className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded-md hover:bg-red-200"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Level:</label>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 flex-1">
          <label className="text-sm font-medium text-gray-700">Search:</label>
          <input
            type="text"
            placeholder="Filter logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs border border-gray-300 rounded-md px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-xs text-gray-500">
          {filteredLogs.length} / {logs.length} logs
        </div>
      </div>

      {/* Logs Container */}
      <div
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono h-80 overflow-y-auto border border-gray-700"
      >
        {isLoadingHistory ? (
          <div className="text-gray-500 text-center py-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-gray-500 border-t-green-400 rounded-full animate-spin"></div>
              <span>Loading logs...</span>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            {logs.length === 0 ? 'No logs available...' : 'No logs match your filters'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2 py-1 hover:bg-gray-800 rounded px-2">
                <span className="text-gray-400 text-xs shrink-0 mt-0.5">
                  {log.timestamp}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${getLevelBadgeColor(log.level)}`}>
                  {log.level.toUpperCase()}
                </span>
                {log.category && (
                  <span className="text-xs text-blue-400 shrink-0">
                    [{log.category}]
                  </span>
                )}
                <span className={`flex-1 ${getLevelColor(log.level)}`}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span>Total: {logs.length}</span>
          <span>Errors: {logs.filter(l => l.level === 'error').length}</span>
          <span>Warnings: {logs.filter(l => l.level === 'warn').length}</span>
        </div>
        <div className="text-xs text-gray-500">
          Auto-refresh every 3s
        </div>
      </div>
    </div>
  );
}