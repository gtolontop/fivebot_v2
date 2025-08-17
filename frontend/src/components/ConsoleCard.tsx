'use client';

import { useEffect, useRef } from 'react';

interface ConsoleCardProps {
  logs: string[];
  botStatus: string;
  isOnline: boolean;
}

export default function ConsoleCard({ logs, botStatus, isOnline }: ConsoleCardProps) {
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">📟</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Console</h3>
        </div>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">Live</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-500">Offline</span>
            </>
          )}
        </div>
      </div>

      <div 
        ref={consoleRef}
        className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono h-48 overflow-y-auto border border-gray-700"
      >
        <div className="space-y-1">
          {logs.length === 0 ? (
            <div className="text-gray-500">
              {isOnline ? 'En attente d\'activité...' : 'Aucun historique disponible'}
            </div>
          ) : (
            logs.slice(-20).map((log, index) => (
              <div 
                key={index} 
                className={`${index === logs.slice(-20).length - 1 ? 'text-green-300' : 'text-green-400'} leading-relaxed`}
              >
                {log}
              </div>
            ))
          )}
          {isOnline && logs.length > 0 && (
            <div className="text-yellow-400 animate-pulse flex items-center space-x-1">
              <span>●</span>
              <span>En attente d'événements...</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>Last {logs.slice(-20).length} entries</span>
        <span>Auto-scroll enabled</span>
      </div>
    </div>
  );
}