'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Send, Shield, Users, Clock, ArrowRight, TrendingUp } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import AppShell from '../../components/AppShell';

const quickActions = [
  {
    href: '/pay',
    label: 'Send Payment',
    desc: 'Instant XLM transfer to any Stellar address',
    icon: Send,
    color: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    iconColor: 'text-blue-400',
  },
  {
    href: '/escrow',
    label: 'Create Escrow',
    desc: 'Lock funds in milestone-based smart contract',
    icon: Shield,
    color: 'from-violet-500/10 to-violet-600/5',
    border: 'border-violet-500/20 hover:border-violet-500/40',
    iconColor: 'text-violet-400',
  },
  {
    href: '/batch',
    label: 'Batch Payment',
    desc: 'Pay multiple freelancers in one transaction',
    icon: Users,
    color: 'from-emerald-500/10 to-emerald-600/5',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    iconColor: 'text-emerald-400',
  },
  {
    href: '/history',
    label: 'View History',
    desc: 'Browse and export your transaction records',
    icon: Clock,
    color: 'from-amber-500/10 to-amber-600/5',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    iconColor: 'text-amber-400',
  },
];

export default function DashboardPage() {
  const { publicKey, signFn, disconnect, isConnecting, error, balances, xlmUsdRate, isInitialized } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !publicKey) router.replace('/connect');
  }, [publicKey, router, isInitialized]);

  // Show spinner while session is being restored
  if (!isInitialized) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!publicKey || !signFn) return null;

  const xlmBalance = balances.find(b => b.asset === 'XLM');

  return (
    <AppShell publicKey={publicKey} balances={balances} xlmUsdRate={xlmUsdRate} onDisconnect={disconnect}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-slate-400 text-sm">Welcome back. Here's your overview.</p>
      </motion.div>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-8 p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-blue-500/5 to-transparent"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Total Balance</p>
            <p className="text-4xl font-bold">
              {xlmBalance ? parseFloat(xlmBalance.balance).toFixed(2) : '0.00'}
              <span className="text-xl text-slate-400 ml-2">XLM</span>
            </p>
            {xlmBalance && xlmUsdRate && (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                <TrendingUp size={13} className="text-green-400" />
                ≈ ${(parseFloat(xlmBalance.balance) * xlmUsdRate).toFixed(2)} USD
              </p>
            )}
          </div>
          <div className="px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
            Live
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-2"
      >
        <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map(({ href, label, desc, icon: Icon, color, border, iconColor }, i) => (
            <motion.div
              key={href}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 + i * 0.06 }}
            >
              <Link
                href={href}
                className={`group flex items-start gap-4 p-5 rounded-xl border bg-gradient-to-br ${color} ${border} transition-all duration-200 hover:scale-[1.02]`}
              >
                <div className={`mt-0.5 ${iconColor}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-0.5">{label}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                </div>
                <ArrowRight size={15} className="text-slate-600 group-hover:text-slate-400 mt-0.5 transition-colors shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AppShell>
  );
}
