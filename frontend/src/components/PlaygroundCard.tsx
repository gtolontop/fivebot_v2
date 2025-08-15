'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PlaygroundCardProps {
  botId: string;
  botStatus: string;
  isOnline: boolean;
}

export default function PlaygroundCard({ botId, botStatus, isOnline }: PlaygroundCardProps) {
  const router = useRouter();
  const [quickCommand, setQuickCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const quickCommands = [
    { cmd: '/ping', desc: 'Test responsiveness' },
    { cmd: '/help', desc: 'Show commands' },
    { cmd: '/stats', desc: 'Bot statistics' },
  ];

  const executeQuickCommand = async (command: string) => {
    if (!isOnline) return;
    
    setIsExecuting(true);
    setQuickCommand(command);
    
    try {
      // Simulate command execution
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      const responses = {
        '/ping': 'Pong! 🏓 (24ms)',
        '/help': 'Commands list displayed',
        '/stats': `Active on ${Math.floor(Math.random() * 5) + 1} servers`,
      };
      
      setLastResult(responses[command as keyof typeof responses] || 'Command executed');
    } catch (error) {
      setLastResult('Error executing command');
    } finally {
      setIsExecuting(false);
    }
  };

  const openFullPlayground = () => {
    router.push(`/bots/${botId}/playground`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🎮</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Playground</h3>
        </div>
        <button
          onClick={openFullPlayground}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Open Full Playground →
        </button>
      </div>

      {isOnline ? (
        <div className="space-y-4">
          {/* Quick Commands */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Test</h4>
            <div className="grid grid-cols-1 gap-2">
              {quickCommands.map((item) => (
                <button
                  key={item.cmd}
                  onClick={() => executeQuickCommand(item.cmd)}
                  disabled={isExecuting}
                  className="flex items-center justify-between p-2 text-left border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <div>
                    <span className="font-mono text-sm text-blue-600">{item.cmd}</span>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  {isExecuting && quickCommand === item.cmd && (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Last Result */}
          {lastResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span className="text-sm text-green-800 font-medium">Result:</span>
              </div>
              <p className="text-sm text-green-700 mt-1">{lastResult}</p>
            </div>
          )}

          {/* Features Preview */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Available Features</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <div className="text-lg mb-1">⚡</div>
                <span className="text-xs text-gray-600">Commands</span>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <div className="text-lg mb-1">🎭</div>
                <span className="text-xs text-gray-600">Simulation</span>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <div className="text-lg mb-1">🔍</div>
                <span className="text-xs text-gray-600">Debug</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-gray-400 text-xl">🎮</span>
          </div>
          <p className="text-sm text-gray-500">Bot must be online to use playground</p>
        </div>
      )}
    </div>
  );
}