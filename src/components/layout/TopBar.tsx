import React from 'react'
import { Hash, Megaphone, Pin, Search, Users, HelpCircle, Inbox, ChevronLeft, ChevronRight, Sparkles, MessageSquare, BarChart2, Calendar, Menu, Phone, Video } from 'lucide-react'
import { NotificationBellButton } from '@/components/notifications/NotificationsPanel'
import { cn } from '@/utils/helpers'
import { useAppStore } from '@/store/useAppStore'
import { useServerDetails } from '@/hooks/useServer'
import { useUser } from '@/hooks/useUserCache'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { createCall } from '@/services/call.service'
import toast from 'react-hot-toast'

export function TopBar() {
  const {
    activeServerId,
    activeChannelId,
    activeDMChannelId,
    viewMode,
    toggleMemberList,
    isMemberListOpen,
    setSearchOpen,
    navHistory,
    navFuture,
    goBack,
    goForward,
    openMobileSidebar,
    setActiveCallId,
    setActiveCallType,
  } = useAppStore()

  const MobileMenuBtn = () => (
    <button
      onClick={openMobileSidebar}
      className="md:hidden p-1.5 rounded text-pulse-text-muted hover:text-white hover:bg-white/10 transition-colors mr-1 shrink-0"
    >
      <Menu size={20} />
    </button>
  )

  const canGoBack = navHistory.length > 0
  const canGoForward = navFuture.length > 0
  const { channels } = useServerDetails(activeServerId)
  const { user } = useAuth()

  // For DM view
  const dmPartnerId = activeDMChannelId
    ? useAppStore.getState().dmChannels.find(c => c.id === activeDMChannelId)?.participantIds.find(id => id !== user?.uid)
    : null
  const dmPartner = useUser(dmPartnerId ?? null)

  const activeChannel = channels.find(c => c.id === activeChannelId)

  const startCall = async (type: 'voice' | 'video') => {
    if (!user?.uid || !dmPartnerId) return
    try {
      const callId = await createCall(user.uid, [dmPartnerId], type)
      setActiveCallId(callId)
      setActiveCallType(type)
    } catch {
      toast.error('Failed to start call')
    }
  }

  const NavButtons = () => (
    <div className="flex items-center gap-0.5 mr-1 shrink-0">
      <Tooltip content="Go Back" side="bottom">
        <button
          onClick={goBack}
          disabled={!canGoBack}
          className={cn(
            'p-1 rounded transition-colors',
            canGoBack ? 'text-pulse-text-muted hover:text-pulse-text-normal hover:bg-white/10' : 'text-pulse-text-muted/30 cursor-not-allowed'
          )}
        >
          <ChevronLeft size={20} />
        </button>
      </Tooltip>
      <Tooltip content="Go Forward" side="bottom">
        <button
          onClick={goForward}
          disabled={!canGoForward}
          className={cn(
            'p-1 rounded transition-colors',
            canGoForward ? 'text-pulse-text-muted hover:text-pulse-text-normal hover:bg-white/10' : 'text-pulse-text-muted/30 cursor-not-allowed'
          )}
        >
          <ChevronRight size={20} />
        </button>
      </Tooltip>
    </div>
  )

  if (viewMode === 'dm' && dmPartner) {
    return (
      <header className="h-12 flex items-center px-4 gap-3 border-b border-black/20 bg-pulse-bg-tertiary shrink-0 shadow-elevation-low">
        <MobileMenuBtn />
        <NavButtons />
        <Avatar src={dmPartner.avatarUrl} name={dmPartner.displayName} userId={dmPartner.uid} size="sm" showStatus />
        <span className="font-semibold text-pulse-text-normal">{dmPartner.displayName}</span>
        <div className="ml-auto flex items-center gap-1">
          <TopBarButton icon={<Phone size={20} />} tooltip="Voice Call" onClick={() => startCall('voice')} />
          <TopBarButton icon={<Video size={20} />} tooltip="Video Call" onClick={() => startCall('video')} />
          <div className="w-px h-5 bg-white/20 mx-1" />
          <TopBarButton icon={<Search size={20} />} tooltip="Search" onClick={() => setSearchOpen(true)} />
          <NotificationBellButton />
          <TopBarButton icon={<HelpCircle size={20} />} tooltip="Help" onClick={() => toast('Help docs coming soon', { icon: '❓' })} />
        </div>
      </header>
    )
  }

  if (!activeChannel) {
    return (
      <header className="h-12 flex items-center px-4 gap-2 border-b border-black/20 bg-pulse-bg-tertiary shrink-0 shadow-elevation-low">
        <MobileMenuBtn />
        <NavButtons />
        <span className="text-pulse-text-muted text-sm">Select a channel</span>
        <div className="ml-auto flex items-center gap-1">
          <TopBarButton icon={<Search size={20} />} tooltip="Search" onClick={() => setSearchOpen(true)} />
        </div>
      </header>
    )
  }

  return (
    <header className="h-12 flex items-center px-4 gap-2 border-b border-black/20 bg-pulse-bg-tertiary shrink-0 shadow-elevation-low">
      <MobileMenuBtn />
      <NavButtons />
      {activeChannel.type === 'announcement' ? (
        <Megaphone size={20} className="text-pulse-text-muted shrink-0" />
      ) : (
        <Hash size={20} className="text-pulse-text-muted shrink-0" />
      )}
      <span className="font-semibold text-pulse-text-normal">{activeChannel.name}</span>

      {activeChannel.topic && (
        <>
          <div className="w-px h-5 bg-white/20 mx-1" />
          <span className="text-sm text-pulse-text-muted truncate max-w-xs">{activeChannel.topic}</span>
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <NotificationBellButton />
        <TopBarButton icon={<Pin size={20} />} tooltip="Pinned Messages" onClick={() => useAppStore.getState().togglePanel('threads')} />
        <TopBarButton
          icon={<MessageSquare size={20} />}
          tooltip="Threads"
          onClick={() => useAppStore.getState().togglePanel('threads')}
          active={useAppStore.getState().openPanel === 'threads'}
        />
        <TopBarButton
          icon={<Sparkles size={20} />}
          tooltip="AI Assistant"
          onClick={() => useAppStore.getState().togglePanel('ai')}
          active={useAppStore.getState().openPanel === 'ai'}
        />
        <TopBarButton
          icon={<BarChart2 size={20} />}
          tooltip="Analytics"
          onClick={() => useAppStore.getState().togglePanel('analytics')}
          active={useAppStore.getState().openPanel === 'analytics'}
        />
        <TopBarButton
          icon={<Users size={20} />}
          tooltip={isMemberListOpen ? 'Hide Member List' : 'Show Member List'}
          onClick={toggleMemberList}
          active={isMemberListOpen}
        />
        <div className="w-px h-5 bg-white/20 mx-1" />
        <TopBarButton icon={<Search size={20} />} tooltip="Search" onClick={() => setSearchOpen(true)} />
        <TopBarButton icon={<HelpCircle size={20} />} tooltip="Help" onClick={() => toast('Help docs coming soon', { icon: '❓' })} />
      </div>
    </header>
  )
}

function TopBarButton({
  icon,
  tooltip,
  onClick,
  active,
}: {
  icon: React.ReactNode
  tooltip: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <Tooltip content={tooltip} side="bottom">
      <button
        onClick={onClick}
        className={cn(
          'p-1.5 rounded transition-colors',
          active ? 'text-pulse-text-normal' : 'text-pulse-text-muted hover:text-pulse-text-normal'
        )}
      >
        {icon}
      </button>
    </Tooltip>
  )
}
