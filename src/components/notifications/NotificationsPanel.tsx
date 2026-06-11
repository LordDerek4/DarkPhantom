import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, Check, UserPlus, MessageSquare, AtSign, Megaphone, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { useUser } from '@/hooks/useUserCache'
import {
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notification.service'
import { respondToFriendRequest, getFriendship } from '@/services/friends.service'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/utils/helpers'
import type { Notification } from '@/types'
import toast from 'react-hot-toast'

const TYPE_ICON: Record<string, React.ReactNode> = {
  friend_request: <UserPlus size={14} />,
  dm: <MessageSquare size={14} />,
  mention: <AtSign size={14} />,
  reply: <MessageSquare size={14} />,
  announcement: <Megaphone size={14} />,
  server_invite: <Bell size={14} />,
}

function NotificationRow({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const sender = useUser(n.fromUserId)
  const { setViewMode } = useAppStore()

  const handleClick = async () => {
    if (!n.isRead) {
      onRead(n.id)
      await markNotificationRead(n.id).catch(() => {})
    }
  }

  const time = n.createdAt
    ? formatDistanceToNow((n.createdAt as any).toDate?.() ?? new Date(), { addSuffix: true })
    : ''

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] cursor-pointer transition-colors relative',
        !n.isRead && 'bg-pulse-brand/5',
      )}
    >
      {/* Unread dot */}
      {!n.isRead && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-pulse-brand" />
      )}

      {/* Avatar or type icon */}
      <div className="relative shrink-0 mt-0.5">
        {sender ? (
          <Avatar src={sender.avatarUrl} name={sender.displayName} userId={sender.uid} size="sm" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-pulse-bg-modifier flex items-center justify-center text-pulse-text-muted">
            {TYPE_ICON[n.type] ?? <Bell size={14} />}
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-pulse-brand flex items-center justify-center text-white">
          {TYPE_ICON[n.type] ?? <Bell size={10} />}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', n.isRead ? 'text-pulse-text-muted' : 'text-pulse-text-normal')}>
          <strong className="font-semibold text-white">{n.title}</strong>
          {' — '}
          {n.body}
        </p>
        <p className="text-xs text-pulse-text-muted mt-0.5">{time}</p>

        {/* Inline accept/decline for friend requests */}
        {n.type === 'friend_request' && !n.isRead && n.fromUserId && (
          <FriendRequestActions
            fromUserId={n.fromUserId}
            notificationId={n.id}
            onDone={() => onRead(n.id)}
          />
        )}
      </div>
    </div>
  )
}

function FriendRequestActions({ fromUserId, notificationId, onDone }: {
  fromUserId: string
  notificationId: string
  onDone: () => void
}) {
  const { user } = useAuth()
  const [loading, setLoading] = React.useState(false)
  const [done, setDone] = React.useState(false)

  if (done) return null

  const handleRespond = async (accept: boolean) => {
    if (!user) return
    setLoading(true)
    try {
      const friendship = await getFriendship(user.uid, fromUserId)
      if (friendship) {
        await respondToFriendRequest(friendship.id, accept)
        toast.success(accept ? 'Friend request accepted!' : 'Friend request declined')
        await markNotificationRead(notificationId).catch(() => {})
        onDone()
        setDone(true)
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
      <button
        disabled={loading}
        onClick={() => handleRespond(true)}
        className="flex items-center gap-1 px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
      >
        <Check size={11} /> Accept
      </button>
      <button
        disabled={loading}
        onClick={() => handleRespond(false)}
        className="flex items-center gap-1 px-3 py-1 bg-white/5 hover:bg-white/10 text-pulse-text-muted text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
      >
        <X size={11} /> Decline
      </button>
    </div>
  )
}

export function NotificationsPanel() {
  const { user } = useAuth()
  const {
    notifications,
    isNotificationsPanelOpen,
    setNotifications,
    markNotificationReadLocal,
    markAllNotificationsReadLocal,
    closeNotificationsPanel,
  } = useAppStore()

  const panelRef = useRef<HTMLDivElement>(null)

  // Subscribe to live notifications
  useEffect(() => {
    if (!user?.uid) return
    return subscribeToNotifications(user.uid, setNotifications)
  }, [user?.uid])

  // Close on outside click
  useEffect(() => {
    if (!isNotificationsPanelOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeNotificationsPanel()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isNotificationsPanelOpen])

  const unread = notifications.filter(n => !n.isRead)

  const handleMarkAll = async () => {
    if (!user?.uid) return
    markAllNotificationsReadLocal()
    await markAllNotificationsRead(user.uid).catch(() => {})
  }

  return (
    <AnimatePresence>
      {isNotificationsPanelOpen && (
        <motion.div
          ref={panelRef}
          key="notif-panel"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="fixed top-14 right-4 z-50 w-96 max-h-[600px] bg-pulse-bg-floating border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-pulse-text-muted" />
              <span className="font-semibold text-pulse-text-normal text-sm">Notifications</span>
              {unread.length > 0 && (
                <span className="px-1.5 py-0.5 bg-pulse-brand rounded-full text-xs text-white font-bold leading-none">
                  {unread.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread.length > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs text-pulse-text-muted hover:text-pulse-text-normal px-2 py-1 rounded hover:bg-white/5 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={closeNotificationsPanel}
                className="p-1 rounded hover:bg-white/10 text-pulse-text-muted hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-white/[0.04]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <BellOff size={20} className="text-pulse-text-muted opacity-50" />
                </div>
                <p className="text-sm text-pulse-text-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onRead={markNotificationReadLocal}
                />
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function NotificationBellButton() {
  const { notifications, toggleNotificationsPanel, isNotificationsPanelOpen } = useAppStore()
  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="relative">
      <button
        onClick={toggleNotificationsPanel}
        className={cn(
          'p-1.5 rounded transition-colors relative',
          isNotificationsPanelOpen
            ? 'text-pulse-text-normal bg-white/10'
            : 'text-pulse-text-muted hover:text-pulse-text-normal',
        )}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-pulse-brand rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
