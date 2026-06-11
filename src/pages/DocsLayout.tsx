import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppLogo } from '@/components/ui/AppLogo'

const DOCS_LINKS = [
  { href: '/about', label: 'About AevixChat' },
  { href: '/support', label: 'Support' },
  { href: '/faq', label: 'FAQ' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
]

export function DocsLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-pulse-bg-tertiary text-white">
      {/* Top bar */}
      <header className="bg-pulse-bg-primary/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-pulse-text-muted hover:text-white transition-colors">
            <ArrowLeft size={15} />
            <AppLogo size={24} textClassName="text-sm" />
          </Link>
          <Link to="/auth" className="text-sm bg-pulse-brand hover:bg-pulse-brand-hover text-white font-semibold px-4 py-1.5 rounded-xl transition-colors">
            Open App
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-10">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 hidden md:block">
          <nav className="sticky top-24 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-pulse-text-muted px-3 mb-2">Documentation</p>
            {DOCS_LINKS.map(l => (
              <Link
                key={l.href}
                to={l.href}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname === l.href
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-pulse-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <h1 className="text-3xl font-black text-white mb-8 pb-4 border-b border-white/10">{title}</h1>
          <div className="prose-custom">{children}</div>
        </main>
      </div>

      <footer className="border-t border-white/5 py-8 mt-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-pulse-text-muted">© {new Date().getFullYear()} AevixChat. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {DOCS_LINKS.map(l => (
              <Link key={l.href} to={l.href} className="text-xs text-pulse-text-muted hover:text-white transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

// Shared prose helpers
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
      <div className="space-y-3 text-pulse-text-muted text-sm leading-relaxed">{children}</div>
    </section>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-pulse-text-muted text-sm leading-relaxed">{children}</p>
}

export function UL({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-pulse-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-pulse-brand mt-1.5 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  )
}
