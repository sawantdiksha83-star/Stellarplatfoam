'use client';

/**
 * MilestoneCard — displays a single milestone with release and dispute actions.
 * Requirements: 3.4, 3.6, 3.7, 4.1
 */

import { useState } from 'react';
import { releaseMilestone, disputeEscrow } from '../lib/contracts';
import type { Milestone, SignFn } from '../lib/contracts';

interface MilestoneCardProps {
  milestone: Milestone;
  escrowId: bigint;
  /** Connected wallet public key (client or freelancer) */
  publicKey: string;
  signFn: SignFn;
  /** Whether the connected wallet is the client (can release) */
  isClient: boolean;
  onReleased?: (milestoneId: number) => void;
  onDisputed?: (escrowId: bigint) => void;
}

export default function MilestoneCard({
  milestone,
  escrowId,
  publicKey,
  signFn,
  isClient,
  onReleased,
  onDisputed,
}: MilestoneCardProps) {
  const [releaseStatus, setReleaseStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [disputeStatus, setDisputeStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  // Treat local success as released even before parent re-fetches
  const isReleased = milestone.released || releaseStatus === 'success';

  async function handleRelease() {
    setReleaseStatus('pending');
    setReleaseError(null);
    try {
      await releaseMilestone(publicKey, escrowId, milestone.id, signFn);
      setReleaseStatus('success');
      onReleased?.(milestone.id);
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : 'Release failed');
      setReleaseStatus('error');
    }
  }

  async function handleDispute() {
    setDisputeStatus('pending');
    setDisputeError(null);
    try {
      await disputeEscrow(publicKey, escrowId, signFn);
      setDisputeStatus('success');
      onDisputed?.(escrowId);
    } catch (err) {
      setDisputeError(err instanceof Error ? err.message : 'Dispute failed');
      setDisputeStatus('error');
    }
  }

  // Format i128 bigint as human-readable (7 decimal places)
  function formatAmount(amount: bigint): string {
    const divisor = BigInt(10_000_000);
    const whole = amount / divisor;
    const remainder = amount % divisor;
    const dec = remainder.toString().padStart(7, '0').replace(/0+$/, '') || '0';
    return `${whole}.${dec}`;
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Milestone #{milestone.id + 1}
          </span>
          <p className="text-sm text-gray-900 dark:text-white">{milestone.description}</p>
        </div>

        {/* Released badge */}
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
            isReleased
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}
        >
          {isReleased ? 'Released' : 'Pending'}
        </span>
      </div>

      {/* Amount */}
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Amount:{' '}
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatAmount(milestone.amount)}
        </span>
      </p>

      {/* Actions */}
      {!isReleased && (
        <div className="flex gap-2 flex-wrap">
          {/* Release — only client can release (Req 3.4, 3.5) */}
          {isClient && (
            <button
              type="button"
              onClick={handleRelease}
              disabled={releaseStatus === 'pending'}
              className="rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 transition-colors"
            >
              {releaseStatus === 'pending' ? 'Releasing…' : 'Release'}
            </button>
          )}

          {/* Dispute — client or freelancer (Req 4.1) */}
          <button
            type="button"
            onClick={handleDispute}
            disabled={disputeStatus === 'pending'}
            className="rounded-lg border border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 text-xs font-medium px-3 py-1.5 transition-colors"
          >
            {disputeStatus === 'pending' ? 'Raising dispute…' : 'Dispute'}
          </button>
        </div>
      )}

      {/* Inline feedback */}
      {releaseStatus === 'error' && releaseError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">{releaseError}</p>
      )}
      {disputeStatus === 'error' && disputeError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">{disputeError}</p>
      )}
      {disputeStatus === 'success' && (
        <p role="status" className="text-xs text-orange-600 dark:text-orange-400">
          Dispute raised.
        </p>
      )}
    </div>
  );
}
