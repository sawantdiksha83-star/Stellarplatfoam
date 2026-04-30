'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, Info } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import AppShell from '../../components/AppShell';
import BatchPayment from '../../components/BatchPayment';

export default function BatchPage() {
  const { publicKey, signFn, disconnect, balances, xlmUsdRate, isInitialized } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !publicKey) router.replace('/connect');
  }, [publicKey, router, isInitialized]);

  if (!isInitialized || !publicKey || !signFn) return null;

  return (
    <AppShell publicKey={publicKey} balances={balances} xlmUsdRate={xlmUsdRate} onDisconnect={disconnect}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Users size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Batch Payment</h1>
            <p className="text-slate-400 text-sm">Pay multiple recipients in a single operation</p>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 mb-6 text-sm text-emerald-300">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>
            Each payment is processed independently. A failure on one recipient won't block the others.
          </span>
        </div>

        {/* Form card */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <BatchPayment publicKey={publicKey} signFn={signFn} />
        </div>
      </motion.div>
    </AppShell>
  );
}
