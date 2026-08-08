import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Hash, Megaphone, Plus, Search, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/utils/helpers'
import { useAppStore } from '@/store/useAppStore'
import { useServerDetails } from '@/hooks/useServer'
import { useDMChannels } from '@/hooks/useDirectMessages'
import { deleteDMChannel } from '@/services/dm.service'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUserCache'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { UserPanel } from './UserPanel'
import { ChannelSkeleton, DMSkeleton } from '@/components/ui/LoadingSkeleton'
import { CreateChannelModal } from '@/components/channel/CreateChannelModal'
import { NewConversationModal } from '@/components/dm/NewConversationModal'
import type { Channel, DirectMessageChannel } from '@/types'
import { hasPermission } from '@/utils/permissions'

export function ChannelSidebar() {
  const { viewMode, activeServerId, activeChannelId, activeDMChannelId, setActiveChannel, setActiveDMChannel, unreadInfo } = useAppStore()

  return (
    <aside className="w-60 bg-pulse-bg-secondary flex flex-col shrink-0">
      {viewMode === 'dm' ? (
        <DMSidebarContent />
      ) : (
        <ServerChannelContent />
      )}
      <UserPanel />
    </aside>
  )
}

function ServerChannelContent() {
  const { activeServerId, setActiveChannel, activeChannelId, unreadInfo, setServerSettingsId } = useAppStore()
  const { server, channels, members, roles, currentMember, loading } = useServerDetails(activeServerId)
  const { user } = useAuth()
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createCategoryId, setCreateCategoryId] = useState<string | null>(null)

  if (!server) return null

  const categories = channels.filter(c => c.type === 'category')
  const uncategorized = channels.filter(c => c.type !== 'category' && !c.categoryId)

  const canManageChannels = currentMember
    ? hasPermission(currentMember, roles, 'MANAGE_CHANNELS') || hasPermission(currentMember, roles, 'ADMINISTRATOR')
    : false

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const renderChannel = (channel: Channel) => {
    if (channel.type === 'category') return null
    const isActive = activeChannelId === channel.id
    const unread = unreadInfo[channel.id]

    return (
      <button
        key={channel.id}
        onClick={() => setActiveChannel(channel.id)}
        className={cn(
          'w-full flex items-center gap-1.5 px-2 py-1.5 rounded group',
          'text-pulse-channel-default hover:text-pulse-channel-selected hover:bg-white/5',
          isActive && 'bg-white/10 text-pulse-channel-selected'
        )}
      >
        <ChannelIcon type={channel.type} />
        <span className={cn(
          'flex-1 text-sm text-left truncate',
          unread && 'text-white font-medium'
        )}>
          {channel.name}
        </span>
        {unread && <Badge count={unread.count} />}
      </button>
    )
  }

  return (
    <>
      {/* Server header */}
      <button
        className="flex items-center justify-between px-4 h-12 font-semibold text-pulse-text-normal hover:bg-white/5 border-b shrink-0 transition-colors"
        style={server.accentColor
          ? { borderBottomColor: server.accentColor + '60', boxShadow: `0 1px 0 ${server.accentColor}30` }
          : { borderBottomColor: 'rgba(0,0,0,0.2)' }}
        onClick={() => setServerSettingsId(server.id)}
      >
        <span className="truncate">{server.name}</span>
        {server.accentColor && <span className="w-2 h-2 rounded-full shrink-0 mr-1" style={{ background: server.accentColor }} />}
        <ChevronDown size={16} />
      </button>

      {/* Channels list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-0.5">
        {loading ? (
          <ChannelSkeleton />
        ) : (
          <>
            {/* Uncategorized channels */}
            {uncategorized.map(renderChannel)}

            {/* Categories */}
            {categories.map(cat => {
              const catChannels = channels.filter(c => c.categoryId === cat.id)
              const isCollapsed = collapsedCategories.has(cat.id)

              return (
                <div key={cat.id} className="mt-2">
                  <div className="flex items-center gap-1 px-1 mb-0.5 group">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="flex items-center gap-1 flex-1 text-xs font-semibold uppercase tracking-wide text-pulse-text-muted hover:text-pulse-text-normal"
                    >
                      {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      {cat.name}
                    </button>
                    {canManageChannels && (
                      <Tooltip content="Create Channel" side="top">
                        <button
                          onClick={() => { setCreateCategoryId(cat.id); setShowCreateModal(true) }}
                          className="opacity-0 group-hover:opacity-100 text-pulse-text-muted hover:text-pulse-text-normal"
                        >
                          <Plus size={14} />
                        </button>
                      </Tooltip>
                    )}
                  </div>

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden space-y-0.5"
                      >
                        {catChannels.map(renderChannel)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </>
        )}
      </div>

      <CreateChannelModal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setCreateCategoryId(null) }}
        serverId={activeServerId!}
        categoryId={createCategoryId}
      />
    </>
  )
}

function DMSidebarContent() {
  const { dmChannels, loading } = useDMChannels()
  const { activeDMChannelId, setActiveDMChannel } = useAppStore()
  const { user } = useAuth()
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return dmChannels
    const q = search.toLowerCase()
    return dmChannels.filter(ch => {
      const otherId = ch.participantIds.find(id => id !== user?.uid) ?? ''
      return otherId.includes(q)
    })
  }, [dmChannels, search, user?.uid])

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-black/20 shrink-0">
        <span className="text-xs font-bold uppercase tracking-wider text-pulse-text-muted">Direct Messages</span>
        <Tooltip content="New Conversation" side="top">
          <button
            onClick={() => setShowNew(true)}
            className="w-6 h-6 flex items-center justify-center rounded text-pulse-text-muted hover:text-pulse-text-normal hover:bg-white/10 transition-colors"
          >
            <Plus size={16} />
          </button>
        </Tooltip>
      </div>

      {/* Search */}
      {dmChannels.length > 4 && (
        <div className="px-2 pt-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pulse-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Find a conversation"
              className="w-full bg-pulse-bg-primary rounded-md pl-7 pr-2 py-1.5 text-xs text-pulse-text-normal placeholder:text-pulse-text-muted focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* DM list */}
      <div data-tutorial="dm-list" className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-0.5">
        {loading ? (
          <DMSkeleton />
        ) : filtered.length === 0 && !loading ? (
          <div className="px-2 py-8 text-center text-pulse-text-muted text-sm">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2">
              <Plus size={22} className="text-pulse-text-muted opacity-50" />
            </div>
            <p className="text-xs">No conversations yet</p>
            <button
              onClick={() => setShowNew(true)}
              className="text-xs text-pulse-brand mt-1 hover:underline"
            >
              Start one
            </button>
          </div>
        ) : (
          filtered.map(channel => {
            const otherId = channel.participantIds.find(id => id !== user?.uid) ?? null
            const unreadCount = user ? (channel.unreadCounts[user.uid] ?? 0) : 0

            return (
              <DMChannelItem
                key={channel.id}
                channel={channel}
                userId={otherId}
                currentUserId={user?.uid ?? ''}
                unreadCount={unreadCount}
                isActive={activeDMChannelId === channel.id}
                onClick={() => setActiveDMChannel(channel.id)}
              />
            )
          })
        )}
      </div>

      <NewConversationModal open={showNew} onClose={() => setShowNew(false)} />
    </>
  )
}

