'use client';

/**
 * NavBar — displays wallet info, balances, XLM/USD rate, and dark mode toggle.
 * Requirements: 1.3, 11.1, 13.1, 13.2
 */

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { truncateAddress } from '../lib/stellar';
import type { Balance } from '../hooks/useWallet';

interface NavBarProps {
  publicKey: string | null;
  balances: Balance[];
  xlmUsdRate: number | null;
  onDisconnect?: () => void;
}

export default function NavBar({ publicKey, balances, xlmUsdRate, onDisconnect }: NavBarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const xlmBalance = balances.find((b) => b.asset === 'XLM');
  const sacBalances = balances.filter((b) => b.asset !== 'XLM');

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand with animated gradient */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              Stellar Freelance
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* XLM/USD rate with pulse animation */}
            {xlmUsdRate !== null ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                  XLM ${xlmUsdRate.toFixed(4)}
                </span>
              </div>
            ) : (
              <span className="hidden sm:block text-xs text-gray-400 dark:text-gray-500">Rate unavailable</span>
            )}

            {/* Balances */}
            {publicKey && (
              <div className="flex items-center gap-2">
                {xlmBalance && (
                  <div className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      {parseFloat(xlmBalance.balance).toFixed(2)} XLM
                    </span>
                  </div>
                )}
                
                {sacBalances.map((b) => (
                  <div key={b.asset} className="hidden md:block px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                      {parseFloat(b.balance).toFixed(2)} {b.asset.split(':')[0]}
                    </span>
                  </div>
                ))}

                {/* Wallet address with copy functionality */}
                <div className="group relative px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer">
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {truncateAddress(publicKey)}
                  </span>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {publicKey}
                  </div>
                </div>

                {onDisconnect && (
                  <button
                    onClick={onDisconnect}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            )}

            {/* Dark mode toggle with smooth animation */}
            {mounted && (
              <button
                aria-label="Toggle dark mode"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 transform hover:scale-110 active:scale-95"
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71m12.02 0-.71-.71M6.34 6.34l-.71-.71M12 5a7 7 0 100 14A7 7 0 0012 5z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

