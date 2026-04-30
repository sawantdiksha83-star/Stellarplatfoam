'use client';

/**
 * Activity page — real-time contract event feed via SSE.
 * Requirements: 8.1, 8.2, 8.3
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';
import NavBar from '../../components/NavBar';
import ActivityFeed from '../../components/ActivityFeed';

export default function ActivityPage() {
  const { publicKey, connect, disconnect, isConnecting, error, balances, xlmUsdRate } =
    useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!publicKey) {
      router.replace('/');
    }
  }, [publicKey, router]);

  if (!publicKey) return null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-300 dark:bg-cyan-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-300 dark:bg-teal-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <NavBar
        publicKey={publicKey}
        balances={balances}
        xlmUsdRate={xlmUsdRate}
        onDisconnect={disconnect}
      />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl blur-md opacity-50 animate-pulse"></div>
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Live Activity
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Real-time contract events</p>
          </div>
        </div>
        <div className="animate-fade-in-up animation-delay-200">
          <ActivityFeed />
        </div>
      </main>
    </div>
  );
}
