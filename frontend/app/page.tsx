'use client';

import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Zap, Shield, Globe, BarChart3, GitBranch, Clock,
  ArrowRight, ChevronRight, Layers, Lock, Coins
} from 'lucide-react';
import Link from 'next/link';

/* ─── Animation helpers ─────────────────────────────────── */
function FadeUp({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Feature card data ─────────────────────────────────── */
const features = [
  {
    icon: Zap,
    title: 'Instant Settlements',
    desc: 'Payments clear in 3–5 seconds on Stellar. No waiting, no batching delays.',
    span: 'col-span-1',
  },
  {
    icon: Shield,
    title: 'Smart Escrow',
    desc: 'Funds locked on-chain until milestones are approved. Dispute resolution built in.',
    span: 'col-span-1 md:col-span-2',
    accent: true,
  },
  {
    icon: BarChart3,
    title: 'Milestone Tracking',
    desc: 'Break projects into verifiable stages. Release funds incrementally as work is delivered.',
    span: 'col-span-1',
  },
  {
    icon: Globe,
    title: 'Global & Borderless',
    desc: 'Pay anyone, anywhere. XLM and USDC supported. Sub-cent transaction fees.',
    span: 'col-span-1',
  },
  {
    icon: GitBranch,
    title: 'Batch Payments',
    desc: 'Pay multiple freelancers in a single transaction. Perfect for agencies.',
    span: 'col-span-1',
  },
  {
    icon: Clock,
    title: 'Full Audit Trail',
    desc: 'Every action is logged on-chain. Immutable, transparent, always verifiable.',
    span: 'col-span-1',
  },
];

/* ─── How it works steps ────────────────────────────────── */
const steps = [
  { n: '01', title: 'Connect Wallet', desc: 'Link Freighter or Albedo in one click. No sign-up required.' },
  { n: '02', title: 'Create Contract', desc: 'Define milestones, amounts, and deadlines on-chain.' },
  { n: '03', title: 'Fund Escrow', desc: 'Client deposits funds. Smart contract holds them securely.' },
  { n: '04', title: 'Get Paid', desc: 'Approve milestones, release funds instantly to the freelancer.' },
];

/* ─── Main page ─────────────────────────────────────────── */
export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const orbY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const orbScale = useTransform(scrollYProgress, [0, 1], [1, 1.3]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <NavBar />

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
        {/* Parallax orb */}
        <motion.div
          style={{ y: orbY, scale: orbScale }}
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          aria-hidden
        >
          <div className="w-full h-full rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.18)_0%,rgba(59,130,246,0.04)_50%,transparent_70%)]" />
        </motion.div>

        {/* Noise grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
          aria-hidden
        />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium mb-8 tracking-wide"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Built on Stellar · Mainnet Live
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Freelance payments
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 glow-blue">
              without the friction.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Escrow, milestones, and instant settlements — all on-chain.
            No middlemen. No chargebacks. No waiting.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/connect"
              className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.03]"
              style={{ boxShadow: '0 0 24px rgba(59,130,246,0.35)' }}
            >
              Launch App
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-semibold text-sm transition-all duration-200 hover:bg-white/5"
            >
              See how it works
              <ChevronRight size={16} />
            </a>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" aria-hidden />
      </section>

      {/* ── Features (Bento Grid) ── */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              Everything you need.
              <br />
              <span className="text-slate-500">Nothing you don't.</span>
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <FadeUp
                key={f.title}
                delay={i * 0.08}
                className={`${f.span} group relative p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent hover:from-white/[0.06] transition-all duration-300 card-glow ${
                  f.accent ? 'md:row-span-2' : ''
                }`}
              >
                <div className={`flex ${f.accent ? 'flex-col h-full' : 'flex-col'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/15 transition-colors">
                      <f.icon size={20} strokeWidth={2} />
                    </div>
                    <h3 className="text-lg font-semibold">{f.title}</h3>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative py-24 px-6 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              How it works
            </h2>
            <p className="text-slate-400 text-lg">Four steps. Zero complexity.</p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <FadeUp key={s.n} delay={i * 0.1} className="relative">
                <div className="flex flex-col items-start p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300">
                  <div className="text-5xl font-bold text-blue-500/20 mb-3">{s.n}</div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-[1px] bg-gradient-to-r from-white/10 to-transparent" aria-hidden />
                )}
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeUp>
            <div className="relative p-12 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/20 to-transparent overflow-hidden">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)] pointer-events-none" aria-hidden />

              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                  Ready to get started?
                </h2>
                <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
                  Connect your wallet and start accepting payments in seconds.
                </p>
                <Link
                  href="/connect"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-base transition-all duration-200 hover:scale-[1.03]"
                  style={{ boxShadow: '0 0 32px rgba(59,130,246,0.4)' }}
                >
                  Launch App
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ─── NavBar ────────────────────────────────────────────── */
function NavBar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md bg-[#0a0a0a]/80 border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Layers size={24} className="text-blue-400" />
          Stellancer
        </Link>
        <div className="flex items-center gap-6">
          <a href="#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors">
            How it works
          </a>
          <Link
            href="/connect"
            className="px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium transition-colors border border-blue-500/20"
          >
            Launch App
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

/* ─── Footer ────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-blue-400" />
          <span className="font-semibold text-white">Stellancer</span>
          <span className="mx-2">·</span>
          <span>Built on Stellar</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            Docs
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            GitHub
          </a>
          <span>© 2026</span>
        </div>
      </div>
    </footer>
  );
}
