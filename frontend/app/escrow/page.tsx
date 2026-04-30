'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Info } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import AppShell from '../../components/AppShell';
import EscrowForm from '../../components/EscrowForm';

export default function EscrowPage() {
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
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Shield size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create Escrow</h1>
            <p className="text-slate-400 text-sm">Lock funds in a milestone-based smart contract</p>
          </div>
        </div>

        {/* How it works */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 mb-6 text-sm text-violet-300">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>
            Funds are held on-chain until each milestone is approved. The freelancer can only
            withdraw after you release each milestone.
          </span>
        </div>

        {/* Form card */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <EscrowForm publicKey={publicKey} signFn={signFn} />
        </div>
      </motion.div>
    </AppShell>
  );
}
