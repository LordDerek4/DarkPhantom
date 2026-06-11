import React, { useState } from 'react'
import { DocsLayout, Section, P } from './DocsLayout'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/helpers'

const FAQS = [
  {
    section: 'Getting Started',
    items: [
      { q: 'Is AevixChat free?', a: 'Yes! AevixChat is completely free to use. You can create unlimited servers, send unlimited messages, and join unlimited communities at no cost. A Pro tier with extra features is coming soon.' },
      { q: 'How do I create an account?', a: 'Click "Get Started" on the homepage and sign up with your email address. You\'ll choose a username and can customise your profile right away.' },
      { q: 'Can I use AevixChat on mobile?', a: 'AevixChat works in any modern browser on mobile. A native mobile app is on our roadmap.' },
      { q: 'How do I create a server?', a: 'Once signed in, click the + button in the left sidebar and choose "Create a Community". Pick a template or start from scratch, name your server, and invite people with a unique code.' },
    ],
  },
  {
    section: 'Servers & Communities',
    items: [
      { q: 'How many servers can I join?', a: 'There\'s no hard limit on how many servers you can join.' },
      { q: 'How do I invite someone to my server?', a: 'Right-click your server icon in the sidebar and choose "Invite People", or look for the invite code shown at the bottom of the channel list. Share the 8-character code or the full link.' },
      { q: 'Can I make my server private?', a: 'Yes. When creating a community, choose "Private" and it won\'t appear in the public Discover page. Only people with your invite code can join.' },
      { q: 'How do I delete a server?', a: 'Open Server Settings (right-click the server icon → Server Settings), go to "Delete Server", type the server name to confirm, and click Delete. This is permanent.' },
      { q: 'Can I transfer ownership of a server?', a: 'Yes. Go to Server Settings → Members, find the member you want to transfer ownership to, click the menu icon, and confirm the transfer.' },
    ],
  },
  {
    section: 'Messages & Channels',
    items: [
      { q: 'What file types can I share?', a: 'You can share images (JPG, PNG, GIF, WEBP) and files up to 8 MB on the free plan.' },
      { q: 'Can I delete messages?', a: 'Yes. Hover over a message and click the trash icon to delete it. Server admins can delete any message.' },
      { q: 'How do I mention someone?', a: 'Type @ followed by their username to mention them. They\'ll get a notification.' },
    ],
  },
  {
    section: 'Account & Privacy',
    items: [
      { q: 'How do I change my username or avatar?', a: 'Click the settings cog near your avatar at the bottom of the sidebar, go to "My Account" or "Profile" to update your details.' },
      { q: 'How do I delete my account?', a: 'Go to Settings → Privacy & Safety → Danger Zone and click "Delete Account". This is permanent and cannot be undone.' },
      { q: 'Who can see my messages?', a: 'In a server, all members of that server can see messages in text channels. Direct messages are only visible to the participants.' },
      { q: 'Does AevixChat sell my data?', a: 'No. We never sell your personal data. See our Privacy Policy for full details on how we handle your information.' },
    ],
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-white">{q}</span>
        <ChevronDown size={16} className={cn('text-pulse-text-muted shrink-0 mt-0.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="pb-4 -mt-1">
          <P>{a}</P>
        </div>
      )}
    </div>
  )
}

export function FAQPage() {
  return (
    <DocsLayout title="Frequently Asked Questions">
      <P>Can't find what you're looking for? <a href="/support" className="text-pulse-brand hover:underline">Contact our support team</a>.</P>

      {FAQS.map(group => (
        <Section key={group.section} title={group.section}>
          <div className="bg-pulse-bg-secondary border border-white/8 rounded-xl overflow-hidden divide-y divide-white/5 px-4">
            {group.items.map(item => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </Section>
      ))}
    </DocsLayout>
  )
}
