'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Send, Info } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import AppShell from '../../components/AppShell';
import PaymentForm from '../../components/PaymentForm';

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

function PayPageContent() {
  const { publicKey, signFn, disconnect, balances, xlmUsdRate, isInitialized } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();

  const to = searchParams.get('to') ?? '';
  const amount = searchParams.get('amount') ?? '';
  const asset = searchParams.get('asset') ?? 'XLM';
  const addressError = to && !STELLAR_ADDRESS_RE.test(to)
    ? `Invalid Stellar address in payment link: "${to}"`
    : null;

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
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Send size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Send Payment</h1>
            <p className="text-slate-400 text-sm">Transfer XLM or tokens instantly on Stellar</p>
          </div>
        </div>

        {/* Info banner for payment links */}
        {to && !addressError && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 mb-6 text-sm text-blue-300">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span>Pre-filled from payment link. Review the details before sending.</span>
          </div>
        )}

        {addressError && (
          <div role="alert" className="flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-6 text-sm text-red-400">
            <Info size={16} className="mt-0.5 shrink-0" />
            {addressError}
          </div>
        )}

        {/* Form card */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          {!addressError && (
            <PaymentForm
              publicKey={publicKey}
              signFn={signFn}
              defaultTo={to}
              defaultAmount={amount}
              defaultAsset={asset !== 'XLM' ? asset : undefined}
            />
          )}
        </div>
      </motion.div>
    </AppShell>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <PayPageContent />
    </Suspense>
  );
}
