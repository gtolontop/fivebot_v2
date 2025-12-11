'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Cookies from 'js-cookie';
import { useBotWebSocket, useBotPolling, LogEntry as WSLogEntry } from '../hooks/useBotWebSocket';

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

// Convert WebSocket log entry to display format
const convertWSLog = (wsLog: WSLogEntry, index: number): LogEntry => {
  return {
    id: `ws-${new Date(wsLog.timestamp).getTime()}-${index}`,
    timestamp: new Date(wsLog.timestamp).toLocaleTimeString(),
    level: wsLog.level || 'info',
    message: wsLog.line,
    category: wsLog.source || 'Bot',
  };
};

export default function BotLogs({ botId, botStatus, className = '' }: BotLogsProps) {
  const [displayLogs, setDisplayLogs] = useState<LogEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [connectionMode, setConnectionMode] = useState<'websocket' | 'polling'>('websocket');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const hasLoadedHistoryRef = useRef(false);

  // WebSocket connection
  const {
    connected: wsConnected,
    logs: wsLogs,
    status: wsStatus,
  } = useBotWebSocket({
    botId,
    enabled: connectionMode === 'websocket',
    onLog: (log) => {
      // Real-time log received
      console.log('[BotLogs] New log via WebSocket:', log.line.substring(0, 50));
    },
    onConnect: () => {
      console.log('[BotLogs] WebSocket connected');
      setConnectionMode('websocket');
    },
    onDisconnect: () => {
      console.log('[BotLogs] WebSocket disconnected, falling back to polling');
      // Fall back to polling if WebSocket fails
      setTimeout(() => {
        if (!wsConnected) {
          setConnectionMode('polling');
        }
      }, 5000);
    },
    onError: (error) => {
      console.error('[BotLogs] WebSocket error:', error);
    },
  });

  // Fallback polling (only used if WebSocket fails)
  const { logs: pollingLogs, loading: pollingLoading } = useBotPolling(
    botId,
    connectionMode === 'polling' ? 2000 : 999999 // Only poll if in polling mode
  );

  // Convert and merge logs
  useEffect(() => {
    const sourceLogs = connectionMode === 'websocket' ? wsLogs : pollingLogs;

    if (sourceLogs.length > 0) {
      const converted = sourceLogs.map((log, idx) => convertWSLog(log, idx));
      setDisplayLogs(converted);
      setIsLoadingHistory(false);
    }
  }, [wsLogs, pollingLogs, connectionMode]);

  // Load history on mount
  useEffect(() => {
    if (!hasLoadedHistoryRef.current) {
      loadHistoricalLogs();
      hasLoadedHistoryRef.current = true;
    }
  }, [botId]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayLogs, isAutoScroll]);

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

        // Use structuredLogs if available (new backend), fall back to logs array
        if (data.structuredLogs && data.structuredLogs.length > 0) {
          const converted = data.structuredLogs.map((log: WSLogEntry, idx: number) => convertWSLog(log, idx));
          setDisplayLogs(converted);
        } else if (data.logs && data.logs.length > 0) {
          // Legacy format - convert raw log strings
          const structuredLogs: LogEntry[] = data.logs.map((logString: string, index: number) => {
            const id = `history-${Date.now()}-${index}`;
            const timestampMatch = logString.match(/\[(\d{2}:\d{2}:\d{2})\]/);
            const timestamp = timestampMatch ? timestampMatch[1] : new Date().toLocaleTimeString();

            let level: LogEntry['level'] = 'info';
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

            if (logString.includes('discord@')) category = 'Discord';
            else if (logString.includes('cmd@')) category = 'Commands';
            else if (logString.includes('container@')) category = 'System';

            return { id, timestamp, level, message: logString, category };
          });

          setDisplayLogs(structuredLogs);
        } else {
          // No logs found
          setDisplayLogs([{
            id: `empty-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: 'info',
            message: 'No logs available yet. Start the bot to see logs.',
            category: 'System'
          }]);
        }
      }
    } catch (error) {
      console.log('Could not fetch historical logs:', error);
      setDisplayLogs([{
        id: `error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: 'Failed to load log history',
        category: 'System'
      }]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const clearLogs = () => {
    setDisplayLogs([]);
  };

  const downloadLogs = () => {
    const logText = displayLogs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n');
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

  const filteredLogs = displayLogs.filter(log => {
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
            {wsConnected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 font-medium">Live</span>
              </>
            ) : connectionMode === 'polling' ? (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-yellow-600 font-medium">Polling</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-500">Connecting...</span>
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
            disabled={displayLogs.length === 0}
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
          {filteredLogs.length} / {displayLogs.length} logs
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
            {displayLogs.length === 0 ? 'No logs available...' : 'No logs match your filters'}
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
          <span>Total: {displayLogs.length}</span>
          <span>Errors: {displayLogs.filter(l => l.level === 'error').length}</span>
          <span>Warnings: {displayLogs.filter(l => l.level === 'warn').length}</span>
        </div>
        <div className="text-xs text-gray-500">
          {connectionMode === 'websocket' && wsConnected ? (
            <span className="text-green-600">Live (WebSocket)</span>
          ) : connectionMode === 'polling' ? (
            <span>Polling every 2s</span>
          ) : (
            <span>Connecting...</span>
          )}
        </div>
      </div>
    </div>
  );
}