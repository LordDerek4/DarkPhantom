import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Lock, Sparkles, X } from 'lucide-react'
import { ServerSidebar } from './ServerSidebar'
import { ChannelSidebar } from './ChannelSidebar'
import { MemberList } from './MemberList'
import { TopBar } from './TopBar'
import { useAppStore } from '@/store/useAppStore'
import { useServerDetails } from '@/hooks/useServer'
import { usePresenceSubscription } from '@/hooks/usePresence'
import { useAuth } from '@/hooks/useAuth'
import { AIAssistant } from '@/components/ai/AIAssistant'
import { ThreadPanel } from '@/components/threads/ThreadPanel'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { EventsPanel } from '@/components/events/EventsPanel'

interface AppLayoutProps {
  children: React.ReactNode
}

function AIPremiumGate({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  return (
    <motion.div
      key="ai-gate"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.2 }}
      className="w-80 bg-pulse-bg-secondary border-l border-black/20 flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold text-pulse-text-normal">
          <Sparkles size={16} className="text-yellow-400" /> AI Assistant
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-pulse-text-muted hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
          <Lock size={28} className="text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-base mb-1">Premium Feature</h3>
          <p className="text-pulse-text-muted text-sm leading-relaxed">
            The AI Companion is available to Premium members. Summarise conversations, get smart replies, and draft announcements.
          </p>
        </div>
        <button
          onClick={onUpgrade}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-yellow-500/20"
        >
          <Crown size={15} /> Upgrade to Premium
        </button>
      </div>
    </motion.div>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  const { activeServerId, isMemberListOpen, viewMode, openPanel, closePanel, activeChannelId, isMobileSidebarOpen, closeMobileSidebar, setSettingsOpen, dmChannels } = useAppStore()
  const { members } = useServerDetails(activeServerId)
  const { user } = useAuth()

  // Subscribe to presence for server members AND all DM contacts
  const memberIds = members.map(m => m.userId)
  const dmPartnerIds = dmChannels.flatMap(c =>
    c.participantIds.filter(id => id !== user?.uid)
  )
  const allPresenceIds = [...new Set([...memberIds, ...dmPartnerIds])]
  usePresenceSubscription(allPresenceIds)

  const showMemberList = isMemberListOpen && viewMode === 'server' && !openPanel
  const showChannelSidebar = viewMode !== 'discover' && viewMode !== 'friends'

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-pulse-bg-primary text-pulse-text-normal">
      {/* Desktop sidebars */}
      <div className="hidden md:flex shrink-0">
        <ServerSidebar />
        {showChannelSidebar && <ChannelSidebar />}
      </div>

      {/* Mobile sidebar drawer */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={closeMobileSidebar}>
          <div className="flex h-full shrink-0 shadow-2xl" onClick={e => e.stopPropagation()}>
            <ServerSidebar />
            {showChannelSidebar && <ChannelSidebar />}
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 bg-pulse-bg-tertiary">
        <TopBar />
        <div className="flex flex-1 min-h-0">
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {children}
          </main>

          {/* Right panels */}
          {showMemberList && <MemberList />}

          <AnimatePresence>
            {openPanel === 'ai' && activeChannelId && activeServerId && (
              user?.isPremium ? (
                <AIAssistant
                  key="ai"
                  channelId={activeChannelId}
                  serverId={activeServerId}
                  onClose={closePanel}
                />
              ) : (
                <AIPremiumGate
                  key="ai-gate"
                  onClose={closePanel}
                  onUpgrade={() => { closePanel(); setSettingsOpen(true, 'premium') }}
                />
              )
            )}
            {openPanel === 'threads' && activeChannelId && activeServerId && (
              <ThreadPanel
                key="threads"
                channelId={activeChannelId}
                serverId={activeServerId}
                onClose={closePanel}
              />
            )}
            {openPanel === 'analytics' && activeServerId && (
              <div key="analytics" className="w-96 bg-pulse-bg-secondary border-l border-black/20 overflow-hidden">
                <AnalyticsDashboard serverId={activeServerId} />
              </div>
            )}
            {openPanel === 'events' && activeServerId && (
              <div key="events" className="w-80 bg-pulse-bg-secondary border-l border-black/20 overflow-hidden">
                <EventsPanel serverId={activeServerId} />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
