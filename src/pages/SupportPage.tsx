import React, { useState } from 'react'
import { DocsLayout, Section, P, UL } from './DocsLayout'
import { Link } from 'react-router-dom'
import { Mail, MessageSquare, BookOpen, HelpCircle } from 'lucide-react'

const TOPICS = [
  { icon: MessageSquare, title: 'Account & Profile', desc: 'Change your username, avatar, email, or password.' },
  { icon: BookOpen, title: 'Servers & Communities', desc: 'Create, join, manage, and delete servers.' },
  { icon: HelpCircle, title: 'Messages & Channels', desc: 'Sending messages, reactions, and file sharing.' },
  { icon: Mail, title: 'Privacy & Safety', desc: 'Blocking, reporting, and data controls.' },
]

export function SupportPage() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ email: '', subject: '', message: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <DocsLayout title="Support">
      <Section title="How can we help?">
        <P>Browse the topics below or send us a message and we'll get back to you within 24–48 hours.</P>
      </Section>

      {/* Quick topics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {TOPICS.map(t => (
          <Link key={t.title} to="/faq" className="flex items-start gap-3 p-4 bg-pulse-bg-secondary border border-white/8 rounded-xl hover:border-pulse-brand/30 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-pulse-brand/15 flex items-center justify-center shrink-0 group-hover:bg-pulse-brand/25 transition-colors">
              <t.icon size={16} className="text-pulse-brand" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-0.5">{t.title}</p>
              <p className="text-xs text-pulse-text-muted">{t.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <Section title="Useful links">
        <UL items={[
          'Check our FAQ for instant answers to common questions',
          'Read the Terms of Service to understand how AevixChat works',
          'Review our Privacy Policy to understand how we handle your data',
        ]} />
        <div className="flex flex-wrap gap-3 mt-4">
          <Link to="/faq" className="text-sm text-pulse-brand hover:underline">→ FAQ</Link>
          <Link to="/terms" className="text-sm text-pulse-brand hover:underline">→ Terms of Service</Link>
          <Link to="/privacy" className="text-sm text-pulse-brand hover:underline">→ Privacy Policy</Link>
        </div>
      </Section>

      <Section title="Contact us">
        {sent ? (
          <div className="p-5 bg-green-500/10 border border-green-500/25 rounded-xl">
            <p className="text-sm font-semibold text-green-400 mb-1">Message sent!</p>
            <p className="text-sm text-pulse-text-muted">Thanks for reaching out. We'll get back to you within 48 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-pulse-text-muted mb-1.5">Your Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-pulse-text-muted mb-1.5">Subject</label>
                <input
                  required
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Can't delete my server"
                  className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-pulse-text-muted mb-1.5">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Describe your issue in detail..."
                className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none resize-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-pulse-brand hover:bg-pulse-brand-hover text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Send Message
            </button>
          </form>
        )}
      </Section>

      <Section title="Email support">
        <P>You can also email us directly at <a href="mailto:AevixChat@Hotmail.com" className="text-pulse-brand hover:underline">AevixChat@Hotmail.com</a>. We aim to respond within 48 hours.</P>
      </Section>
    </DocsLayout>
  )
}
