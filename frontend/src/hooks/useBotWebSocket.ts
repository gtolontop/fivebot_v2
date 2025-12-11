'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

export interface LogEntry {
  botId: string;
  line: string;
  timestamp: Date;
  level?: 'info' | 'warn' | 'error' | 'debug' | 'success';
  source?: string;
}

export interface BotStatus {
  botId: string;
  status: string;
  timestamp: Date;
}

interface UseBotWebSocketOptions {
  botId: string;
  enabled?: boolean;
  onLog?: (log: LogEntry) => void;
  onStatus?: (status: BotStatus) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface UseBotWebSocketReturn {
  connected: boolean;
  logs: LogEntry[];
  status: string;
  subscribe: () => void;
  unsubscribe: () => void;
  clearLogs: () => void;
  getFullLogs: () => Promise<LogEntry[]>;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ||
               (process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000');

export function useBotWebSocket(options: UseBotWebSocketOptions): UseBotWebSocketReturn {
  const { botId, enabled = true, onLog, onStatus, onConnect, onDisconnect, onError } = options;

  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<string>('offline');

  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isSubscribed = useRef(false);

  // Initialize WebSocket connection
  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = Cookies.get('token');
    if (!token) {
      console.warn('No auth token available for WebSocket');
      return;
    }

    console.log(`[WS] Connecting to ${WS_URL}/ws`);

    const socket = io(`${WS_URL}/ws`, {
      transports: ['websocket', 'polling'],
      auth: { token },
      query: { token },
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected');
      setConnected(true);
      reconnectAttempts.current = 0;
      onConnect?.();

      // Auto-subscribe to bot if we were previously subscribed
      if (isSubscribed.current && botId) {
        socket.emit('subscribe:bot', { botId });
      }
    });

    socket.on('connected', (data) => {
      console.log('[WS] Server confirmed connection:', data);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      setConnected(false);
      onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error);
      reconnectAttempts.current++;
      onError?.(error);

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('[WS] Max reconnection attempts reached, falling back to polling');
      }
    });

    socket.on('log', (entry: LogEntry) => {
      if (entry.botId === botId) {
        const normalizedEntry = {
          ...entry,
          timestamp: new Date(entry.timestamp),
        };
        setLogs(prev => [...prev.slice(-999), normalizedEntry]);
        onLog?.(normalizedEntry);
      }
    });

    socket.on('status', (data: BotStatus) => {
      if (data.botId === botId) {
        setStatus(data.status);
        onStatus?.(data);
      }
    });

    socket.on('error', (error: { message: string }) => {
      console.error('[WS] Server error:', error.message);
      onError?.(new Error(error.message));
    });

    socketRef.current = socket;
  }, [botId, onConnect, onDisconnect, onError, onLog, onStatus]);

  // Subscribe to a bot
  const subscribe = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.log('[WS] Not connected, will subscribe after connection');
      isSubscribed.current = true;
      initSocket();
      return;
    }

    isSubscribed.current = true;

    socketRef.current.emit('subscribe:bot', { botId }, (response: any) => {
      if (response.success) {
        console.log(`[WS] Subscribed to bot ${botId}`);
        setStatus(response.status || 'offline');

        // Load initial logs if provided
        if (response.initialLogs?.length > 0) {
          const normalizedLogs = response.initialLogs.map((log: LogEntry) => ({
            ...log,
            timestamp: new Date(log.timestamp),
          }));
          setLogs(normalizedLogs);
        }
      } else {
        console.error('[WS] Failed to subscribe:', response.error);
      }
    });
  }, [botId, initSocket]);

  // Unsubscribe from a bot
  const unsubscribe = useCallback(() => {
    isSubscribed.current = false;

    if (!socketRef.current?.connected) return;

    socketRef.current.emit('unsubscribe:bot', { botId }, (response: any) => {
      if (response.success) {
        console.log(`[WS] Unsubscribed from bot ${botId}`);
      }
    });
  }, [botId]);

  // Clear local logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Get full log history
  const getFullLogs = useCallback(async (): Promise<LogEntry[]> => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) {
        resolve(logs);
        return;
      }

      socketRef.current.emit('logs:full', { botId, limit: 1000 }, (response: any) => {
        if (response.success && response.logs) {
          const normalizedLogs = response.logs.map((log: LogEntry) => ({
            ...log,
            timestamp: new Date(log.timestamp),
          }));
          setLogs(normalizedLogs);
          resolve(normalizedLogs);
        } else {
          resolve(logs);
        }
      });
    });
  }, [botId, logs]);

  // Effect to manage connection lifecycle
  useEffect(() => {
    if (!enabled || !botId) return;

    initSocket();
    subscribe();

    return () => {
      unsubscribe();
    };
  }, [enabled, botId, initSocket, subscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Ping to keep connection alive
  useEffect(() => {
    if (!connected || !socketRef.current) return;

    const pingInterval = setInterval(() => {
      socketRef.current?.emit('ping');
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [connected]);

  return {
    connected,
    logs,
    status,
    subscribe,
    unsubscribe,
    clearLogs,
    getFullLogs,
  };
}

// Fallback polling hook for when WebSocket is not available
export function useBotPolling(botId: string, interval = 3000) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<string>('offline');
  const [loading, setLoading] = useState(true);
  const lastFetchedRef = useRef<string[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      const token = Cookies.get('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const response = await fetch(`${apiUrl}/api/bots/${botId}/logs/live`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.bufferStatus || 'offline');

        if (data.structuredLogs?.length > 0) {
          const newLogs = data.structuredLogs.filter(
            (log: LogEntry) => !lastFetchedRef.current.includes(log.line)
          );

          if (newLogs.length > 0) {
            setLogs(prev => {
              const merged = [...prev, ...newLogs.map((log: LogEntry) => ({
                ...log,
                timestamp: new Date(log.timestamp),
              }))];
              return merged.slice(-500);
            });
            lastFetchedRef.current = data.structuredLogs.map((l: LogEntry) => l.line);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    fetchLogs();
    const pollInterval = setInterval(fetchLogs, interval);
    return () => clearInterval(pollInterval);
  }, [fetchLogs, interval]);

  return { logs, status, loading, refetch: fetchLogs };
}
