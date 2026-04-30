'use client';

/**
 * Client page — lists active escrows for the connected client with MilestoneCard per milestone.
 * Requirements: 3.4, 3.9, 4.1
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';
import NavBar from '../../components/NavBar';
import MilestoneCard from '../../components/MilestoneCard';
import { cancelEscrow } from '../../lib/contracts';
import type { Milestone } from '../../lib/contracts';

interface Escrow {
  id: bigint;
  freelancer: string;
  total: bigint;
  milestones: Milestone[];
}

/**
 * In a real app this would query an indexer or on-chain storage.
 * Here we use localStorage as a lightweight stand-in so the page is functional
 * without a backend. EscrowForm stores created escrows under "escrows".
 */
function loadEscrows(clientPublicKey: string): Escrow[] {
  try {
    const raw = localStorage.getItem('escrows');
    if (!raw) return [];
    const all: Escrow[] = JSON.parse(raw, (key, value) => {
      // Revive bigint fields serialised as strings with a "n" suffix
      if (typeof value === 'string' && /^\d+n$/.test(value)) {
        return BigInt(value.slice(0, -1));
      }
      return value;
    });
    return all.filter((e) => e.milestones.some((m) => !m.released));
  } catch {
    return [];
  }
}

export default function ClientPage() {
  const { publicKey, signFn, connect, disconnect, isConnecting, error, balances, xlmUsdRate, isInitialized } =
    useWallet();
  const router = useRouter();

  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [cancellingId, setCancellingId] = useState<bigint | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && !publicKey) {
      router.replace('/');
      return;
    }
    if (publicKey) {
      setEscrows(loadEscrows(publicKey));
    }
  }, [publicKey, router, isInitialized]);

  const handleMilestoneReleased = useCallback((escrowId: bigint, milestoneId: number) => {
    setEscrows((prev) =>
      prev.map((e) =>
        e.id === escrowId
          ? {
              ...e,
              milestones: e.milestones.map((m) =>
                m.id === milestoneId ? { ...m, released: true } : m
              ),
            }
          : e
      )
    );
  }, []);

  const handleCancel = useCallback(
    async (escrowId: bigint) => {
      if (!publicKey || !signFn) return;
      setCancellingId(escrowId);
      setCancelError(null);
      try {
        await cancelEscrow(publicKey, escrowId, signFn);
        setEscrows((prev) => prev.filter((e) => e.id !== escrowId));
      } catch (err) {
        setCancelError(err instanceof Error ? err.message : 'Cancel failed');
      } finally {
        setCancellingId(null);
      }
    },
    [publicKey, signFn]
  );

  if (!isInitialized) return null;
  if (!publicKey || !signFn) return null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-10 w-96 h-96 bg-green-300 dark:bg-green-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300 dark:bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <NavBar
        publicKey={publicKey}
        balances={balances}
        xlmUsdRate={xlmUsdRate}
        onDisconnect={disconnect}
      />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Active Escrows
          </h1>
        </div>

        {cancelError && (
          <div role="alert" className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400 animate-fade-in-up">
            {cancelError}
          </div>
        )}

        {escrows.length === 0 ? (
          <div className="card p-8 text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No active escrows found for your wallet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {escrows.map((escrow, index) => (
              <div
                key={escrow.id.toString()}
                className="card p-6 animate-fade-in-up hover:shadow-green-500/20 transition-all duration-500"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Escrow ID</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">
                      {escrow.id.toString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Freelancer:{' '}
                      <span className="font-mono">
                        {escrow.freelancer.slice(0, 6)}…{escrow.freelancer.slice(-4)}
                      </span>
                    </p>
                  </div>

                  {/* Cancel escrow — refunds all unreleased funds (Req 3.9) */}
                  <button
                    type="button"
                    onClick={() => handleCancel(escrow.id)}
                    disabled={cancellingId === escrow.id}
                    className="shrink-0 rounded-lg border-2 border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 text-xs font-medium px-3 py-1.5 transition-all transform hover:scale-105"
                  >
                    {cancellingId === escrow.id ? 'Cancelling…' : 'Cancel Escrow'}
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {escrow.milestones.map((milestone) => (
                    <MilestoneCard
                      key={milestone.id}
                      milestone={milestone}
                      escrowId={escrow.id}
                      publicKey={publicKey}
                      signFn={signFn}
                      isClient={true}
                      onReleased={(milestoneId) =>
                        handleMilestoneReleased(escrow.id, milestoneId)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