function DMChannelItem({
  channel,
  userId,
  currentUserId,
  unreadCount,
  isActive,
  onClick,
}: {
  channel: DirectMessageChannel
  userId: string | null
  currentUserId: string
  unreadCount: number
  isActive: boolean
  onClick: () => void
}) {
  const dmUser = useUser(userId)
  const { setActiveDMChannel } = useAppStore()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete this conversation${dmUser?.displayName ? ` with ${dmUser.displayName}` : ''}? This can't be undone.`)) return
    setDeleting(true)
    try {
      await deleteDMChannel(channel.id, currentUserId)
      if (isActive) setActiveDMChannel(null)
    } catch {
      toast.error('Failed to delete conversation')
      setDeleting(false)
    }
  }

  const displayName = dmUser?.displayName ?? 'Loading...'
  const avatarSrc = dmUser?.avatarUrl ?? null
  const avatarName = displayName

  return (
    <div className={cn('group flex items-center rounded', isActive && 'bg-white/10')}>
      <button
        onClick={onClick}
        className={cn(
          'flex-1 flex items-center gap-2.5 px-2 py-2 rounded text-left',
          'hover:bg-white/5 transition-colors min-w-0'
        )}
      >
        <div className="relative shrink-0">
          <Avatar
            src={avatarSrc}
            name={avatarName}
            userId={userId ?? undefined}
            size="sm"
            showStatus
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium truncate',
            unreadCount > 0 ? 'text-white' : 'text-pulse-text-muted group-hover:text-pulse-text-normal'
          )}>
            {displayName}
          </p>
          {channel.lastMessageContent && (
            <p className="text-xs text-pulse-text-muted truncate">{channel.lastMessageContent}</p>
          )}
        </div>
        {unreadCount > 0 && <Badge count={unreadCount} />}
      </button>

      {/* Delete button on hover */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 mr-1 p-1 rounded text-pulse-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0 disabled:opacity-50"
        title="Delete conversation"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

function ChannelIcon({ type }: { type: string }) {
  if (type === 'announcement') return <Megaphone size={16} className="shrink-0" />
  return <Hash size={16} className="shrink-0" />
}

