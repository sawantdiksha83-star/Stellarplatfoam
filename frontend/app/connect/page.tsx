'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Layers, Shield, Zap, Globe } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import type { WalletType } from '../../hooks/useWallet';

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

const perks = [
  { icon: Zap, text: 'Instant settlements on Stellar' },
  { icon: Shield, text: 'Non-custodial — your keys, your funds' },
  { icon: Globe, text: 'Works globally, sub-cent fees' },
];

export default function ConnectPage() {
  const { publicKey, connect, isConnecting, error, isInitialized } = useWallet();
  const router = useRouter();
  const [connectingType, setConnectingType] = useState<WalletType | null>(null);

  // Already connected → go straight to dashboard
  useEffect(() => {
    if (isInitialized && publicKey) router.replace('/dashboard');
  }, [publicKey, router, isInitialized]);

  const handleConnect = async (type: WalletType) => {
    setConnectingType(type);
    await connect(type);
    setConnectingType(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Minimal nav */}
      <nav className="px-6 py-4 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <Layers size={20} className="text-blue-400" />
          Stellancer
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          {/* Glow orb */}
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.1) 0%, transparent 70%)' }}
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Connect your wallet</h1>
              <p className="text-slate-400 text-sm">Choose a Stellar wallet to get started</p>
            </div>

            {/* Wallet buttons */}
            <div className="flex flex-col gap-3 mb-6">
              <button
                onClick={() => handleConnect('freighter')}
                disabled={isConnecting}
                className="group relative flex items-center gap-3 px-5 py-4 rounded-xl border border-white/10 hover:border-blue-500/40 bg-white/[0.03] hover:bg-blue-500/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-left overflow-hidden"
              >
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                  {connectingType === 'freighter'
                    ? <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    : <FreighterIcon />
                  }
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Freighter</p>
                  <p className="text-xs text-slate-500">Browser extension wallet</p>
                </div>
                <span className="text-xs text-slate-600 group-hover:text-slate-400 transition-colors">
                  {connectingType === 'freighter' ? 'Connecting…' : 'Connect →'}
                </span>
              </button>

              <button
                onClick={() => handleConnect('albedo')}
                disabled={isConnecting}
                className="group relative flex items-center gap-3 px-5 py-4 rounded-xl border border-white/10 hover:border-violet-500/40 bg-white/[0.03] hover:bg-violet-500/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-left overflow-hidden"
              >
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
                  {connectingType === 'albedo'
                    ? <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    : <AlbedoIcon />
                  }
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Albedo</p>
                  <p className="text-xs text-slate-500">Web-based Stellar wallet</p>
                </div>
                <span className="text-xs text-slate-600 group-hover:text-slate-400 transition-colors">
                  {connectingType === 'albedo' ? 'Connecting…' : 'Connect →'}
                </span>
              </button>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400"
              >
                <p className="font-medium mb-0.5">Connection failed</p>
                <p className="text-red-500/80 text-xs">{error}</p>
                {error.includes('Freighter') && (
                  <a
                    href="https://www.freighter.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Install Freighter →
                  </a>
                )}
              </motion.div>
            )}

            {/* Perks */}
            <div className="pt-6 border-t border-white/5 flex flex-col gap-2.5">
              {perks.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-xs text-slate-500">
                  <Icon size={13} className="text-slate-600 shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
