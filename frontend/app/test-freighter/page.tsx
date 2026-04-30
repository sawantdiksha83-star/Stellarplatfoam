'use client';

/**
 * Debug page to test Freighter API connection
 */

import { useState } from 'react';

export default function TestFreighterPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [publicKey, setPublicKey] = useState<string>('');

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testFreighterAPI = async () => {
    setLogs([]);
    addLog('Starting Freighter API test...');

    try {
      // Dynamic import to avoid SSR issues
      const freighterApi = await import('@stellar/freighter-api');
      addLog('✓ @stellar/freighter-api imported successfully');

      // Test isConnected
      addLog('Testing isConnected()...');
      const connectedResult = await freighterApi.isConnected();
      addLog(`isConnected result: ${JSON.stringify(connectedResult)}`);

      if (connectedResult.error) {
        addLog(`❌ Error: ${JSON.stringify(connectedResult.error)}`);
        return;
      }

      if (!connectedResult.isConnected) {
        addLog('❌ Freighter is not connected');
        return;
      }

      addLog('✓ Freighter is connected');

      // Test isAllowed
      addLog('Testing isAllowed()...');
      const allowedResult = await freighterApi.isAllowed();
      addLog(`isAllowed result: ${JSON.stringify(allowedResult)}`);

      // Test requestAccess (this should trigger the popup)
      addLog('Testing requestAccess()...');
      const accessResult = await freighterApi.requestAccess();
      addLog(`requestAccess result: ${JSON.stringify(accessResult)}`);

      if (accessResult.error) {
        addLog(`❌ Error requesting access: ${JSON.stringify(accessResult.error)}`);
        return;
      }

      if (!accessResult.address) {
        addLog('❌ No address returned from requestAccess');
        return;
      }

      addLog(`✓ Got address: ${accessResult.address}`);
      setPublicKey(accessResult.address);

    } catch (error) {
      addLog(`❌ Exception: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Freighter test error:', error);
    }
  };

  const testWindowObject = () => {
    setLogs([]);
    addLog('Checking window object for Freighter...');

    if (typeof window === 'undefined') {
      addLog('❌ Window is undefined (SSR)');
      return;
    }

    const w = window as any;
    addLog(`window.freighter: ${typeof w.freighter}`);
    addLog(`window.freighterApi: ${typeof w.freighterApi}`);
    addLog(`window.stellar: ${typeof w.stellar}`);
    
    if (w.freighter) {
      addLog(`✓ window.freighter exists`);
      addLog(`Methods: ${Object.keys(w.freighter).join(', ')}`);
    }
    
    if (w.freighterApi) {
      addLog(`✓ window.freighterApi exists`);
      addLog(`Methods: ${Object.keys(w.freighterApi).join(', ')}`);
    }

    if (w.stellar) {
      addLog(`✓ window.stellar exists`);
      addLog(`Properties: ${Object.keys(w.stellar).join(', ')}`);
    }

    if (!w.freighter && !w.freighterApi && !w.stellar) {
      addLog('❌ No Freighter objects found on window');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          Freighter API Debug
        </h1>

        <div className="space-y-4 mb-6">
          <button
            onClick={testWindowObject}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Window Object
          </button>

          <button
            onClick={testFreighterAPI}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 ml-4"
          >
            Test Freighter API
          </button>
        </div>

        {publicKey && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 rounded">
            <p className="font-semibold text-green-900 dark:text-green-100">
              Connected Public Key:
            </p>
            <p className="font-mono text-sm break-all text-green-800 dark:text-green-200">
              {publicKey}
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Console Logs
          </h2>
          <div className="space-y-1 font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                Click a button to start testing...
              </p>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`${
                    log.includes('❌')
                      ? 'text-red-600 dark:text-red-400'
                      : log.includes('✓')
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
