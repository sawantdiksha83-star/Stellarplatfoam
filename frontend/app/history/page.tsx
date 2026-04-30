'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, RefreshCw } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import AppShell from '../../components/AppShell';
import TxHistory from '../../components/TxHistory';
import { fetchTransactionHistory } from '../../lib/stellar';
import type { TxRecord } from '../../components/TxHistory';

function mapToTxRecord(raw: any): TxRecord {
  if (raw.paymentId !== undefined) {
    return {
      paymentId: raw.paymentId,
      sender: raw.sender ?? '—',
      recipient: raw.recipient ?? '—',
      amount: raw.amount ?? '—',
      asset: raw.asset ?? '—',
      status: raw.status ?? '—',
    };
  }
  return {
    paymentId: raw.id ?? raw.hash ?? '—',
    sender: raw.source_account ?? '—',
    recipient: raw.to ?? '—',
    amount: raw.amount ?? '—',
    asset: raw.asset_type === 'native' ? 'XLM' : raw.asset_code ?? '—',
    status: raw.successful ? 'confirmed' : 'failed',
  };
}

export default function HistoryPage() {
  const { publicKey, disconnect, balances, xlmUsdRate, isInitialized } = useWallet();
  const router = useRouter();

  const [records, setRecords] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && !publicKey) router.replace('/connect');
  }, [publicKey, router, isInitialized]);

  const loadHistory = useCallback(async (cursor?: string) => {
    if (!publicKey) return;
    setLoading(true);
    setFetchError(null);
    try {
      const { records: raw, nextCursor: nc } = await fetchTransactionHistory(publicKey, cursor);
      const mapped = raw.map(mapToTxRecord);
      setRecords(prev => cursor ? [...prev, ...mapped] : mapped);
      setNextCursor(nc);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) loadHistory();
  }, [publicKey, loadHistory]);

  if (!isInitialized || !publicKey) return null;

  return (
    <AppShell publicKey={publicKey} balances={balances} xlmUsdRate={xlmUsdRate} onDisconnect={disconnect}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Clock size={20} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Transaction History</h1>
              <p className="text-slate-400 text-sm">Your on-chain payment records</p>
            </div>
          </div>
          <button
            onClick={() => loadHistory()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 text-sm text-slate-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {fetchError && (
          <div role="alert" className="mb-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400">
            {fetchError}
          </div>
        )}

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <TxHistory records={records} />
        </div>

        {nextCursor && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => loadHistory(nextCursor)}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl border border-white/10 hover:border-blue-500/30 text-sm text-slate-400 hover:text-white transition-all disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </motion.div>
    </AppShell>
  );
}
