'use client';

/**
 * AppShell — sidebar + topbar layout for all authenticated app pages.
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Send, Shield, Users, Clock, LayoutDashboard,
  ChevronRight, LogOut, Menu, X, Wallet, TrendingUp
} from 'lucide-react';
import { truncateAddress } from '../lib/stellar';
import type { Balance } from '../hooks/useWallet';

interface AppShellProps {
  children: React.ReactNode;
  publicKey: string;
  balances: Balance[];
  xlmUsdRate: number | null;
  onDisconnect: () => void;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pay', label: 'Send Payment', icon: Send },
  { href: '/escrow', label: 'Create Escrow', icon: Shield },
  { href: '/batch', label: 'Batch Payment', icon: Users },
  { href: '/history', label: 'History', icon: Clock },
];

export default function AppShell({ children, publicKey, balances, xlmUsdRate, onDisconnect }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const xlmBalance = balances.find(b => b.asset === 'XLM');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-white/5 fixed inset-y-0 left-0 z-40">
        <div className="flex flex-col h-full px-4 py-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-8 px-2">
            <Layers size={22} className="text-blue-400" />
            <span className="font-bold text-lg tracking-tight">Stellancer</span>
          </Link>

          {/* Nav */}
          <nav className="flex-1 flex flex-col gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                    active
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={17} className={active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} />
                  {label}
                  {active && <ChevronRight size={14} className="ml-auto text-blue-400/60" />}
                </Link>
              );
            })}
          </nav>

          {/* Wallet info */}
          <div className="mt-auto pt-4 border-t border-white/5">
            <div className="px-3 py-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={14} className="text-slate-500" />
                <span className="text-xs text-slate-500 font-mono">{truncateAddress(publicKey)}</span>
              </div>
              {xlmBalance && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    {parseFloat(xlmBalance.balance).toFixed(2)} XLM
                  </span>
                  {xlmUsdRate && (
                    <span className="text-xs text-slate-500">
                      ${(parseFloat(xlmBalance.balance) * xlmUsdRate).toFixed(2)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onDisconnect}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
            >
              <LogOut size={15} />
              Disconnect
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-60 bg-[#0d0d0d] border-r border-white/5 z-50 flex flex-col px-4 py-6 lg:hidden"
            >
              <div className="flex items-center justify-between mb-8 px-2">
                <Link href="/" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
                  <Layers size={22} className="text-blue-400" />
                  <span className="font-bold text-lg">Stellancer</span>
                </Link>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={17} />
                      {label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-auto pt-4 border-t border-white/5">
                <button
                  onClick={() => { onDisconnect(); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
                >
                  <LogOut size={15} />
                  Disconnect
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 h-14 border-b border-white/5 backdrop-blur-md bg-[#0a0a0a]/80">
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Page breadcrumb */}
          <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500">
            <Layers size={14} className="text-blue-400" />
            <span className="text-slate-600">/</span>
            <span className="text-white capitalize">
              {navItems.find(n => n.href === pathname)?.label ?? 'App'}
            </span>
          </div>

          {/* Right: rate + address */}
          <div className="flex items-center gap-3 ml-auto">
            {xlmUsdRate && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                <TrendingUp size={13} className="text-green-400" />
                <span>XLM <span className="text-white font-medium">${xlmUsdRate.toFixed(4)}</span></span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/5 text-xs font-mono text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {truncateAddress(publicKey)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-6 py-8 max-w-4xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
