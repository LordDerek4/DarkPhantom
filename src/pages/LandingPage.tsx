import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MessageSquare, Users, Compass, Zap, Shield, Hash,
  ArrowRight, Check, ChevronDown, Menu, X,
} from 'lucide-react'
import { AppLogo } from '@/components/ui/AppLogo'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: '/support' },
]

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Real-time Messaging',
    desc: 'Instant messages, replies, reactions, and threads — everything you need for fluid conversations.',
    color: 'from-pulse-brand/20 to-blue-500/10',
    iconColor: 'text-pulse-brand',
  },
  {
    icon: Users,
    title: 'Communities',
    desc: 'Build your own server with custom channels, roles, and invite codes for your community.',
    color: 'from-red-500/20 to-pink-500/10',
    iconColor: 'text-red-400',
  },
  {
    icon: Compass,
    title: 'Discover',
    desc: 'Browse trending communities by category and find your people across gaming, music, tech and more.',
    color: 'from-green-500/20 to-teal-500/10',
    iconColor: 'text-green-400',
  },
  {
    icon: Hash,
    title: 'Organised Channels',
    desc: 'Text, announcement, and voice channels grouped into categories for a clean, structured experience.',
    color: 'from-yellow-500/20 to-orange-500/10',
    iconColor: 'text-yellow-400',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    desc: 'Powered by Firebase — messages and presence updates reach everyone in under 100ms.',
    color: 'from-orange-500/20 to-red-500/10',
    iconColor: 'text-orange-400',
  },
  {
    icon: Shield,
    title: 'Private & Secure',
    desc: 'Your data is protected by Firestore security rules. Private servers are invite-only.',
    color: 'from-blue-500/20 to-cyan-500/10',
    iconColor: 'text-blue-400',
  },
]

const PRICING_FEATURES = [
  'Unlimited servers & channels',
  'Unlimited messages',
  'Up to 500 members per server',
  'File sharing up to 8 MB',
  'Community discovery',
  'Invite links & codes',
  'Custom roles & permissions',
  'Real-time presence & notifications',
]

