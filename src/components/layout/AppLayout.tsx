import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { ServerSidebar } from './ServerSidebar'
import { ChannelSidebar } from './ChannelSidebar'
import { MemberList } from './MemberList'
import { TopBar } from './TopBar'
import { useAppStore } from '@/store/useAppStore'
import { useServerDetails } from '@/hooks/useServer'
import { usePresenceSubscription } from '@/hooks/usePresence'
import { AIAssistant } from '@/components/ai/AIAssistant'
import { ThreadPanel } from '@/components/threads/ThreadPanel'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { EventsPanel } from '@/components/events/EventsPanel'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { activeServerId, isMemberListOpen, viewMode, openPanel, closePanel, activeChannelId, isMobileSidebarOpen, closeMobileSidebar } = useAppStore()
  const { members } = useServerDetails(activeServerId)

  const memberIds = members.map(m => m.userId)
  usePresenceSubscription(memberIds)

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
              <AIAssistant
                key="ai"
                channelId={activeChannelId}
                serverId={activeServerId}
                onClose={closePanel}
              />
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
