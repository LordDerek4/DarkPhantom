import React, { useState, useRef, useEffect } from 'react'
import { Home, Plus, Compass, MessageSquare, Users, Settings, Trash2, LogOut, Link, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/helpers'
import { useAppStore } from '@/store/useAppStore'
import { useServers } from '@/hooks/useServer'
import { useAuth } from '@/hooks/useAuth'
import { Tooltip } from '@/components/ui/Tooltip'
import { Badge } from '@/components/ui/Badge'
import { ServerSkeleton } from '@/components/ui/LoadingSkeleton'
import { subscribeToFriendships } from '@/services/friends.service'
import type { Server } from '@/types'
import type { Friendship } from '@/types/extended'

interface ContextMenu {
  serverId: string
  x: number
  y: number
}

export function ServerSidebar() {
  const { servers, loading, setActive, activeServerId } = useServers()
  const { setViewMode, viewMode, unreadInfo, dmChannels, openCreateCommunity, openJoinServer, setServerSettingsId } = useAppStore()
  const { user } = useAuth()
  const [ctxMenu, setCtxMenu] = useState<ContextMenu | null>(null)
  const ctxRef = useRef<HTMLDivElement>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const [addMenuPos, setAddMenuPos] = useState({ x: 0, y: 0 })
  const [pendingFriendCount, setPendingFriendCount] = useState(0)

  useEffect(() => {
    if (!user?.uid) return
    return subscribeToFriendships(user.uid, (fs: Friendship[]) => {
      setPendingFriendCount(fs.filter(f => f.status === 'pending' && f.receiverId === user.uid).length)
    })
  }, [user?.uid])

  const totalDMUnread = dmChannels.reduce((sum, c) => {
    const unread = Object.values(c.unreadCounts ?? {}).reduce((a, b) => a + b, 0)
    return sum + unread
  }, 0)

  // Close context menu on outside click or scroll
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    document.addEventListener('mousedown', close)
    document.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('scroll', close, true)
    }
  }, [ctxMenu])

  // Close add-server popup on outside click
  useEffect(() => {
    if (!showAddMenu) return
    const close = () => setShowAddMenu(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showAddMenu])

  const handleRightClick = (e: React.MouseEvent, server: Server) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ serverId: server.id, x: e.clientX, y: e.clientY })
  }

  const ctxServer = ctxMenu ? servers.find(s => s.id === ctxMenu.serverId) : null
  const isOwner = !!ctxServer && ctxServer.ownerId === user?.uid

  return (
    <>
      <nav className="w-[72px] bg-pulse-bg-primary flex flex-col items-center shrink-0 h-full">

        {/* ── Top: fixed navigation ── */}
        <div className="flex flex-col items-center gap-2 pt-3 shrink-0">
          {/* Home */}
          <Tooltip content="Home" side="right">
            <button
              type="button"
              onClick={() => setViewMode('home')}
              className={cn(
                'w-12 h-12 rounded-3xl flex items-center justify-center transition-all duration-200',
                'bg-pulse-bg-secondary hover:bg-pulse-brand hover:rounded-2xl',
                viewMode === 'home' && 'bg-pulse-brand rounded-2xl'
              )}
            >
              <Home size={22} className="text-white" />
            </button>
          </Tooltip>

          {/* DMs */}
          <Tooltip content="Direct Messages" side="right">
            <button
              type="button"
              onClick={() => setViewMode('dm')}
              className={cn(
                'relative w-12 h-12 rounded-3xl flex items-center justify-center transition-all duration-200',
                'bg-pulse-bg-secondary hover:bg-pulse-brand hover:rounded-2xl',
                viewMode === 'dm' && 'bg-pulse-brand rounded-2xl'
              )}
            >
              <MessageSquare size={22} className="text-white" />
              {totalDMUnread > 0 && (
                <Badge count={totalDMUnread} className="absolute -bottom-1 -right-1" />
              )}
            </button>
          </Tooltip>

          <div className="w-8 h-px bg-white/10 my-1" />
        </div>

        {/* ── Middle: scrollable server list ── */}
        <div className="flex flex-col items-center gap-2 flex-1 overflow-y-auto scrollbar-none py-1 w-full">
          {loading ? (
            <ServerSkeleton />
          ) : (
            servers.map(server => {
              const isActive = activeServerId === server.id
              const unread = Object.entries(unreadInfo)
                .filter(([, info]) => (info as { channelId?: string }).channelId?.startsWith(server.id) ?? false)
                .reduce((sum, [, info]) => sum + (info as { count: number }).count, 0)

              return (
                <Tooltip key={server.id} content={server.name} side="right">
                  <button
                    type="button"
                    onClick={() => { setActive(server.id); setViewMode('server') }}
                    onContextMenu={e => handleRightClick(e, server)}
                    className="relative group shrink-0"
                  >
                    <span className={cn(
                      'absolute -left-3 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r transition-all duration-200',
                      isActive ? 'h-10' : unread > 0 ? 'h-2' : 'h-0 group-hover:h-5'
                    )} />
                    {server.iconUrl ? (
                      <img
                        src={server.iconUrl}
                        alt={server.name}
                        className={cn('w-12 h-12 object-cover transition-all duration-200', isActive ? 'rounded-2xl' : 'rounded-3xl hover:rounded-2xl')}
                      />
                    ) : (
                      <div className={cn(
                        'w-12 h-12 flex items-center justify-center text-white font-semibold text-sm',
                        'bg-pulse-bg-secondary hover:bg-pulse-brand transition-all duration-200',
                        isActive ? 'rounded-2xl bg-pulse-brand' : 'rounded-3xl hover:rounded-2xl'
                      )}>
                        {server.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {unread > 0 && !isActive && <Badge count={unread} className="absolute -bottom-1 -right-1" />}
                  </button>
                </Tooltip>
              )
            })
          )}
        </div>

        {/* ── Bottom: fixed actions ── */}
        <div className="flex flex-col items-center gap-2 pb-3 shrink-0">
          <div className="w-8 h-px bg-white/10 my-1" />

          {/* Add Server button */}
          <Tooltip content="Add a Server" side="right">
            <button
              ref={addBtnRef}
              type="button"
              data-tutorial="add-server"
              onClick={e => {
                e.stopPropagation()
                const rect = addBtnRef.current?.getBoundingClientRect()
                if (rect) setAddMenuPos({ x: rect.right + 8, y: rect.top })
                setShowAddMenu(v => !v)
              }}
              className={cn(
                'w-12 h-12 rounded-3xl flex items-center justify-center transition-all duration-200 group shrink-0',
                showAddMenu
                  ? 'bg-pulse-status-online rounded-2xl'
                  : 'bg-pulse-bg-secondary hover:bg-pulse-status-online hover:rounded-2xl'
              )}
            >
              <Plus size={22} className={cn('transition-colors', showAddMenu ? 'text-white' : 'text-pulse-status-online group-hover:text-white')} />
            </button>
          </Tooltip>

          {/* Discover */}
          <Tooltip content="Discover Communities" side="right">
            <button
              type="button"
              onClick={() => setViewMode('discover')}
              className={cn(
                'w-12 h-12 rounded-3xl hover:bg-pulse-brand hover:rounded-2xl flex items-center justify-center transition-all duration-200 shrink-0',
                viewMode === 'discover' ? 'bg-pulse-brand rounded-2xl' : 'bg-pulse-bg-secondary'
              )}
            >
              <Compass size={22} className="text-white" />
            </button>
          </Tooltip>

          {/* Friends */}
          <Tooltip content="Friends" side="right">
            <div className="relative">
              <button
                type="button"
                data-tutorial="friends-btn"
                onClick={() => setViewMode('friends')}
                className={cn(
                  'w-12 h-12 rounded-3xl hover:bg-pulse-brand hover:rounded-2xl flex items-center justify-center transition-all duration-200 shrink-0',
                  viewMode === 'friends' ? 'bg-pulse-brand rounded-2xl' : 'bg-pulse-bg-secondary'
                )}
              >
                <Users size={22} className="text-white" />
              </button>
              {pendingFriendCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-pulse-text-danger rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none pointer-events-none">
                  {pendingFriendCount > 9 ? '9+' : pendingFriendCount}
                </span>
              )}
            </div>
          </Tooltip>
        </div>

      </nav>

      {/* Right-click context menu */}
      <AnimatePresence>
        {ctxMenu && ctxServer && (
          <motion.div
            ref={ctxRef}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.1 }}
            style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 9999 }}
            className="w-52 bg-pulse-bg-elevated border border-white/10 rounded-xl shadow-elevation-high overflow-hidden py-1"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            {/* Server name header */}
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-xs font-bold text-pulse-text-muted uppercase tracking-wide truncate">
                {ctxServer.name}
              </p>
            </div>

            <button
              onClick={() => {
                setActive(ctxServer.id)
                setViewMode('server')
                setCtxMenu(null)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-pulse-text-muted hover:bg-white/5 hover:text-pulse-text-normal transition-colors text-left"
            >
              <MessageSquare size={14} /> Open Server
            </button>

            <button
              onClick={() => {
                setServerSettingsId(ctxServer.id)
                setCtxMenu(null)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-pulse-text-muted hover:bg-white/5 hover:text-pulse-text-normal transition-colors text-left"
            >
              <Settings size={14} /> Server Settings
            </button>

            <button
              onClick={() => {
                setServerSettingsId(ctxServer.id)
                setCtxMenu(null)
                // Signal the modal to open on the invite sheet
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('server-settings-invite', { detail: ctxServer.id }))
                }, 80)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-pulse-text-muted hover:bg-white/5 hover:text-pulse-text-normal transition-colors text-left"
            >
              <Link size={14} /> Invite People
            </button>

            <div className="my-1 border-t border-white/5" />

            {isOwner ? (
              <button
                onClick={() => {
                  setServerSettingsId(ctxServer.id)
                  setCtxMenu(null)
                  // Signal to open danger tab — store a flag
                  setTimeout(() => {
                    // The modal will open on 'overview'; user clicks Delete Server in sidebar
                    // For instant UX, we dispatch a custom event the modal can listen to
                    window.dispatchEvent(new CustomEvent('server-settings-danger', { detail: ctxServer.id }))
                  }, 80)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
              >
                <Trash2 size={14} /> Delete Server
              </button>
            ) : (
              <button
                onClick={() => setCtxMenu(null)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
              >
                <LogOut size={14} /> Leave Server
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add-server popup — rendered outside nav so overflow-y-auto doesn't clip it */}
      <AnimatePresence>
        {showAddMenu && (
          <motion.div
            initial={{ opacity: 0, x: -8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            onMouseDown={e => e.stopPropagation()}
            style={{ top: addMenuPos.y, left: addMenuPos.x }}
            className="fixed z-50 bg-pulse-bg-elevated border border-white/10 rounded-xl shadow-elevation-high overflow-hidden w-52"
          >
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-pulse-text-muted">
              Add a Server
            </p>
            <button
              onClick={() => { setShowAddMenu(false); openCreateCommunity() }}
              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-pulse-brand/20 flex items-center justify-center shrink-0">
                <Plus size={16} className="text-pulse-brand" />
              </div>
              <div>
                <p className="text-sm font-medium text-pulse-text-normal">Create a Community</p>
                <p className="text-[11px] text-pulse-text-muted">Build your own server</p>
              </div>
            </button>
            <button
              onClick={() => { setShowAddMenu(false); openJoinServer() }}
              className="flex items-center gap-3 w-full px-3 py-2.5 mb-1.5 hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-pulse-status-online/20 flex items-center justify-center shrink-0">
                <UserPlus size={16} className="text-pulse-status-online" />
              </div>
              <div>
                <p className="text-sm font-medium text-pulse-text-normal">Join with a Code</p>
                <p className="text-[11px] text-pulse-text-muted">Enter an invite link or code</p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