function NavBar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-pulse-bg-primary/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/">
          <AppLogo size={32} textClassName="text-lg" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(l =>
            l.href.startsWith('#') ? (
              <a key={l.label} href={l.href} className="text-sm text-pulse-text-muted hover:text-white transition-colors">{l.label}</a>
            ) : (
              <Link key={l.label} to={l.href} className="text-sm text-pulse-text-muted hover:text-white transition-colors">{l.label}</Link>
            )
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth" className="text-sm text-pulse-text-muted hover:text-white transition-colors px-3 py-1.5">Sign In</Link>
          <Link to="/auth" className="text-sm bg-pulse-brand hover:bg-pulse-brand-hover text-white font-semibold px-4 py-2 rounded-xl transition-colors">
            Get Started
          </Link>
        </div>

        <button onClick={() => setOpen(v => !v)} className="md:hidden text-pulse-text-muted hover:text-white">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-pulse-bg-secondary border-t border-white/5 px-6 py-4 space-y-3">
          {NAV_LINKS.map(l =>
            l.href.startsWith('#') ? (
              <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="block text-sm text-pulse-text-muted hover:text-white py-1.5">{l.label}</a>
            ) : (
              <Link key={l.label} to={l.href} onClick={() => setOpen(false)} className="block text-sm text-pulse-text-muted hover:text-white py-1.5">{l.label}</Link>
            )
          )}
          <div className="pt-2 flex flex-col gap-2">
            <Link to="/auth" className="block text-center text-sm text-pulse-text-muted border border-white/10 rounded-xl py-2">Sign In</Link>
            <Link to="/auth" className="block text-center text-sm bg-pulse-brand text-white font-semibold rounded-xl py-2">Get Started — £3.99</Link>
          </div>
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="bg-pulse-bg-primary border-t border-white/5 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <AppLogo size={28} textClassName="text-base" className="mb-3" />
            <p className="text-sm text-pulse-text-muted leading-relaxed">The community platform built for everyone.</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-pulse-text-muted mb-3">Product</p>
            <div className="space-y-2">
              <a href="#features" className="block text-sm text-pulse-text-muted hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="block text-sm text-pulse-text-muted hover:text-white transition-colors">Pricing</a>
              <Link to="/about" className="block text-sm text-pulse-text-muted hover:text-white transition-colors">About</Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-pulse-text-muted mb-3">Help</p>
            <div className="space-y-2">
              <Link to="/support" className="block text-sm text-pulse-text-muted hover:text-white transition-colors">Support</Link>
              <Link to="/faq" className="block text-sm text-pulse-text-muted hover:text-white transition-colors">FAQ</Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-pulse-text-muted mb-3">Legal</p>
            <div className="space-y-2">
              <Link to="/privacy" className="block text-sm text-pulse-text-muted hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block text-sm text-pulse-text-muted hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-pulse-text-muted">© {new Date().getFullYear()} AevixChat. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-xs text-pulse-text-muted hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="text-xs text-pulse-text-muted hover:text-white transition-colors">Terms</Link>
            <Link to="/support" className="text-xs text-pulse-text-muted hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-pulse-bg-tertiary text-white">
      <NavBar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pulse-brand/10 via-transparent to-red-500/5 pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-pulse-brand/5 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pulse-brand/15 border border-pulse-brand/25 text-pulse-brand text-xs font-semibold mb-6">
              <Zap size={11} />
              Now in early access
            </span>

            <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] mb-6">
              Your community,<br />
              <span className="bg-gradient-to-r from-pulse-brand via-red-400 to-orange-400 bg-clip-text text-transparent">
                your way.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-pulse-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
              AevixChat brings your friends, communities, and conversations together in one beautiful, fast, and free platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/auth"
                className="flex items-center gap-2 bg-pulse-brand hover:bg-pulse-brand-hover text-white font-bold px-7 py-3.5 rounded-2xl transition-colors text-base shadow-lg shadow-pulse-brand/25"
              >
                Get Started — £3.99
                <ArrowRight size={18} />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-semibold px-7 py-3.5 rounded-2xl transition-colors text-base border border-white/10"
              >
                See Features
                <ChevronDown size={18} />
              </a>
            </div>
          </motion.div>

          {/* App preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-16 rounded-2xl bg-pulse-bg-secondary border border-white/10 shadow-2xl overflow-hidden mx-auto max-w-3xl"
          >
            <div className="bg-pulse-bg-primary px-4 py-3 flex items-center gap-2 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 text-center text-xs text-pulse-text-muted">aevixchat.com</div>
            </div>
            <div className="flex h-52 md:h-72">
              <div className="w-14 bg-pulse-bg-primary flex flex-col items-center gap-2 py-3">
                {['G', 'M', 'T'].map((l, i) => (
                  <div key={i} className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-pulse-brand' : 'bg-white/10'}`}>{l}</div>
                ))}
              </div>
              <div className="w-44 bg-pulse-bg-secondary border-r border-white/5 px-2 py-3 flex flex-col gap-1">
                <div className="px-2 py-1.5 rounded-lg bg-white/5 flex items-center gap-1.5">
                  <Hash size={13} className="text-pulse-text-muted" />
                  <span className="text-xs text-white font-medium">general</span>
                </div>
                {['announcements', 'off-topic', 'resources'].map(c => (
                  <div key={c} className="px-2 py-1.5 flex items-center gap-1.5">
                    <Hash size={13} className="text-pulse-text-muted" />
                    <span className="text-xs text-pulse-text-muted">{c}</span>
                  </div>
                ))}
              </div>
              <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-hidden">
                {[
                  { name: 'Alex', msg: 'Hey everyone! 👋', time: '2:34 PM' },
                  { name: 'Jordan', msg: 'Welcome to AevixChat!', time: '2:35 PM' },
                  { name: 'Sam', msg: 'This is so clean 🔥', time: '2:36 PM' },
                ].map((m, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-pulse-brand/30 flex items-center justify-center text-xs font-bold text-white shrink-0">{m.name[0]}</div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-white">{m.name}</span>
                        <span className="text-[10px] text-pulse-text-muted">{m.time}</span>
                      </div>
                      <p className="text-xs text-pulse-text-muted mt-0.5">{m.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Everything you need</h2>
            <p className="text-pulse-text-muted text-lg">Powerful features, beautifully simple.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`bg-gradient-to-br ${f.color} border border-white/8 rounded-2xl p-6`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 ${f.iconColor}`}>
                  <f.icon size={20} />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-pulse-text-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-pulse-bg-secondary/40">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Simple pricing</h2>
            <p className="text-pulse-text-muted text-lg">One payment. Everything included. Forever.</p>
          </div>

          <div className="rounded-2xl bg-pulse-brand/10 border border-pulse-brand/40 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pulse-brand/10 via-transparent to-red-500/10 pointer-events-none" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-widest text-pulse-brand mb-3">Full Access</p>
              <div className="flex items-end justify-center gap-1.5 mb-1">
                <span className="text-6xl font-black text-white">£3.99</span>
              </div>
              <p className="text-pulse-text-muted text-sm mb-8">One-time payment — no subscriptions, no renewals</p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8">
                {PRICING_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-pulse-text-normal">
                    <Check size={14} className="text-pulse-brand shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/auth"
                className="inline-flex items-center gap-2 bg-pulse-brand hover:bg-pulse-brand-hover text-white font-bold px-8 py-3.5 rounded-xl transition-colors text-base shadow-lg shadow-pulse-brand/25"
              >
                Get Started — £3.99
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Ready to join the pulse?</h2>
          <p className="text-pulse-text-muted text-lg mb-8">Get full lifetime access for a one-time payment of £3.99.</p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-pulse-brand hover:bg-pulse-brand-hover text-white font-bold px-8 py-4 rounded-2xl transition-colors text-base shadow-lg shadow-pulse-brand/25"
          >
            Get Started — £3.99
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
