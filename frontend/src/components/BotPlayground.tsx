'use client';

import { useState, useRef, useEffect } from 'react';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';

interface PlaygroundProps {
  botId: string;
  botStatus: string;
  guilds: any[];
}

interface TestResult {
  id: string;
  command: string;
  success: boolean;
  response: string;
  timestamp: Date;
  executionTime: number;
}

export default function BotPlayground({ botId, botStatus, guilds }: PlaygroundProps) {
  const [activeTab, setActiveTab] = useState<'commands' | 'simulation' | 'debug'>('commands');
  const [commandInput, setCommandInput] = useState('');
  const [selectedGuild, setSelectedGuild] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Simulation states
  const [simulationType, setSimulationType] = useState<'member_join' | 'member_leave' | 'message'>('member_join');
  const [simulationData, setSimulationData] = useState({
    username: 'TestUser#1234',
    userId: '123456789',
    messageContent: 'Hello everyone!',
  });

  // Debug states
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const debugRef = useRef<HTMLDivElement>(null);

  // Available commands for testing
  const availableCommands = [
    { name: '/ping', description: 'Test bot responsiveness' },
    { name: '/help', description: 'Show available commands' },
    { name: '/welcome', description: 'Test welcome message' },
    { name: '/stats', description: 'Show bot statistics' },
    { name: '/config', description: 'Show current configuration' },
  ];

  useEffect(() => {
    if (debugRef.current) {
      debugRef.current.scrollTop = debugRef.current.scrollHeight;
    }
  }, [debugLogs]);

  const executeCommand = async () => {
    if (!commandInput.trim() || !botStatus === 'ONLINE') return;

    setIsExecuting(true);
    const startTime = Date.now();

    try {
      // Simulate command execution
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
      
      const executionTime = Date.now() - startTime;
      const mockResponses = {
        '/ping': 'Pong! 🏓 Bot is responding normally.',
        '/help': 'Available commands: /ping, /help, /welcome, /stats, /config',
        '/welcome': 'Welcome message test completed. Check #general channel.',
        '/stats': `Bot Statistics:\n• Servers: ${guilds.length}\n• Uptime: 2h 34m\n• Memory: 64MB`,
        '/config': 'Current configuration loaded successfully.',
      };

      const response = mockResponses[commandInput as keyof typeof mockResponses] || 
                     `Command "${commandInput}" executed successfully.`;

      const result: TestResult = {
        id: Date.now().toString(),
        command: commandInput,
        success: Math.random() > 0.1, // 90% success rate
        response,
        timestamp: new Date(),
        executionTime,
      };

      setTestResults(prev => [result, ...prev.slice(0, 19)]); // Keep last 20 results
      
      if (result.success) {
        toast.success(`Command executed in ${executionTime}ms`);
        addDebugLog(`✅ ${commandInput} executed successfully (${executionTime}ms)`);
      } else {
        toast.error('Command execution failed');
        addDebugLog(`❌ ${commandInput} failed: Simulated error`);
      }
    } catch (error) {
      toast.error('Failed to execute command');
      addDebugLog(`❌ ${commandInput} error: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const simulateEvent = async () => {
    if (botStatus !== 'ONLINE') return;

    setIsExecuting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const eventMessages = {
        member_join: `Simulated: ${simulationData.username} joined the server`,
        member_leave: `Simulated: ${simulationData.username} left the server`,
        message: `Simulated message from ${simulationData.username}: "${simulationData.messageContent}"`,
      };

      const message = eventMessages[simulationType];
      addDebugLog(`🎭 ${message}`);
      toast.success('Event simulated successfully');

      // Add to test results
      const result: TestResult = {
        id: Date.now().toString(),
        command: `Simulate: ${simulationType}`,
        success: true,
        response: message,
        timestamp: new Date(),
        executionTime: 1000,
      };

      setTestResults(prev => [result, ...prev.slice(0, 19)]);
    } catch (error) {
      toast.error('Simulation failed');
      addDebugLog(`❌ Simulation failed: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
  };

  if (botStatus !== 'ONLINE') {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎮 Bot Playground</h3>
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">⚠️</div>
          <p>Bot must be online to use the playground</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">🎮 Bot Playground</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Interactive Mode</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'commands', label: '⚡ Commands', icon: '⚡' },
          { id: 'simulation', label: '🎭 Simulation', icon: '🎭' },
          { id: 'debug', label: '🔍 Debug', icon: '🔍' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Commands Tab */}
      {activeTab === 'commands' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Commands</h4>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {availableCommands.map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => setCommandInput(cmd.name)}
                  className="text-left p-2 border rounded-lg hover:bg-gray-50 text-sm"
                  title={cmd.description}
                >
                  <div className="font-mono text-blue-600">{cmd.name}</div>
                  <div className="text-xs text-gray-500">{cmd.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Command
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Enter command (e.g., /ping)"
                className="flex-1 input-field"
                onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
              />
              <button
                onClick={executeCommand}
                disabled={isExecuting || !commandInput.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {isExecuting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Running...
                  </div>
                ) : (
                  'Execute'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Tab */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Type
            </label>
            <select
              value={simulationType}
              onChange={(e) => setSimulationType(e.target.value as any)}
              className="input-field"
            >
              <option value="member_join">Member Join</option>
              <option value="member_leave">Member Leave</option>
              <option value="message">Message Sent</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={simulationData.username}
                onChange={(e) => setSimulationData(prev => ({ ...prev, username: e.target.value }))}
                className="input-field"
                placeholder="TestUser#1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={simulationData.userId}
                onChange={(e) => setSimulationData(prev => ({ ...prev, userId: e.target.value }))}
                className="input-field"
                placeholder="123456789"
              />
            </div>
          </div>

          {simulationType === 'message' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Content
              </label>
              <input
                type="text"
                value={simulationData.messageContent}
                onChange={(e) => setSimulationData(prev => ({ ...prev, messageContent: e.target.value }))}
                className="input-field"
                placeholder="Hello everyone!"
              />
            </div>
          )}

          <button
            onClick={simulateEvent}
            disabled={isExecuting}
            className="btn-secondary disabled:opacity-50"
          >
            {isExecuting ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                Simulating...
              </div>
            ) : (
              'Simulate Event'
            )}
          </button>
        </div>
      )}

      {/* Debug Tab */}
      {activeTab === 'debug' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Debug Console</h4>
            <button
              onClick={clearDebugLogs}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear Logs
            </button>
          </div>
          
          <div
            ref={debugRef}
            className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono h-64 overflow-y-auto"
          >
            {debugLogs.length === 0 ? (
              <div className="text-gray-500">Debug logs will appear here...</div>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Test Results</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {testResults.map((result) => (
              <div
                key={result.id}
                className={`p-3 rounded-lg border ${
                  result.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {result.success ? '✅' : '❌'}
                    </span>
                    <span className="font-mono text-sm font-medium">
                      {result.command}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {result.executionTime}ms
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {result.response}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {result.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}