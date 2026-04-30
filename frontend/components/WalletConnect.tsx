'use client';

/**
 * WalletConnect — renders Freighter and Albedo connect buttons.
 * Requirements: 1.1, 1.4
 */

import { useState } from 'react';
import type { WalletType } from '../hooks/useWallet';

interface WalletConnectProps {
  onConnect: (walletType: WalletType) => Promise<void>;
  isConnecting: boolean;
  error: string | null;
}

export default function WalletConnect({ onConnect, isConnecting, error }: WalletConnectProps) {
  const [connectingType, setConnectingType] = useState<WalletType | null>(null);

  const handleConnect = async (type: WalletType) => {
    setConnectingType(type);
    await onConnect(type);
    setConnectingType(null);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col gap-3 w-full">
        {/* Freighter */}
        <button
          onClick={() => handleConnect('freighter')}
          disabled={isConnecting}
          className="group relative flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl active:scale-95 overflow-hidden"
        >
          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          <div className="relative flex items-center gap-3">
            {connectingType === 'freighter' ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Connecting to Freighter...</span>
              </>
            ) : (
              <>
                <FreighterIcon />
                <span>Connect Freighter</span>
              </>
            )}
          </div>
        </button>

        {/* Albedo */}
        <button
          onClick={() => handleConnect('albedo')}
          disabled={isConnecting}
          className="group relative flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl active:scale-95 overflow-hidden"
        >
          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          <div className="relative flex items-center gap-3">
            {connectingType === 'albedo' ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Connecting to Albedo...</span>
              </>
            ) : (
              <>
                <AlbedoIcon />
                <span>Connect Albedo</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Error message with better styling */}
      {error && (
        <div className="w-full p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-fade-in">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Connection Failed</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              {error.includes('Freighter') && (
                <a 
                  href="https://www.freighter.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                >
                  Install Freighter Extension
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security notice */}
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Your private key is never accessed or stored</span>
      </div>
    </div>
  );
}

function FreighterIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="10" opacity="0.3" />
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 14.93V15h-2v1.93A8.001 8.001 0 014.07 13H6v-2H4.07A8.001 8.001 0 0111 4.07V6h2V4.07A8.001 8.001 0 0119.93 11H18v2h1.93A8.001 8.001 0 0113 16.93z" />
    </svg>
  );
}

function AlbedoIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L2 19h20L12 2zm0 3.5L19.5 17h-15L12 5.5z" />
    </svg>
  );
}

