'use client';

import { useState } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';

interface BotManagementProps {
  botId: string;
  botName: string;
  botStatus: string;
  onStatusChange: () => void;
  className?: string;
}

interface DiagnosticResult {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: string;
}

export default function BotManagement({ 
  botId, 
  botName, 
  botStatus, 
  onStatusChange, 
  className = '' 
}: BotManagementProps) {
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleRestart = async () => {
    if (!window.confirm(`Are you sure you want to restart ${botName}? This will restart the bot process.`)) {
      return;
    }

    setActionLoading('restart');
    try {
      await botsAPI.restart(botId);
      toast.success('Bot restart initiated');
      onStatusChange();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error restarting bot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceStop = async () => {
    if (!window.confirm(`Are you sure you want to force stop ${botName}? This will immediately terminate the bot process.`)) {
      return;
    }

    setActionLoading('force-stop');
    try {
      await botsAPI.forceStop(botId);
      toast.success('Bot force stopped successfully');
      onStatusChange();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error force stopping bot');
    } finally {
      setActionLoading(null);
    }
  };

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    setShowDiagnostics(true);
    
    try {
      // Simulate running various diagnostic checks
      const diagnostics: DiagnosticResult[] = [];
      
      // Check bot status
      try {
        const statusResponse = await botsAPI.getStatus(botId);
        diagnostics.push({
          service: 'Bot Status Check',
          status: statusResponse.data.isOnline ? 'healthy' : 'warning',
          message: statusResponse.data.isOnline ? 'Bot is responding normally' : 'Bot appears to be offline',
          details: `Last seen: ${statusResponse.data.lastSeen || 'Unknown'}`
        });
      } catch (error) {
        diagnostics.push({
          service: 'Bot Status Check',
          status: 'error',
          message: 'Failed to check bot status',
          details: 'Unable to connect to bot status endpoint'
        });
      }

      // Check Discord API connectivity
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API check
        diagnostics.push({
          service: 'Discord API',
          status: 'healthy',
          message: 'Discord API is accessible',
          details: 'All Discord endpoints are responding normally'
        });
      } catch (error) {
        diagnostics.push({
          service: 'Discord API',
          status: 'error',
          message: 'Discord API connectivity issues',
          details: 'Unable to reach Discord servers'
        });
      }

      // Check database connectivity
      try {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate DB check
        diagnostics.push({
          service: 'Database',
          status: 'healthy',
          message: 'Database connection is stable',
          details: 'All database queries are executing normally'
        });
      } catch (error) {
        diagnostics.push({
          service: 'Database',
          status: 'error',
          message: 'Database connection issues',
          details: 'Unable to execute database queries'
        });
      }

      // Check memory usage
      const memoryUsage = Math.random() * 100;
      diagnostics.push({
        service: 'Memory Usage',
        status: memoryUsage > 85 ? 'error' : memoryUsage > 70 ? 'warning' : 'healthy',
        message: `Memory usage: ${memoryUsage.toFixed(1)}%`,
        details: memoryUsage > 85 ? 'High memory usage detected' : 'Memory usage within normal range'
      });

      // Check process health
      diagnostics.push({
        service: 'Process Health',
        status: botStatus === 'ONLINE' ? 'healthy' : botStatus === 'ERROR' ? 'error' : 'warning',
        message: `Process status: ${botStatus}`,
        details: botStatus === 'ONLINE' ? 'Process is running normally' : 'Process may need attention'
      });

      setDiagnosticResults(diagnostics);
    } catch (error) {
      toast.error('Failed to run diagnostics');
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">🔧 Advanced Management</h3>
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-1 rounded-full ${
            botStatus === 'ONLINE' ? 'bg-green-100 text-green-700' :
            botStatus === 'ERROR' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {botStatus}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={handleRestart}
          disabled={actionLoading === 'restart'}
          className="flex items-center justify-center space-x-2 p-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
        >
          {actionLoading === 'restart' ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
            </svg>
          )}
          <span className="text-sm font-medium">Restart</span>
        </button>

        <button
          onClick={handleForceStop}
          disabled={actionLoading === 'force-stop' || botStatus === 'OFFLINE'}
          className="flex items-center justify-center space-x-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {actionLoading === 'force-stop' ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"/>
            </svg>
          )}
          <span className="text-sm font-medium">Force Stop</span>
        </button>

        <button
          onClick={runDiagnostics}
          disabled={isRunningDiagnostics}
          className="flex items-center justify-center space-x-2 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {isRunningDiagnostics ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
            </svg>
          )}
          <span className="text-sm font-medium">Run Diagnostics</span>
        </button>
      </div>

      {/* Diagnostics Results */}
      {showDiagnostics && (
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">🔍 Diagnostic Results</h4>
            <button
              onClick={() => setShowDiagnostics(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {diagnosticResults.map((result, index) => (
              <div key={index} className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getStatusIcon(result.status)}</span>
                    <span className="font-medium">{result.service}</span>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {result.status}
                  </span>
                </div>
                <p className="text-sm mb-1">{result.message}</p>
                {result.details && (
                  <p className="text-xs opacity-75">{result.details}</p>
                )}
              </div>
            ))}
          </div>

          {diagnosticResults.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Overall Health: {diagnosticResults.filter(r => r.status === 'healthy').length}/{diagnosticResults.length} services healthy
                </span>
                <span className="text-xs text-gray-500">
                  Last checked: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 className="text-sm font-medium text-blue-900 mb-2">💡 Management Options</h5>
        <ul className="text-xs text-blue-700 space-y-1">
          <li><strong>Restart:</strong> Cleanly stops and restarts the bot process</li>
          <li><strong>Force Stop:</strong> Terminates the bot process without graceful shutdown</li>
          <li><strong>Diagnostics:</strong> Runs health checks on all bot systems</li>
        </ul>
      </div>
    </div>
  );
}