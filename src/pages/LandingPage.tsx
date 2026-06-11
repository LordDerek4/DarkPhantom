import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MessageSquare, Users, Compass, Zap, Shield, Hash,
  ArrowRight, Check, ChevronDown, Menu, X,
  Sparkles, Bot, Rocket, Search, Palette, Gift,
  Crown, Star, Image, BadgeCheck, Paintbrush, TrendingUp,
  FileText, ClipboardList, BookOpen, SearchCheck,
  Layers, Wand2, Trophy,
} from 'lucide-react'
import { AppLogo } from '@/components/ui/AppLogo'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Premium', href: '#premium' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: '/support' },
]

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Real-time Messaging',
    desc: 'Instant messages, replies, reactions, and threads — everything you need for fluid conversations.',
    color: 'from-pulse-brand/20 to-red-500/10',
    iconColor: 'text-pulse-brand',
  },
  {
    icon: Users,
    title: 'Communities',
    desc: 'Build your own server with custom channels, roles, and invite codes for your community.',
    color: 'from-rose-500/20 to-pink-500/10',
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

const FREE_FEATURES = [
  'Unlimited servers & channels',
  'Unlimited messages',
  'Up to 100 members per server',
  'File sharing up to 8 MB',
  'Community discovery',
  'Invite links & codes',
  'Custom roles & permissions',
  'Real-time presence & notifications',
  'Voice & video calling',
  'Friend requests & DMs',
]

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Animated profile banners & avatars',
  'Premium profile badge',
  'Gradient username colours',
  'Custom profile themes & cards',
  'Personal AI companion',
  'AI conversation summaries',
  'Server boosting',
  'Animated server icons',
  'Semantic AI search',
  'Natural language search',
  'Exclusive theme marketplace',
  'Animated UI effects',
  'Gift Premium to friends',
  'Loyalty & streak rewards',
  'Up to 500 members per server',
]

const PREMIUM_CATEGORIES = [
  {
    icon: Crown,
    label: 'Enhanced Profiles',
    color: 'from-yellow-500/20 to-orange-500/10',
    iconColor: 'text-yellow-400',
    perks: [
      { icon: Image,      text: 'Animated banners & profile pictures' },
      { icon: BadgeCheck, text: 'Premium profile badge' },
      { icon: Paintbrush, text: 'Custom profile themes & gradient usernames' },
      { icon: Star,       text: 'Featured social links & pinned achievements' },
    ],
  },
  {
    icon: Bot,
    label: 'AI Companion',
    color: 'from-pulse-brand/20 to-red-500/10',
    iconColor: 'text-pulse-brand',
    perks: [
      { icon: MessageSquare, text: 'Summarise conversations' },
      { icon: Sparkles,      text: 'Smart reply suggestions' },
      { icon: FileText,      text: 'Generate announcements & meeting notes' },
      { icon: ClipboardList, text: 'Organise tasks & search server knowledge' },
    ],
  },
  {
    icon: Rocket,
    label: 'Server Boosting',
    color: 'from-purple-500/20 to-pink-500/10',
    iconColor: 'text-purple-400',
    perks: [
      { icon: Paintbrush, text: 'Custom server themes & animated icons' },
      { icon: TrendingUp, text: 'Enhanced discovery ranking' },
      { icon: BadgeCheck, text: 'Exclusive server badges' },
      { icon: Users,      text: 'Up to 500 members per server' },
    ],
  },
  {
    icon: SearchCheck,
    label: 'Advanced Search',
    color: 'from-cyan-500/20 to-blue-500/10',
    iconColor: 'text-cyan-400',
    perks: [
      { icon: Search,    text: 'Semantic AI-powered search' },
      { icon: BookOpen,  text: 'Search across all conversations' },
      { icon: Sparkles,  text: 'Natural language queries' },
      { icon: Layers,    text: 'Cross-server knowledge base search' },
    ],
  },
  {
    icon: Palette,
    label: 'Exclusive Themes',
    color: 'from-green-500/20 to-teal-500/10',
    iconColor: 'text-green-400',
    perks: [
      { icon: Wand2,      text: 'Theme marketplace access' },
      { icon: Paintbrush, text: 'Custom colour schemes' },
      { icon: Users,      text: 'Community-created themes' },
      { icon: Sparkles,   text: 'Animated UI effects' },
    ],
  },
  {
    icon: Gift,
    label: 'Growth Features',
    color: 'from-pink-500/20 to-rose-500/10',
    iconColor: 'text-pink-400',
    perks: [
      { icon: Gift,       text: 'Gift Premium to friends' },
      { icon: TrendingUp, text: 'Referral rewards' },
      { icon: BadgeCheck, text: 'Loyalty badges' },
      { icon: Trophy,     text: 'Subscription streak rewards' },
    ],
  },
]

function NavBar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-pulse-bg-primary/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/">
          <AppLogo size={32} textClassName="text-lg" />
        </Link>

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
            Get Started — Free
          </Link>
        </div>

        <button onClick={() => setOpen(v => !v)} className="md:hidden text-pulse-text-muted hover:text-white">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

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
            <Link to="/auth" className="block text-center text-sm bg-pulse-brand text-white font-semibold rounded-xl py-2">Get Started — Free</Link>
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
              <a href="#premium" className="block text-sm text-pulse-text-muted hover:text-white transition-colors">Premium</a>
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

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pulse-brand/10 via-transparent to-red-500/5 pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-pulse-brand/5 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pulse-brand/15 border border-pulse-brand/25 text-pulse-brand text-xs font-semibold mb-6">
              <Zap size={11} /> Now in early access
            </span>

            <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] mb-6">
              Your community,<br />
              <span className="bg-gradient-to-r from-pulse-brand via-red-400 to-orange-400 bg-clip-text text-transparent">
                your way.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-pulse-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
              AevixChat brings your friends, communities, and conversations together in one beautiful, fast platform. Free forever — upgrade for superpowers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/auth"
                className="flex items-center gap-2 bg-pulse-brand hover:bg-pulse-brand-hover text-white font-bold px-7 py-3.5 rounded-2xl transition-colors text-base shadow-lg shadow-pulse-brand/25"
              >
                Get Started — Free
                <ArrowRight size={18} />
              </Link>
              <a
                href="#premium"
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-semibold px-7 py-3.5 rounded-2xl transition-colors text-base border border-white/10"
              >
                See Premium
                <Crown size={16} className="text-yellow-400" />
              </a>
            </div>
          </motion.div>

          {/* App preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
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

      {/* ── Core Features ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Everything you need</h2>
            <p className="text-pulse-text-muted text-lg">Powerful features, beautifully simple. Included for free.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className={`bg-gradient-to-br ${f.color} border border-white/[0.08] rounded-2xl p-6`}
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

      {/* ── Premium Features ── */}
      <section id="premium" className="py-20 px-6 bg-pulse-bg-secondary/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-pulse-brand/5 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/25 text-yellow-400 text-xs font-semibold mb-5">
              <Crown size={11} /> AevixChat Premium
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Unlock your full potential</h2>
            <p className="text-pulse-text-muted text-lg max-w-xl mx-auto">
              Premium gives you AI tools, expressive profiles, server boosts, and more — for just £3.99/month.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PREMIUM_CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className={`bg-gradient-to-br ${cat.color} border border-white/[0.08] rounded-2xl p-6`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 ${cat.iconColor}`}>
                    <cat.icon size={20} />
                  </div>
                  <h3 className="font-bold text-white text-base">{cat.label}</h3>
                </div>
                <ul className="space-y-2.5">
                  {cat.perks.map(p => (
                    <li key={p.text} className="flex items-center gap-2.5 text-sm text-pulse-text-muted">
                      <p.icon size={13} className={`${cat.iconColor} shrink-0 opacity-80`} />
                      {p.text}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold px-8 py-3.5 rounded-2xl transition-all text-base shadow-lg shadow-yellow-500/20"
            >
              <Crown size={16} /> Get Premium — £3.99/mo
            </Link>
            <p className="text-xs text-pulse-text-muted mt-3">Cancel anytime. No lock-in.</p>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Simple, honest pricing</h2>
            <p className="text-pulse-text-muted text-lg">Start free. Upgrade when you're ready.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Free */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="rounded-2xl bg-pulse-bg-secondary border border-white/10 p-8 flex flex-col"
            >
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-pulse-text-muted mb-2">Free</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-black text-white">£0</span>
                </div>
                <p className="text-pulse-text-muted text-sm">Forever free. No credit card.</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-8">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-pulse-text-muted">
                    <Check size={14} className="text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="block text-center bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Get started free
              </Link>
            </motion.div>

            {/* Premium */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="rounded-2xl bg-gradient-to-br from-yellow-500/10 via-pulse-brand/10 to-red-500/10 border border-yellow-500/30 p-8 flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-[11px] font-bold text-yellow-400">
                  <Crown size={10} /> Most Popular
                </span>
              </div>
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-yellow-400 mb-2">Premium</p>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-5xl font-black text-white">£3.99</span>
                  <span className="text-pulse-text-muted text-base mb-1.5">/month</span>
                </div>
                <p className="text-pulse-text-muted text-sm">Cancel anytime. No lock-in.</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-8">
                {PREMIUM_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-pulse-text-normal">
                    <Check size={14} className="text-yellow-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="block text-center bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20"
              >
                Get Premium — £3.99/mo
              </Link>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 bg-pulse-bg-secondary/40">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Ready to join AevixChat?</h2>
          <p className="text-pulse-text-muted text-lg mb-8">Free to join. Upgrade to Premium for just £3.99/month.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/auth"
              className="flex items-center gap-2 bg-pulse-brand hover:bg-pulse-brand-hover text-white font-bold px-8 py-4 rounded-2xl transition-colors text-base shadow-lg shadow-pulse-brand/25"
            >
              Get Started — Free <ArrowRight size={18} />
            </Link>
            <Link
              to="/auth"
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold px-8 py-4 rounded-2xl transition-all text-base shadow-lg shadow-yellow-500/20"
            >
              <Crown size={16} /> Get Premium
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
